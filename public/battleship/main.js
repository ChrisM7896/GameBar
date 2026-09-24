let me = {}

socket.on('you', (you) => me = you)

socket.onAny((e) => console.log(e))

function setCookie(name, value, days = 365) {
    const d = new Date()
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`
}

function getCookie(name) {
    if (!document.cookie) return null
    const cookies = document.cookie.split('; ')
    for (const c of cookies) {
        const [k, ...v] = c.split('=')
        if (decodeURIComponent(k) === name) return decodeURIComponent(v.join('='))
    }
    return null
}

socket.on('id', (id) => setCookie('id', id, 365))

socket.on('get id', () => socket.emit('id', getCookie('id')))

const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")

canvas.width = window.innerWidth
canvas.height = window.innerHeight * .75

// Layout paddings
const SIDE_PADDING = 50
const TOP_PADDING = 20
const BOTTOM_PADDING = 20
const GAP = 100

// cell size computed from available vertical space (2 grids of 10 rows + gap + paddings)
let cellSize = (canvas.height - TOP_PADDING - BOTTOM_PADDING - GAP) / 20
let gridWidth = cellSize * 10
let gridZeroX = Math.max(SIDE_PADDING, (canvas.width - gridWidth) / 2)
let topGridY = TOP_PADDING
let topGridHeight = cellSize * 10
let bottomOffset = topGridY + topGridHeight + GAP

let buttons = []
const readyBtn = new Button(0, 0, 500, 100, 'Ready Up', () => socket.emit('ready'))
const destroyerBtn = new Button(0, 100, 100, 100, 'Destroyer', () => selectedShip = 2)
const submarineBtn = new Button(0, 200, 100, 100, 'Submarine', () => selectedShip = 3)
const cruiserBtn = new Button(0, 300, 100, 100, 'Cruiser', () => selectedShip = 3)
const battleshipBtn = new Button(0, 400, 100, 100, 'Battleship', () => selectedShip = 4)
const carrierBtn = new Button(0, 500, 100, 100, 'Carrier', () => selectedShip = 5)

buttons.push(readyBtn, destroyerBtn, submarineBtn, cruiserBtn, battleshipBtn, carrierBtn)
buttons.push(readyBtn)

document.addEventListener('keydown', (e) => {
    if (Number(e.key)) selectedShip = Number(e.key)

    else if (e.key == 'e') {
        shipOrientation++
        shipOrientation %= 4
    }

    else if (e.key == 'q') {
        shipOrientation--
        shipOrientation = Math.abs(shipOrientation % 4)
    }
})

function drawGrid() {
    ctx.strokeStyle = '#000000ff'
    ctx.lineWidth = 2
    // vertical lines for both grids
    for (let i = 0; i <= 10; i++) {
        const x = gridZeroX + (i * cellSize)
        // top grid vertical
        ctx.beginPath()
        ctx.moveTo(x, topGridY)
        ctx.lineTo(x, topGridY + topGridHeight)
        ctx.stroke()
        // bottom grid vertical
        ctx.beginPath()
        ctx.moveTo(x, bottomOffset)
        ctx.lineTo(x, bottomOffset + topGridHeight)
        ctx.stroke()
    }

    // horizontal lines: top grid
    for (let j = 0; j <= 10; j++) {
        const y = topGridY + j * cellSize
        ctx.beginPath()
        ctx.moveTo(gridZeroX, y)
        ctx.lineTo(gridZeroX + gridWidth, y)
        ctx.stroke()
    }
    // horizontal lines: bottom grid
    for (let j = 0; j <= 10; j++) {
        const y = bottomOffset + j * cellSize
        ctx.beginPath()
        ctx.moveTo(gridZeroX, y)
        ctx.lineTo(gridZeroX + gridWidth, y)
        ctx.stroke()
    }
}

socket.on('gameState', (state) => {
    console.log(state)
    gameState = state
})

let gameState = {}

window.addEventListener('resize', (e) => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight * .75
    cellSize = (canvas.height - TOP_PADDING - BOTTOM_PADDING - GAP) / 20
    gridWidth = cellSize * 10
    gridZeroX = Math.max(SIDE_PADDING, (canvas.width - gridWidth) / 2)
    topGridHeight = cellSize * 10
    bottomOffset = topGridY + topGridHeight + GAP
})

let Mouse = { down: false }

document.addEventListener('mousemove', (e) => {
    Mouse.x = e.clientX - canvas.getBoundingClientRect().left
    Mouse.y = e.clientY - canvas.getBoundingClientRect().top
    Mouse.gridX = Math.floor((Mouse.x - gridZeroX) / cellSize)

    if (Mouse.y >= topGridY && Mouse.y < topGridY + topGridHeight) {
        // top grid: logical rows 0..9
        Mouse.gridY = Math.floor((Mouse.y - topGridY) / cellSize)
        Mouse.onGrid = !(Mouse.gridX < 0 || Mouse.gridX > 9 || Mouse.gridY < 0 || Mouse.gridY > 9)
    } else if (Mouse.y >= bottomOffset && Mouse.y < bottomOffset + topGridHeight) {
        // bottom grid: logical rows 10..19
        Mouse.gridY = 10 + Math.floor((Mouse.y - bottomOffset) / cellSize)
        Mouse.onGrid = !(Mouse.gridX < 0 || Mouse.gridX > 9 || Mouse.gridY < 10 || Mouse.gridY > 19)
    } else {
        Mouse.onGrid = false
        Mouse.gridY = -1
    }
})

let selectedShip = 2
let shipOrientation = 1

document.addEventListener('click', (e) => {

    if (gameState.turn == 'prep') socket.emit('dropBoat', Mouse.gridX, Mouse.gridY - 10, shipOrientation, selectedShip)
    else if (gameState.turn == me.side) socket.emit('attack', Mouse.gridX, Mouse.gridY)
})

document.addEventListener('mousedown', (e) => { Mouse.down = true; for (let button of buttons) button.checkClick() })
document.addEventListener('mouseup', (e) => Mouse.down = false)

document.addEventListener('contextmenu', (e) => e.preventDefault())

const sailboat = new Image()
sailboat.src = 'battleship/sailboat.png'

const ocean = new Image()
ocean.src = 'battleship/ocean.png'

const radar = new Image()
radar.src = 'battleship/radar.png'

function main() {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    /*
    ::::::::::: ::::    :::  ::::::::      :::     ::::    ::::  ::::::::::
        :+:     :+:+:   :+: :+:    :+:   :+: :+:   +:+:+: :+:+:+ :+:
        +:+     :+:+:+  +:+ +:+         +:+   +:+  +:+ +:+:+ +:+ +:+
        +#+     +#+ +:+ +#+ :#:        +#++:++#++: +#+  +:+  +#+ +#++:++#
        +#+     +#+  +#+#+# +#+   +#+# +#+     +#+ +#+       +#+ +#+
        #+#     #+#   #+#+# #+#    #+# #+#     #+# #+#       #+# #+#
    ########### ###    ####  ########  ###     ### ###       ### ##########
    */

    if (gameState && gameState.player1 && gameState.player2 && me && me.side) {
        ctx.drawImage(radar, gridZeroX, topGridY, cellSize * 10, cellSize * 10)
        ctx.drawImage(ocean, gridZeroX, bottomOffset, cellSize * 10, cellSize * 10)

        ctx.fillStyle = 'rgb(200, 200, 200)'
        if (Mouse.down && me.availableShips.includes(selectedShip)) {
            switch (shipOrientation) {

                case 1:
                    // vertical up
                    ctx.drawImage(sailboat, Mouse.x - cellSize / 2, Mouse.y - selectedShip * cellSize + cellSize / 2, cellSize, selectedShip * cellSize)
                    break

                case 2:
                    // horizontal right
                    ctx.drawImage(sailboat, Mouse.x - cellSize / 2, Mouse.y - cellSize / 2, selectedShip * cellSize, cellSize)
                    break

                case 3:
                    // vertical down
                    ctx.drawImage(sailboat, Mouse.x - cellSize / 2, Mouse.y - cellSize / 2, cellSize, selectedShip * cellSize)
                    break

                case 0:
                    // horizontal left
                    ctx.drawImage(sailboat, Mouse.x - selectedShip * cellSize + cellSize / 2, Mouse.y - cellSize / 2, selectedShip * cellSize, cellSize)
                    break
            }
        }

        drawGrid()

        for (let ship of gameState.ships) {
            if (ship.side == me.side) {
                ctx.drawImage(sailboat, gridZeroX + ship.x * cellSize, bottomOffset + ship.y * cellSize, ship.w * cellSize, ship.h * cellSize)
            } else {
                ctx.drawImage(sailboat, gridZeroX + ship.x * cellSize, topGridY + ship.y * cellSize, ship.w * cellSize, ship.h * cellSize)
            }
        }

        // draw hits and misses as centered circles with darker inner circles
        const offset1 = (gameState.player1.side === me.side) ? topGridY : bottomOffset
        const offset2 = (gameState.player2.side === me.side) ? topGridY : bottomOffset
        const outerHit = '#ff4d4d'
        const innerHit = '#b30000'
        const outerMiss = '#4d79ff'
        const innerMiss = '#0026b3'
        const outerR = cellSize / 3.855
        const innerR = cellSize / 7.71

        // hits
        for (let hit of gameState.player1.hits) {
            const cx = gridZeroX + hit.x * cellSize + cellSize / 2
            const cy = offset1 + hit.y * cellSize + cellSize / 2
            ctx.beginPath()
            ctx.fillStyle = outerHit
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
            ctx.fill()
            ctx.beginPath()
            ctx.fillStyle = innerHit
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
            ctx.fill()
        }
        for (let hit of gameState.player2.hits) {
            const cx = gridZeroX + hit.x * cellSize + cellSize / 2
            const cy = offset2 + hit.y * cellSize + cellSize / 2
            ctx.beginPath()
            ctx.fillStyle = outerHit
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
            ctx.fill()
            ctx.beginPath()
            ctx.fillStyle = innerHit
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
            ctx.fill()
        }

        // misses
        for (let miss of gameState.player1.misses) {
            const cx = gridZeroX + miss.x * cellSize + cellSize / 2
            const cy = offset1 + miss.y * cellSize + cellSize / 2
            ctx.beginPath()
            ctx.fillStyle = outerMiss
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
            ctx.fill()
            ctx.beginPath()
            ctx.fillStyle = innerMiss
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
            ctx.fill()
        }
        for (let miss of gameState.player2.misses) {
            const cx = gridZeroX + miss.x * cellSize + cellSize / 2
            const cy = offset2 + miss.y * cellSize + cellSize / 2
            ctx.beginPath()
            ctx.fillStyle = outerMiss
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
            ctx.fill()
            ctx.beginPath()
            ctx.fillStyle = innerMiss
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
            ctx.fill()
        }

        if (gameState.turn == 'prep') readyBtn.text = me.ready ? 'Ready ✔️' : 'Ready Up'
        else readyBtn.text = me.side == gameState.turn ? 'Your Turn.' : 'Opponent\'s Turn.'

        if (gameState.winner) readyBtn.text = `Player ${gameState.winner.side} won!`

        for (let button of buttons) button.draw()
    } else {
        ctx.fillStyle = 'black'
        ctx.font = 'bold 50px sans-serif'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText('Waiting for an opponent...', canvas.width / 2, canvas.height / 2)
    }

    requestAnimationFrame(main)
}

requestAnimationFrame(main)
