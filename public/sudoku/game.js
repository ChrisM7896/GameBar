class Game {
    constructor(rank) {
        this.rank = rank
        this.size = rank * rank
        this.solution = this.generate()
        this.unsolved = this.solution.map(r => [...r])
    }

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }

        return arr
    }

    generate() {
        const { rank, size } = this

        // Base valid Sudoku pattern
        const grid = Array.from({ length: size }, (_, y) =>
            Array.from({ length: size }, (_, x) =>
                (rank * (y % rank) + Math.floor(y / rank) + x) % size + 1
            )
        )

        // Randomize the symbols
        const numbers = this.shuffle(
            Array.from({ length: size }, (_, i) => i + 1)
        )

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                grid[y][x] = numbers[grid[y][x] - 1]
            }
        }

        // Shuffle rows within each band
        for (let band = 0; band < rank; band++) {
            const rows = Array.from(
                { length: rank },
                (_, i) => band * rank + i
            )

            this.shuffle(rows)

            const copy = rows.map(y => grid[y])

            for (let i = 0; i < rank; i++) {
                grid[band * rank + i] = copy[i]
            }
        }

        // Shuffle columns within each stack
        for (let stack = 0; stack < rank; stack++) {
            const cols = Array.from(
                { length: rank },
                (_, i) => stack * rank + i
            )

            this.shuffle(cols)

            for (let y = 0; y < size; y++) {
                const copy = cols.map(x => grid[y][x])

                for (let i = 0; i < rank; i++) {
                    grid[y][stack * rank + i] = copy[i]
                }
            }
        }

        return grid
    }

    countSolutions(limit = 2) {
        const size = this.size
        const rank = this.rank

        const rows = Array(size).fill(0n)
        const cols = Array(size).fill(0n)
        const blocks = Array(size).fill(0n)

        // Build masks from current puzzle
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const n = this.unsolved[y][x]

                if (n === 0) continue

                const bit = 1n << BigInt(n - 1)
                const block =
                    Math.floor(y / rank) * rank +
                    Math.floor(x / rank)

                rows[y] |= bit
                cols[x] |= bit
                blocks[block] |= bit
            }
        }

        let solutions = 0

        const solve = () => {
            if (solutions >= limit) return

            let bestX = -1
            let bestY = -1
            let bestCandidates = 0n
            let bestCount = Infinity

            // Find the empty cell with the fewest candidates.
            // This is a HUGE improvement over simply taking
            // the first empty cell.
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (this.unsolved[y][x] !== 0) continue

                    const block =
                        Math.floor(y / rank) * rank +
                        Math.floor(x / rank)

                    const used =
                        rows[y] |
                        cols[x] |
                        blocks[block]

                    const all = (1n << BigInt(size)) - 1n
                    const candidates = all & ~used

                    const count = this.popcount(candidates)

                    if (count < bestCount) {
                        bestCount = count
                        bestX = x
                        bestY = y
                        bestCandidates = candidates

                        if (count === 1) break
                    }
                }

                if (bestCount === 1) break
            }

            // No empty cells => found a solution
            if (bestX === -1) {
                solutions++
                return
            }

            // No candidates => dead end
            if (bestCount === 0) return

            const block =
                Math.floor(bestY / rank) * rank +
                Math.floor(bestX / rank)

            let candidates = bestCandidates

            while (candidates !== 0n && solutions < limit) {
                // Get lowest set bit
                const bit = candidates & -candidates

                candidates ^= bit

                const number =
                    Number(this.trailingZeros(bit)) + 1

                this.unsolved[bestY][bestX] = number

                rows[bestY] |= bit
                cols[bestX] |= bit
                blocks[block] |= bit

                solve()

                rows[bestY] ^= bit
                cols[bestX] ^= bit
                blocks[block] ^= bit

                this.unsolved[bestY][bestX] = 0
            }
        }

        solve()

        return solutions
    }


    // Count bits in a BigInt
    popcount(n) {
        let count = 0

        while (n !== 0n) {
            n &= n - 1n
            count++
        }

        return count
    }


    // Position of lowest set bit
    trailingZeros(n) {
        let count = 0

        while ((n & 1n) === 0n) {
            n >>= 1n
            count++
        }

        return count
    }


    // Remove random cells while preserving a unique solution
    removeNumbers(targetClues = Math.floor(this.size * this.size * 0.4)) {
        const totalCells = this.size * this.size

        if (targetClues < 1 || targetClues > totalCells) {
            throw new Error("Invalid targetClues")
        }

        const positions = Array.from(
            { length: totalCells },
            (_, i) => i
        )

        this.shuffle(positions)

        let clues = totalCells

        for (const position of positions) {
            if (clues <= targetClues) break

            const y = Math.floor(position / this.size)
            const x = position % this.size

            const oldValue = this.unsolved[y][x]

            // Temporarily remove it
            this.unsolved[y][x] = 0

            // Does the puzzle still have exactly one solution?
            const solutions = this.countSolutions(2)

            if (solutions === 1) {
                // Keep it removed
                clues--
            } else {
                // Restore it
                this.unsolved[y][x] = oldValue
            }
        }

        return this.unsolved
    }
}
