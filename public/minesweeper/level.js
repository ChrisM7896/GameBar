import AnimatedChunk from "./animatedChunk.js";
import { cellSize, chunks, darkGrassColor, flags, lightGrassColor } from "./main.js";
export default class Level {
    width;
    height;
    difficulty;
    level = [];
    lost = false;
    won = false;
    mines = 0;
    brokenTiles = 0;
    generated = false;
    constructor(width, height, difficulty) {
        this.width = width;
        this.height = height;
        this.difficulty = Math.min(difficulty, 99); // Percent(ish) of the board that will be mines
    }
    /*
    :::        :::::::::: :::     ::: :::::::::: :::
    :+:        :+:        :+:     :+: :+:        :+:
    +:+        +:+        +:+     +:+ +:+        +:+
    +#+        +#++:++#   +#+     +:+ +#++:++#   +#+
    +#+        +#+         +#+   +#+  +#+        +#+
    #+#        #+#          #+#+#+#   #+#        #+#
    ########## ##########     ###     ########## ##########
    */
    generateLevel(safeX, safeY) {
        if (!(safeX < this.width && safeX >= 0 && safeY < this.height && safeY >= 0))
            return; // Grid check
        for (let i = 0; i < this.height; i++) {
            this.level.push([]);
            for (let j = 0; j < this.width; j++) {
                this.level[i].push(0);
            }
        }
        let safeSpots = [
            { x: safeX, y: safeY },
            { x: safeX + 1, y: safeY },
            { x: safeX + 1, y: safeY + 1 },
            { x: safeX + 1, y: safeY - 1 },
            { x: safeX - 1, y: safeY + 1 },
            { x: safeX - 1, y: safeY - 1 },
            { x: safeX - 1, y: safeY },
            { x: safeX, y: safeY + 1 },
            { x: safeX, y: safeY - 1 },
        ];
        let targetMines = Math.ceil((this.difficulty / 100) * (this.width * this.height));
        targetMines = Math.min(targetMines, this.width * this.height - 9); // Cap target mines to area - 9 so that there won't be infinite loop
        this.mines = 0;
        while (this.mines < targetMines) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.level[y][x] === 'M')
                        continue;
                    if (safeSpots.some(spot => spot.x == x && spot.y == y))
                        continue;
                    let chance = (1 / (this.width * this.height - this.mines)) * 100;
                    let rand = Math.random() * 100;
                    if (rand <= chance) {
                        this.level[y][x] = 'M';
                        this.mines++;
                    }
                }
            }
        }
        this.break(safeX, safeY);
        this.generated = true;
    }
    /*
    ::::::::: ::::::::::: :::::::::        ::::::::  :::    ::: :::::::::: ::::::::  :::    ::: ::::::::
    :+:    :+:    :+:     :+:    :+:      :+:    :+: :+:    :+: :+:       :+:    :+: :+:   :+: :+:    :+:
    +:+    +:+    +:+     +:+    +:+      +:+        +:+    +:+ +:+       +:+        +:+  +:+  +:+
    +#+    +:+    +#+     +#++:++#:       +#+        +#++:++#++ +#++:++#  +#+        +#++:++   +#++:++#++
    +#+    +#+    +#+     +#+    +#+      +#+        +#+    +#+ +#+       +#+        +#+  +#+         +#+
    #+#    #+#    #+#     #+#    #+#      #+#    #+# #+#    #+# #+#       #+#    #+# #+#   #+# #+#    #+#
    ######### ########### ###    ###       ########  ###    ### ########## ########  ###    ### ########
    */
    above(x, y) {
        if (y - 1 < 0)
            return 0;
        let val = this.level[y - 1][x];
        if (val === 0 || val === 'M')
            return val;
    }
    below(x, y) {
        if (y + 1 >= this.height)
            return 0;
        let val = this.level[y + 1][x];
        if (val === 0 || val === 'M')
            return val;
    }
    left(x, y) {
        if (x - 1 < 0)
            return 0;
        let val = this.level[y][x - 1];
        if (val === 0 || val === 'M')
            return val;
    }
    right(x, y) {
        if (x + 1 >= this.width)
            return 0;
        let val = this.level[y][x + 1];
        if (val === 0 || val === 'M')
            return val;
    }
    /*
     ::::::::   ::::::::  :::::::::  ::::    ::: :::::::::: :::::::::   ::::::::
    :+:    :+: :+:    :+: :+:    :+: :+:+:   :+: :+:        :+:    :+: :+:    :+:
    +:+        +:+    +:+ +:+    +:+ :+:+:+  +:+ +:+        +:+    +:+ +:+
    +#+        +#+    +:+ +#++:++#:  +#+ +:+ +#+ +#++:++#   +#++:++#:  +#++:++#++
    +#+        +#+    +#+ +#+    +#+ +#+  +#+#+# +#+        +#+    +#+        +#+
    #+#    #+# #+#    #+# #+#    #+# #+#   #+#+# #+#        #+#    #+# #+#    #+#
     ########   ########  ###    ### ###    #### ########## ###    ###  ########
    */
    NW(x, y) {
        if (y - 1 < 0 || x - 1 < 0)
            return 0;
        let val = this.level[y - 1][x - 1];
        if (val === 0 || val === 'M')
            return val;
    }
    NE(x, y) {
        if (y - 1 < 0 || x + 1 >= this.width)
            return 0;
        let val = this.level[y - 1][x + 1];
        if (val === 0 || val === 'M')
            return val;
    }
    SW(x, y) {
        if (y + 1 >= this.height || x - 1 < 0)
            return 0;
        let val = this.level[y + 1][x - 1];
        if (val === 0 || val === 'M')
            return val;
    }
    SE(x, y) {
        if (y + 1 >= this.height || x + 1 >= this.width)
            return 0;
        let val = this.level[y + 1][x + 1];
        if (val === 0 || val === 'M')
            return val;
    }
    /*
    :::::::::  :::::::::  ::::::::::     :::     :::    :::
    :+:    :+: :+:    :+: :+:          :+: :+:   :+:   :+:
    +:+    +:+ +:+    +:+ +:+         +:+   +:+  +:+  +:+
    +#++:++#+  +#++:++#:  +#++:++#   +#++:++#++: +#++:++
    +#+    +#+ +#+    +#+ +#+        +#+     +#+ +#+  +#+
    #+#    #+# #+#    #+# #+#        #+#     #+# #+#   #+#
    #########  ###    ### ########## ###     ### ###    ###
    */
    countMines(x, y) {
        if (!(x < this.width && x >= 0 && y < this.height && y >= 0))
            return; // Grid check
        let mines = 0;
        if (this.above(x, y))
            mines++;
        if (this.below(x, y))
            mines++;
        if (this.right(x, y))
            mines++;
        if (this.left(x, y))
            mines++;
        if (this.NE(x, y))
            mines++;
        if (this.NW(x, y))
            mines++;
        if (this.SE(x, y))
            mines++;
        if (this.SW(x, y))
            mines++;
        return mines;
    }
    breakAround(x, y) {
        if (!(this.level[y][x] >= 1))
            return;
        let adjacentFlags = flags.filter(f => (f.x == x && f.y == y - 1) || // N
            (f.x == x + 1 && f.y == y) || // E
            (f.x == x && f.y == y + 1) || // S
            (f.x == x - 1 && f.y == y) || // W
            (f.x == x + 1 && f.y == y - 1) || // NE
            (f.x == x - 1 && f.y == y - 1) || // NW
            (f.x == x + 1 && f.y == y + 1) || // SE
            (f.x == x - 1 && f.y == y + 1) // SW
        );
        if (adjacentFlags.length == this.level[y][x]) {
            for (let iy = 0; iy < this.height; iy++) {
                for (let ix = 0; ix < this.width; ix++) {
                    if (adjacentFlags.some(f => f.x == ix && f.y == iy))
                        continue;
                    if ((ix == x && iy == y - 1) || // N
                        (ix == x + 1 && iy == y) || // E
                        (ix == x && iy == y + 1) || // S
                        (ix == x - 1 && iy == y) || // W
                        (ix == x + 1 && iy == y - 1) || // NE
                        (ix == x - 1 && iy == y - 1) || // NW
                        (ix == x + 1 && iy == y + 1) || // SE
                        (ix == x - 1 && iy == y + 1) // SW
                    )
                        this.break(ix, iy);
                }
            }
        }
    }
    breakAll() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.level[y][x] == 0)
                    this.break(x, y);
            }
        }
        this.lost = true;
    }
    break(x, y) {
        if (this.lost)
            return this.won = false;
        if (!(x < this.width && x >= 0 && y < this.height && y >= 0))
            return; // Grid check
        if (![0, 'M'].includes(this.level[y][x]))
            return;
        if (this.level[y][x] === 'M') {
            this.breakAll();
            return this.lost = true;
        }
        this.brokenTiles++;
        this.level[y][x] = this.countMines(x, y);
        chunks.push(new AnimatedChunk(x * cellSize, y * cellSize, (x + y) % 2 == 0 ? lightGrassColor : darkGrassColor));
        let foo = flags.find(f => f.x === x && f.y === y);
        if (foo)
            flags.splice(flags.indexOf(foo), 1);
        if (this.generated && this.level.every(r => r.every((s) => s !== 0)))
            return this.won = true;
        // Make sure there are no mines in proximity
        if (this.countMines(x, y))
            return;
        else
            this.level[y][x] = 'S';
        setTimeout(() => {
            if (this.above(x, y) === 0)
                this.break(x, y - 1);
            if (this.below(x, y) === 0)
                this.break(x, y + 1);
            if (this.left(x, y) === 0)
                this.break(x - 1, y);
            if (this.right(x, y) === 0)
                this.break(x + 1, y);
            if (this.NE(x, y) === 0)
                this.break(x + 1, y - 1);
            if (this.NW(x, y) === 0)
                this.break(x - 1, y - 1);
            if (this.SE(x, y) === 0)
                this.break(x + 1, y + 1);
            if (this.SW(x, y) === 0)
                this.break(x - 1, y + 1);
        }, Math.random() * 75);
    }
}
//# sourceMappingURL=level.js.map