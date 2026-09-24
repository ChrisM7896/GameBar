class Button {
    constructor(x, y, w, h, text, func) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.text = text
        this.func = func
    }

    draw() {
        ctx.strokeStyle = 'black'
        ctx.fillStyle = 'black'
        ctx.strokeRect(this.x, this.y, this.w, this.h)
        ctx.font = '20px Arial'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 2)
    }

    checkClick() {
        if (Mouse.x >= this.x && Mouse.x <= this.x + this.w &&
            Mouse.y >= this.y && Mouse.y <= this.y + this.h) {
            this.func()
        }
    }
}