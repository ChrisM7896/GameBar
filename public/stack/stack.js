//get canvas and context
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

//block class to represent each block in the game
class Block {
    //constructor for block
    constructor(x, y, width, height, color, speed = 0) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.color = color
        this.speed = speed
    }

    //draw block on canvas
    draw(ctx) {
        ctx.fillStyle = this.color
        ctx.fillRect(this.x, this.y, this.width, this.height)
    }

    //move block horizontally
    move(canvasWidth) {
        this.x += this.speed
        if (this.x + this.width > canvasWidth) {
            this.x = canvasWidth - this.width
            this.speed = -Math.min(Math.abs(this.speed) + 1, 12)
        } else if (this.x < 0) {
            this.x = 0
            this.speed = Math.min(Math.abs(this.speed) + 1, 12)
        }
    }

    //create the initial platform block
    static createPlatform(canvas) {
        return new Block(600, canvas.height - 50, 400, 50, '#2c3636', 0)
    }

    //create a new moving block above the last stacked block
    static createMoving(lastBlock, canvas, direction, mode) {
        let speed
        switch (mode) {
            case 'easy':
                speed = 2
                break
            case 'normal':
                speed = 4
                break
            case 'hard':
                speed = 6
                break
            default:
                speed = 0
        }

        const colors = ['#D6E8E3', '#A6DFCF', '#6DFFC2', '#5FD182', '#3FA85C', '#18A840', '#18A8A4', '#189995', '#13845F', '#0F4231']
        const color = colors[blocksList.length % colors.length] //iterate through colors based on the number of blocks stacked

        const block = new Block(0, lastBlock.y - 50, lastBlock.width, 50, color, speed)

        if (direction === 'right') {
            block.x = canvas.width - block.width
            block.speed = -Math.abs(block.speed)
        } else { 
            block.x = 0
            block.speed = Math.abs(block.speed)
        }

        return block
    }
}

//game variables
let points = 0
let perfectCounter = 0
let blocksList = []
let block
let blockDirection = getBlockDirection()
let currentMode = null
let isGameLoopRunning = false
let isGameOver = true

//event listener for space bar to drop block
document.addEventListener('keydown', function (event) {
    if (event.code === 'Space') {
        event.preventDefault()
        //drop block
        stackBlock()
    }
})

function chooseMode(selectedMode) {
    document.getElementById("modeSelection").style.display = "none"
    document.getElementById("modeDisplay").innerText = `Mode: ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}`

    currentMode = selectedMode
    isGameOver = false

    resetGame()
    createNewBlock(currentMode)

    if (!isGameLoopRunning) {
        isGameLoopRunning = true
        gameLoop()
    }
}

//get random direction for block to move
function getBlockDirection() {
    return parseInt(Math.random() * 2) ? 'left' : 'right'
}

function drawPlatform() {
    const platform = blocksList[0]
    if (platform) {
        platform.draw(ctx)
    }
}

//create a new block above the last stacked block
function createNewBlock(mode) {
    if (blocksList.length >= 10) {
        shiftBlocksDown()
    } 
    let lastBlock = blocksList[blocksList.length - 1]

    //safety fallback
    if (!lastBlock) {
        lastBlock = Block.createPlatform(canvas)
        blocksList.push(lastBlock)
    }

    blockDirection = getBlockDirection()
    block = Block.createMoving(lastBlock, canvas, blockDirection, mode)
}

//reset game to initial state
function resetGame() {
    points = 0
    perfectCounter = 0
    block = null

    document.getElementById("perfectCounter").style.display = "block"
    document.getElementById("modeDisplay").style.display = "block"
    const platform = Block.createPlatform(canvas)
    blocksList = [platform]
}

//draw block
function drawBlock() {
    if (block) {
        block.draw(ctx)
    }
}

//draw all stacked blocks
function drawAllBlocks() {
    for (let i = 0; i < blocksList.length; i++) {
        blocksList[i].draw(ctx)
    }
}

//move block
function moveBlock() {
    if (block) {
        block.move(canvas.width)
    }
}

function shiftBlocksDown() {
    for (let i = 0; i < blocksList.length; i++) {
        blocksList[i].y += 50
    }
}

function displayPoints() {
    document.getElementById("points").innerText = `Points: ${points}`
}

function displayPerfectCounter() {
    document.getElementById("perfectCounter").innerText = `Perfect Stacks: ${perfectCounter}`
}

function displayMessage(message) {
    const messageElement = document.getElementById("message")
    messageElement.innerText = message
    setTimeout(() => {
        messageElement.innerText = ""
    }, 2000)
}

function gameOver(finalPoints) {
    isGameOver = true
    block = null

    displayMessage(`Game Over! Final Score: ${finalPoints}`)
}

//handle stacking logic when space bar is pressed
function stackBlock() {
    if (isGameOver || !block || blocksList.length === 0 || !currentMode) {
        return
    }

    block.speed = 0
    const lastBlock = blocksList[blocksList.length - 1]
    const overlaps = block.x < lastBlock.x + lastBlock.width && block.x + block.width > lastBlock.x
    const perfectThreshold = 5
    const isPerfect =
        Math.abs(block.x - lastBlock.x) <= perfectThreshold &&
        Math.abs((block.x + block.width) - (lastBlock.x + lastBlock.width)) <= perfectThreshold

    if (!overlaps) {
        gameOver(points)
        return
    }

    if (isPerfect) {
        block.x = lastBlock.x
        block.width = lastBlock.width
        points += 2
        perfectCounter++
        displayMessage('Perfect! +2 points!')
    } else if (block.x < lastBlock.x) {
        block.width -= lastBlock.x - block.x
        block.x = lastBlock.x
        perfectCounter = 0
        displayMessage('Good! +1 point!')
    } else if (block.x + block.width > lastBlock.x + lastBlock.width) {
        block.width -= (block.x + block.width) - (lastBlock.x + lastBlock.width)
        perfectCounter = 0
        displayMessage('Good! +1 point!')
    }

    if (blocksList.length > 5) {
        const lastFiveBlocks = blocksList.slice(-5)
        let alignedForBonus = false

        //check if the last 5 blocks are aligned within a certain threshold
        if (perfectCounter >= 5 && lastFiveBlocks.every(b => Math.abs(b.x - lastBlock.x) <= perfectThreshold)) {
            alignedForBonus = true
        }

        if (alignedForBonus === true) {
            displayMessage('Bonus! +4 extra points!')
            points += 4
            perfectCounter = 0
            alignedForBonus = false
            return
        }
    }

    points++
    blocksList.push(block)

    createNewBlock(currentMode)
}

//game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawPlatform()
    drawAllBlocks()
    drawBlock()
    moveBlock()
    displayPoints()
    displayPerfectCounter()
    requestAnimationFrame(gameLoop)
}