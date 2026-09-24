export default class Ship {
    constructor(x, y, w, h, side) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.side = side

        this.sunk = false

        this.hits = []
    }

    overlaps(other) {
        if (other.side != this.side) return
        return !(this.x + this.w <= other.x ||
            other.x + other.w <= this.x ||
            this.y + this.h <= other.y ||
            other.y + other.h <= this.y);
    }

    isOnGrid() {
        return this.x >= 0 && this.y >= 0 &&
            this.x + this.w <= 10 &&
            this.y + this.h <= 10;
    }

    hit(attacker, x, y) {
        if (this.hits.some(h => h.x == x & h.y == y)) return
        attacker.hits.push({ x: x, y: y })
        this.hits.push({ x: x, y: y })
        attacker.socket.emit('hit')

        if (this.hits.length == Math.max(this.w, this.h)) this.sunk = true
    }
}