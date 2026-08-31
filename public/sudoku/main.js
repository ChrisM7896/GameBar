const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const okDif = document.getElementById('okDif')

function resizeCanvas() {
    // Set internal drawing buffer size to fill window
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight - 125
}

window.addEventListener('resize', resizeCanvas)
resizeCanvas()

let mouse = {
    x: 0,
    y: 0,
    gridX: 0,
    gridY: 0,
    onGrid: false,
    selectedSquare: { x: null, y: null },
    hovering: ''
}

document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()

    mouse.x = e.clientX - rect.left
    mouse.y = e.clientY - rect.top

    const gridSize = rank * rank
    const gridPixelSize = gridSize * cellSize

    const gridLeft = canvas.width / 2 - gridPixelSize / 2
    const gridTop = 75

    if (
        mouse.x < gridLeft ||
        mouse.x >= gridLeft + gridPixelSize ||
        mouse.y < gridTop ||
        mouse.y >= gridTop + gridPixelSize
    ) {
        mouse.gridX = -1
        mouse.gridY = -1
        return mouse.onGrid = false
    }

    mouse.gridX = Math.floor((mouse.x - gridLeft) / cellSize)
    mouse.gridY = Math.floor((mouse.y - gridTop) / cellSize)
    mouse.onGrid = true
})

document.addEventListener('click', (e) => {
    placeMode = mouse.hovering || placeMode

    if (!mouse.onGrid) return
    if (!game.unsolved[mouse.gridY][mouse.gridX]) mouse.selectedSquare = { x: mouse.gridX, y: mouse.gridY }
})

document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    mouse.selectedSquare = { x: null, y: null }
})

document.addEventListener('keydown', (e) => {
    let x = mouse.selectedSquare.x
    let y = mouse.selectedSquare.y

    if (!Number.isFinite(mouse.selectedSquare.x)) return

    let num = Number(e.key)
    if (e.key == 'Backspace' || e.key == '0') {
        let foo = drafts.find(d => d.x == x && d.y == y)
        if (foo) foo.nums = []
        return currentGrid[y][x] = 0
    }

    if (!Number.isFinite(num)) return

    if (placeMode == 'nums') {
        if (currentGrid[y][x] === num) return
        let foo = drafts.find(d => d.x == x && d.y == y)
        if (foo) foo.nums = []
        currentGrid[y][x] = num
        if (game.solution[y][x] !== num) hearts--
    } else {
        let foo = drafts.find(d => d.x == x && d.y == y)
        if (foo && !foo.nums.includes(num)) foo.nums.push(num)
        else if (!foo) drafts.push({ x: x, y: y, nums: [num] })
    }
})

let cellSize = 0
let buttons = { x: 0, y: 0, w: 0, h: 0 }
let placeMode = 'nums'

// Setup
let hearts = 3
let rank = 3
let difficulty = 5
let game = new Game(rank)
game.unsolved = game.removeNumbers(rank * rank * rank * rank - rank * rank * Math.min(Math.max(difficulty, 1), rank * rank - 1))

let currentGrid = game.unsolved.map(r => [...r])
let drafts = [] // x, y, nums[]

function newGame() {
    game = new Game(rank)
    game.unsolved = game.removeNumbers(rank * rank * rank * rank - rank * rank * Math.min(Math.max(difficulty, 1), rank * rank - 1))
    drafts = []
    currentGrid = game.unsolved.map(r => [...r])
}

