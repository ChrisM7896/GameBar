import { cellSize } from "./main.js";
export default class AnimatedChunk {
    x;
    y;
    xVelocity = (Math.random() * 7) - 3.5;
    yVelocity = -(Math.random() * 5) + 2;
    color;
    lifetime = 0;
    invisibleTicks = 60;
    width = cellSize;
    angle = 0;
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
    }
    update() {
        this.lifetime++;
        this.x += this.xVelocity;
        this.y += this.yVelocity;
        this.xVelocity *= 0.999;
        this.yVelocity += 0.3;
        this.angle += this.xVelocity;
        this.width = Math.max(0, cellSize - (cellSize * (this.lifetime / this.invisibleTicks)));
    }
    draw(ctx, offsetX, offsetY) {
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.x + offsetX + this.width / 2, this.y + offsetY + this.width / 2);
        ctx.rotate(this.angle * Math.PI / 180);
        ctx.fillRect(-this.width / 2, -this.width / 2, this.width, this.width);
        ctx.restore();
    }
}
//# sourceMappingURL=animatedChunk.js.map