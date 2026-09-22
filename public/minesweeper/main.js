import Level from "./level.js";
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
export const cellSize = 30;
const level = new Level(25, 25, 20.83); //! Level
window.addEventListener('resize', (e) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
const Mouse = { x: 0, y: 0, gx: 0, gy: 0, leftDown: false, rightDown: false };
export let flags = [];
export let chunks = [];
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('mousemove', (e) => {
    Mouse.x = e.clientX - canvas.getBoundingClientRect().left;
    Mouse.y = e.clientY - canvas.getBoundingClientRect().top;
    Mouse.gx = Math.floor((Mouse.x - offsetX) / cellSize);
    Mouse.gy = Math.floor((Mouse.y - offsetY) / cellSize);
});
document.addEventListener('mousedown', (e) => {
    if (level.lost || level.won)
        return;
    if (Mouse.gx < 0 || Mouse.gx >= level.width || Mouse.gy < 0 || Mouse.gy >= level.height)
        return;
    if (e.button == 0)
        Mouse.leftDown = true;
    if (e.button == 2)
        Mouse.rightDown = true;
    if (Mouse.leftDown && Mouse.rightDown && level.generated) {
        return level.breakAround(Mouse.gx, Mouse.gy);
    }
    if (level.generated) {
        if (e.button === 0 && !flags.some(f => f.x == Mouse.gx && f.y == Mouse.gy) && ['M', 0].includes(level.level[Mouse.gy][Mouse.gx]))
            level.break(Mouse.gx, Mouse.gy);
        else if (e.button === 2 && level.generated) {
            let f = flags.find(f => f.x === Mouse.gx && f.y === Mouse.gy);
            if (f) {
                flags.splice(flags.indexOf(f), 1);
            }
            else {
                if ([0, 'M'].includes(level.level[Mouse.gy][Mouse.gx]) && level.mines - flags.length > 0)
                    flags.push({ x: Mouse.gx, y: Mouse.gy });
            }
        }
    }
    else {
        if (e.button === 0) {
            level.generateLevel(Mouse.gx, Mouse.gy);
            setInterval(() => {
                if (!level.won && !level.lost)
                    time++;
            }, 1000);
        }
    }
});
document.addEventListener('mouseup', (e) => {
    if (e.button == 0)
        Mouse.leftDown = false;
    if (e.button == 2)
        Mouse.rightDown = false;
});
// CHRIS!!!!!!! FOR YOU
export const lightGrassColor = '#4d664d';
export const darkGrassColor = '#364936';
const backgroundColor = '#0f0f0f';
const lightDirtColor = '#94835e';
const darkDirtColor = '#5f5342';
const mineColor = '#4e1515';
const squareHighlight = '#ffffff3d';
const edgeHighlightColor = '#1d381d';
const difficultyColors = ['#67b6b5', '#54af6e', '#b45957', '#a34495', '#e2a661', '#a1ffd8', '#000000', '#9eaaa7'];
const strokeGrid = false;
let offsetX = 0;
let offsetY = 0;
let time = 0;
const shakeMultiplier = 0.1;
let tick = 0;
function shakeScreen() {
    switch (tick % 4) {
        case 0:
            offsetX -= level.brokenTiles * shakeMultiplier;
            break;
        case 1:
            offsetY -= level.brokenTiles * shakeMultiplier;
            break;
        case 2:
            offsetX += level.brokenTiles * shakeMultiplier;
            break;
        case 3:
            offsetY += level.brokenTiles * shakeMultiplier;
            break;
    }
    if (level.brokenTiles > 0)
        level.brokenTiles = Math.floor(level.brokenTiles * 0.9);
}
function main() {
    offsetX = (canvas.width / 2) - cellSize * (level.width / 2);
    offsetY = (canvas.height / 2) - cellSize * (level.height / 2);
    if (tick % 1 == 0)
        shakeScreen();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            if (level.generated) {
                if (level.level[y][x] === 'M')
                    ctx.fillStyle = level.lost ? mineColor : (x + y) % 2 == 0 ? lightGrassColor : darkGrassColor;
                else if (level.level[y][x] === 0)
                    ctx.fillStyle = (x + y) % 2 == 0 ? lightGrassColor : darkGrassColor;
                else
                    ctx.fillStyle = (x + y) % 2 == 0 ? lightDirtColor : darkDirtColor;
                ctx.strokeStyle = 'black';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.font = `bold ${cellSize * 0.7}px sans-serif`;
                ctx.lineWidth = 1;
                if (strokeGrid)
                    ctx.strokeRect(x * cellSize + offsetX, y * cellSize + offsetY, cellSize, cellSize);
                ctx.fillRect(x * cellSize + offsetX, y * cellSize + offsetY, cellSize + 1, cellSize + 1);
                ctx.fillStyle = difficultyColors[level.level[y][x] - 1] || difficultyColors[0];
                if (!(level.level[y][x] === 'M' || level.level[y][x] === 0 || level.level[y][x] == 'S'))
                    ctx.fillText(level.level[y][x], x * cellSize + cellSize / 2 + offsetX, y * cellSize + cellSize / 2 + offsetY);
                if (flags.some(f => f.x === x && f.y === y))
                    ctx.fillText('🚩', x * cellSize + cellSize / 2 + offsetX, y * cellSize + cellSize / 2 + offsetY);
            }
            else {
                ctx.fillStyle = (x + y) % 2 == 0 ? lightGrassColor : darkGrassColor;
                if (strokeGrid)
                    ctx.strokeRect(x * cellSize + offsetX, y * cellSize + offsetY, cellSize, cellSize);
                ctx.fillRect(x * cellSize + offsetX, y * cellSize + offsetY, cellSize + 1, cellSize + 1);
            }
            if (Mouse.gy >= 0 && Mouse.gy < level.height && Mouse.gx >= 0 && Mouse.gx < level.width && Mouse.leftDown && Mouse.rightDown && [0, 'M'].includes(level.level[y][x]) && level.level[Mouse.gy][Mouse.gx] !== 'S' &&
                ((Mouse.gx == x && Mouse.gy == y - 1) || // N
                    (Mouse.gx == x + 1 && Mouse.gy == y) || // E
                    (Mouse.gx == x && Mouse.gy == y + 1) || // S
                    (Mouse.gx == x - 1 && Mouse.gy == y) || // W
                    (Mouse.gx == x + 1 && Mouse.gy == y - 1) || // NE
                    (Mouse.gx == x - 1 && Mouse.gy == y - 1) || // NW
                    (Mouse.gx == x + 1 && Mouse.gy == y + 1) || // SE
                    (Mouse.gx == x - 1 && Mouse.gy == y + 1) // SW
                )) {
                ctx.fillStyle = squareHighlight;
                ctx.fillRect(x * cellSize + offsetX, y * cellSize + offsetY, cellSize, cellSize);
            }
            else if (Mouse.gx == x && Mouse.gy == y && !level.won && !level.lost) {
                ctx.fillStyle = squareHighlight;
                ctx.fillRect(x * cellSize + offsetX, y * cellSize + offsetY, cellSize, cellSize);
            }
        }
    }
    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            if (!level.generated)
                break;
            ctx.lineWidth = 2;
            ctx.strokeStyle = edgeHighlightColor;
            if (!['M', 0].includes(level.level[y][x])) {
                ctx.beginPath();
                ctx.moveTo(x * cellSize + offsetX, y * cellSize + offsetY);
                if (y === 0 || ['M', 0].includes(level.level[y - 1][x]))
                    ctx.lineTo(x * cellSize + cellSize + offsetX, y * cellSize + offsetY);
                ctx.moveTo(x * cellSize + cellSize + offsetX, y * cellSize + offsetY);
                if (x === level.width - 1 || ['M', 0].includes(level.level[y][x + 1]))
                    ctx.lineTo(x * cellSize + cellSize + offsetX, y * cellSize + cellSize + offsetY);
                ctx.moveTo(x * cellSize + cellSize + offsetX, y * cellSize + cellSize + offsetY);
                if (y === level.height - 1 || ['M', 0].includes(level.level[y + 1][x]))
                    ctx.lineTo(x * cellSize + offsetX, y * cellSize + cellSize + offsetY);
                ctx.moveTo(x * cellSize + offsetX, y * cellSize + cellSize + offsetY);
                if (x === 0 || ['M', 0].includes(level.level[y][x - 1]))
                    ctx.lineTo(x * cellSize + offsetX, y * cellSize + offsetY);
                ctx.stroke();
            }
        }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = edgeHighlightColor;
    ctx.strokeRect(offsetX, offsetY, cellSize * level.width, cellSize * level.height);
    if (level.generated) {
        ctx.textBaseline = 'top';
        ctx.font = 'bold 50px monospace';
        ctx.fillStyle = 'white';
        ctx.fillText(`🚩x${level.mines - flags.length}  ⏰${Math.floor(time / 60)}:${time % 60 < 10 ? `0${time % 60}` : time % 60}`, canvas.width / 2, 10);
        for (let chunk of chunks) {
            // Draw before update so weird position bug is fixed
            chunk.draw(ctx, offsetX, offsetY);
            chunk.update();
        }
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        if (level.lost) {
            ctx.fillStyle = 'red';
            ctx.fillText('You lose!', canvas.width / 2, canvas.height / 2);
        }
        else if (level.won) {
            ctx.fillStyle = 'green';
            ctx.fillText('You win!', canvas.width / 2, canvas.height / 2);
        }
    }
    tick++;
    requestAnimationFrame(main);
}
requestAnimationFrame(main);
//# sourceMappingURL=main.js.map