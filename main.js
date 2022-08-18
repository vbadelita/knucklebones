//Array helpers
class Arr {
    static init(n, f) {
        let arr = new Array(n);
        for (let i = 0; i < n; i += 1) {
            arr[i] = f(i);
        }
        return arr;
    }

    static for_all(arr, f) {
        return arr.findIndex(x => !f(x)) == -1;
    }

    static exists(arr, f) {
        return arr.findIndex(f) != -1;
    }
}

class Rand {
    static int(n) {
        return Math.floor(Math.random() * n);
    }
}
  

class Column {
    constructor() {
        this.cells = Arr.init(3, _ => -1);
    }

    is_full() {
        return Arr.for_all(this.cells, cell => cell != -1);
    }

    add_die(die) {
        let first_empty = this.cells.findIndex(cell => cell == -1);
        this.cells[first_empty] = die;
    }

    die_counts() {
        const non_empty = this.cells.filter(cell => cell != -1);
        let counts = {};
        let max_count = 0;
        non_empty.forEach(x => {
            if (counts[x]) {
                counts[x] += 1;
            } else {
                counts[x] = 1;
            }
            max_count = Math.max(max_count, counts[x]);
        });
        counts.max_count = max_count;
        return counts;
    }

    score() {
        const sum = non_empty.reduce((a, b) => a + b, 0);
        const counts = this.die_counts();
        if (counts.max_count == 3) return 3 * sum;
        else if (counts.max_count == 2) return 2 * sum;
        else return sum;
    }

    negate(die) {
        let result = this.cells.filter(cell => cell != die);
        while (result.length < 3) {
            result.push(-1);
        }
        this.cells = result;
    }

    next(...args) {
        this.cells.next(...args);
    }
}

class Player {
    constructor() {
        this.columns = Arr.init(3, _ => new Column());
    }

    is_full() {
        return Arr.for_all(this.columns, col => col.is_full());
    }

    add_die({column, die}) {
        this.columns[column].add_die(die);
    }

    possible_moves() {
        let result = new Array();
        for (let i = 0; i < this.columns.length; i += 1) {
            if (!this.columns[i].is_full()) {
                result.push(i);
            }
        }
        return result;
    }

    score() {
        return this.columns.reduce((a, b) => a.score() + b.score(), 0);
    }

    negate({column, die}) {
        this.columns[column].negate(die);
    }
}

class Game {
    constructor() {
        this.players = Arr.init(2, _ => new Player());
        this.turn = Rand.int(2);
    }

    game_over() {
        return Arr.exists(this.players, player => player.is_full());
    }

    next_turn(player_choice) {
        if (this.game_over()) return;

        
        let die = Rand.int(6) + 1;
        let available_choices = this.players[this.turn].possible_moves();
        let choice = player_choice({player: this.turn, die, available_choices});
        let move = {column: choice, die};
        this.players[this.turn].add_die(move);
        this.players[1 - this.turn].negate(move);
        this.turn = 1 - this.turn;
    }
}

const CELL_SIZE = 100;
const CELL_COLOUR = 0xDE3249;
const PADDING = 5;
const PLAYER_SIZE = 3 * CELL_SIZE + 3 * PADDING;

class Graphics {
    constructor() {
        this.app = new PIXI.Application({ width: 640, height: 960 });
        document.body.appendChild(this.app.view);
        this.children = []
        const dice_style = (fill) =>
            new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 46,
                fontStyle: 'italic',
                fontWeight: 'bold',
                fill, // gradient
                stroke: '#4a1850',
                strokeThickness: 5,
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 4,
                dropShadowAngle: Math.PI / 6,
                dropShadowDistance: 6,
                wordWrap: true,
                wordWrapWidth: 440,
                lineJoin: 'round',
            });
        this.dice_styles = {
            1: dice_style(['#ffffff', '#00ff99']),
            2: dice_style(['#ffffff', "#ffff00"]),
            3: dice_style(['#5ffcfc', "#9e5ffc"])
        };
    }

    addChild(child) {
        this.app.stage.addChild(child);
        this.children.push(child);
    }

    erase() {
        for (const child of this.children) {
            this.app.stage.removeChild(child);
            child.destroy();
        }
        this.children = [];
    }

    draw_cell({x, y, cell, die_count}) {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(CELL_COLOUR);
        graphics.drawRect(x, y, CELL_SIZE, CELL_SIZE);
        graphics.endFill();
        this.addChild(graphics);
        if (cell == -1) return;
        else {
            let die = new PIXI.Text(String(cell), this.dice_styles[die_count]);
            die.x = x + 30;
            die.y = y + 20;
            this.addChild(die);
        }
    }

    draw_column({x, y, column, flip}) {
        let cy = y;
        let cells = flip ? column.cells : column.cells;
        let die_counts = column.die_counts();
        let draw = (cell) => {
            let args = {x, y: cy, cell, die_count: die_counts[cell]};

            this.draw_cell(args);
            cy += CELL_SIZE + PADDING;
        };
        if (flip) {
            // javascript reverses in place so I'm doing it by hand
            for (let i = cells.length - 1; i >= 0; i -= 1) {
                draw(cells[i]);
            }
        } else {
            for (const cell of cells) {
                draw(cell);
            }
        }

    }

    draw_player({x, y, player, flip}) {
        let cx = x;
        let columns = player.columns;
        for (const column of columns) {
            this.draw_column({x: cx, y, column, flip});
            cx += CELL_SIZE + PADDING;
        }
    }

    draw_game({x, y, game}) {
        let cy = y;
        this.draw_player({x, y: cy, player: game.players[0], flip: true});
        cy += PLAYER_SIZE + 100;
        this.draw_player({x, y: cy, player: game.players[1], flip: false});
    }
}

const graphics = new Graphics();
// let column = new Column();
// column.add_die(2);
// column.add_die(6);
// console.log(column);
// graphics.draw_column({x:20, y:60, column, flip: true});

// let player = new Player();
// player.add_die({column:0, die:2});
// player.add_die({column:2, die:6});
// graphics.draw_player({x:20, y: 60, player, flip: true});

let game = new Game();
graphics.draw_game({x:20, y:20, game});

setInterval(() => {
    if (!game.game_over()) {
        graphics.erase();
        game.next_turn(({player, die, available_choices}) =>
            available_choices[Rand.int(available_choices.length)]);
        graphics.draw_game({x:20, y:20, game});
    }
}, 500);