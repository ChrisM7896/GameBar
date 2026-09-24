import { battleshipMatches } from "../../app.js"
import BattleshipMatch from "./match.js"

export default class Player {
    constructor(socket, id, username) {
        this.socket = socket
        this.id = id
        this.username = username
        this.hits = []
        this.misses = []
        this.ready = false
        this.currentCombo = 0
        this.availableShips = [5, 4, 3, 3, 2]
        this.setupListeners()
    }

    joinMatch(combo = 1) {
        let foo = battleshipMatches.find(match => match.players.length < 2 && match.combo == combo)

        if (foo) foo.join(this)

        else {
            let m = new BattleshipMatch(combo)
            m.join(this)
        }
    }

    setSocket(socket) {
        if (this.socket) this.socket.removeAllListeners()
        this.socket = socket
        this.setupListeners()
    }

    setupListeners() {
        this.socket.on('join', (combo = 1) => this.joinMatch(combo))

        this.socket.on('attack', (x, y) => {
            if (this.match) this.match.attack(this, x, y)
        })

        this.socket.on('dropBoat', (x, y, orientation, type) => {
            if (!this.match) return
            if (this.match.turn == 'prep' && this.availableShips.includes(type)) {
                if (this.match.placeShip(this.side, x, y, orientation, type))
                    this.availableShips.splice(this.availableShips.indexOf(type), 1)
            }
            this.socket.emit('you', this.serialize())
        })

        this.socket.on('ready', () => {
            if (!this.match) return
            this.ready = !this.ready
            if (this.match.turn == 'prep') this.ready = true
            if (this.availableShips.length) this.ready = false

            this.socket.emit('you', this.serialize())

            if (this.ready) this.match.start()
        })
    }

    serialize() {
        return {
            id: this.id,
            ready: this.ready,
            username: this.username,
            side: this.side,
            hits: this.hits,
            misses: this.misses,
            availableShips: this.availableShips
        }
    }

    reset() {
        this.match = null
        this.side = null
        this.ready = false
        this.currentCombo = 0
        this.hits = []
        this.misses = []
        this.availableShips = [5, 4, 3, 3, 2]
    }
}