function main() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    cellSize = (Math.min(canvas.height - 75, canvas.width) / (rank * rank)) - 1

    if (currentGrid.every((r, ri) => r.every((n, ni) => n == game.solution[ri][ni]))) {
        ctx.font = `${cellSize}px Arial`
        ctx.fillStyle = '#4d664d'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText(Math.floor(Math.random() * 100) == 1 ? 'Good boy!' : 'You Win!', canvas.width / 2, canvas.height / 2)
        return
    }

    // Update
    if (mouse.x >= buttons.x && mouse.x <= buttons.x + buttons.w &&
        mouse.y >= buttons.y && mouse.y <= buttons.y + buttons.h)
        if (mouse.x < buttons.x + buttons.w / 2) mouse.hovering = 'draft'
        else mouse.hovering = 'nums'
    else mouse.hovering = ''

    // Draw hearts
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = `${cellSize / 1.75}px Arial`
    ctx.fillText(`${'❤️'.repeat(Math.max(hearts, 0))}${'💔'.repeat(Math.max(0, 3 - hearts))}`, canvas.width / 2 - cellSize * (rank * rank) / 2, 37.5)
    ctx.textAlign = 'right'
    ctx.fillText('📝 🔢', canvas.width / 2 + cellSize * (rank * rank) / 2, 37.5)
    let metrics = ctx.measureText('📝 🔢')
    buttons.w = metrics.width
    buttons.h = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    buttons.x = canvas.width / 2 + cellSize * (rank * rank) / 2 - buttons.w
    buttons.y = 37.5 - buttons.h / 2
    ctx.font = `${cellSize / 2}px Arial`
    ctx.textAlign = 'center'

    if (hearts === 0) {
        ctx.font = `${cellSize}px Arial`
        ctx.fillStyle = '#4d664d'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText('You Lose, Dummy.', canvas.width / 2, canvas.height / 2)
        return
    }


    // Draw place-mode text
    ctx.align = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#4d664d'
    ctx.font = `${cellSize / 1.75}px Arial`
    ctx.fillText(placeMode == 'nums' ? 'Number Mode' : 'Draft Mode', canvas.width / 2, 37.5)

    // Draw mouseover square
    ctx.fillStyle = '#151b1b'
    if (Number.isFinite(mouse.selectedSquare.x)) ctx.fillRect(canvas.width / 2 - cellSize * (rank * rank) / 2 + cellSize * mouse.selectedSquare.x, 75 + cellSize * mouse.selectedSquare.y, cellSize, cellSize)
    else if (mouse.onGrid && !Number.isFinite(mouse.selectedSquare.x)) ctx.fillRect(canvas.width / 2 - cellSize * (rank * rank) / 2 + cellSize * mouse.gridX, 75 + cellSize * mouse.gridY, cellSize, cellSize)
    ctx.fillStyle = 'black'

    // Draw grid
    for (let i = 0; i < rank * rank; i++) {
        for (let j = 0; j < rank * rank; j++) {
            ctx.fillStyle = '#4d664d'
            if (currentGrid[j][i] && game.solution[j][i] != currentGrid[j][i]) {
                ctx.fillStyle = '#b62424'
                ctx.fillRect(canvas.width / 2 - (cellSize * (rank * rank) / 2) + i * cellSize, 75 + j * cellSize, cellSize, cellSize)
                ctx.fillStyle = 'black'
            }
            ctx.fillText(`${currentGrid[j][i] || ''}`, canvas.width / 2 - (cellSize * (rank * rank) / 2) + i * cellSize + cellSize / 2, 75 + j * cellSize + cellSize / 2)
        }

        
        ctx.lineWidth = i % rank == 0 ? 6 : 3
        ctx.beginPath()
        ctx.moveTo(canvas.width / 2 - cellSize * (rank * rank) / 2, 75 + i * cellSize)
        ctx.lineTo(canvas.width / 2 + cellSize * (rank * rank) / 2, 75 + i * cellSize)

        ctx.moveTo(canvas.width / 2 - (cellSize * (rank * rank) / 2) + i * cellSize, 75)
        ctx.lineTo(canvas.width / 2 - (cellSize * (rank * rank) / 2) + i * cellSize, 75 + rank * rank * cellSize)
        ctx.strokeStyle = '#4d664d'
        ctx.stroke()


    }

    // Draw draft numbers
    for (let draft of drafts) {
        for (let num of draft.nums) {

            const col = (num - 1) % rank
            const row = Math.floor((num - 1) / rank)

            const cellX =
                (draft.x * cellSize) +
                (canvas.width / 2 - cellSize * (rank * rank) / 2)

            const cellY =
                (draft.y * cellSize) +
                75

            const miniCellSize = cellSize / rank

            const x =
                cellX +
                col * miniCellSize +
                miniCellSize / 2

            const y =
                cellY +
                row * miniCellSize +
                miniCellSize / 2

            ctx.fillStyle = '#4d664d'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.font = `${miniCellSize * 0.65}px Arial`

            ctx.fillText(num, x, y)
        }
    }

    ctx.lineWidth = 6

    ctx.strokeRect(canvas.width / 2 - cellSize * (rank * rank) / 2, 75, rank * rank * cellSize, rank * rank * cellSize)



    requestAnimationFrame(main)
}

requestAnimationFrame(main)