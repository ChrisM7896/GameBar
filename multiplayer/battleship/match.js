import { battleshipMatches } from "../../app.js"
import Ship from './ship.js'

export default class BattleshipMatch {
    constructor(combo) {
        this.players = []
        this.combo = combo // How many hits a player can get before it is the next player's turn
        this.ships = []
        this.turn = 'prep' // Will be either prep, 1, or 2

        this.winner = null

        battleshipMatches.push(this)
    }

    join(player) {
        if (this.players.length >= 2 || player.match || !player.socket || this.turn != 'prep') return
        if (!this.player1) this.player1 = player
        else if (!this.player2) this.player2 = player
        player.match = this
        this.players.push(player)
        player.side = this.players.length
        this.sendGameState()
        console.log('Player joined', this.players.length)
    }

    leave(player) {
        if (!this.players.includes(player)) return
        player.reset()
        this.players.splice(this.players.indexOf(player), 1)
    }

    start() {
        if (this.players.length < 2 || this.players.some(p => !p.ready)) return

        this.turn = 1

        this.player1 = this.players.find(player => player.side == 1)
        this.player2 = this.players.find(player => player.side == 2)

        this.sendGameState()
        this.player1.socket.emit('yourTurn')
    }

    attack(player, x, y) {
        if (this.winner) return

        if (player.misses.some(h => h.x == x & h.y == y)) return

        if (player.side != this.turn || this.players.length < 2 || this.turn == 'prep') return

        let ship = this.ships.filter(ship => ship.side !== player.side)
            .find(ship => x >= ship.x && x < ship.x + ship.w && y >= ship.y && y < ship.y + ship.h)

        if (x < 0 || y < 0 || x > 9 || y > 9) return

        if (ship) {
            if (ship.sunk || ship.hits.some(h => h.x == x & h.y == y)) return
            ship.hit(player, x, y)
        } else {
            player.socket.emit('miss')
            player.misses.push({ x: x, y: y })
        }

        if (this.ships.filter(s => s.side != player.side).every(ship => ship.sunk)) {
            this.emitAllPlayers('win', player.serialize())
            this.winner = player.serialize()
            battleshipMatches.splice(battleshipMatches.indexOf(this), 1)

        } else {
            player.currentCombo++
            if (player.currentCombo == this.combo || !ship) {
                this.turn = this.turn == 1 ? 2 : 1 // Next player's turn
                player.currentCombo = 0
            }

            if (this.turn == 1) this.player1.socket.emit('yourTurn')
            if (this.turn == 2) this.player2.socket.emit('yourTurn')
        }

        this.sendGameState()
    }

    placeShip(side, x, y, orientation, type) {

        let ship
        switch (orientation) {
            case 1:
                ship = new Ship(x, y - type + 1, 1, type, side)
                break
            case 2:
                ship = new Ship(x, y, type, 1, side)
                break
            case 3:
                ship = new Ship(x, y, 1, type, side)
                break
            case 0:
                ship = new Ship(x - type + 1, y, type, 1, side)
                break
            default:
                return false
        }

        if (this.ships.some(existingShip => ship.overlaps(existingShip))) {
            return false
        }

        if (!ship.isOnGrid()) {
            return false
        }

        this.ships.push(ship)
        this.sendGameState()
        return true

    }

    emitAllPlayers(message, ...args) {
        for (let player of this.players) {
            player.socket.emit(message, ...args)
        }
    }

    sendGameState() {
        if (!this.player1 || !this.player2) return
        for (let player of this.players) {
            player.socket.emit('you', player.serialize())
            player.socket.emit('gameState', {
                turn: this.turn,
                ships: this.ships.filter(s => s.sunk || s.side == player.side),
                player1: this.player1.serialize(),
                player2: this.player2.serialize(),
                winner: this.winner
            })
        }

    }
}