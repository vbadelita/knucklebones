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

    static rev(arr) {
        let result = [];
        for (let i = arr.length - 1; i >= 0; i -= 1) {
            result.push(arr[i]);
        }
        return result;
    }
}

class Rand {
    static int(n) {
        return Math.floor(Math.random() * n);
    }

    static die() {
        return Rand.int(6) + 1;
    }

    static pick(arr) {
        return arr[Rand.int(arr.length)];
    }
}
  

class Column {
    constructor() {
        // CR-someday: This is a bit hacky. We consider a cell to have a die if it's
        // value is not -1. Otherwise it's an empty cell. There are other hacks
        // in the code that treat a cell and a die as interchangable and it's confugsing.
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
        this.die = Rand.die();
    }

    game_over() {
        return Arr.exists(this.players, player => player.is_full());
    }

    next_turn(player_choice) {
        if (this.game_over()) return;
        
        this.die = Rand.int(6) + 1;
        this.turn = 1 - this.turn;
    }

    available_moves() {
        return this.players[this.turn].possible_moves();
    }

    player_move(column) {
        let move = {column, die: this.die};
        this.players[this.turn].add_die(move);
        this.players[1 - this.turn].negate(move);
        this.next_turn();
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

    draw_cell(parent, {x, y, die, die_count}) {
        let container = new PIXI.Container();
        const box = new PIXI.Graphics();
        box.beginFill(CELL_COLOUR);
        box.drawRect(x, y, CELL_SIZE, CELL_SIZE);
        box.endFill();
        container.addChild(box);
        if (die != -1) {
            let text = new PIXI.Text(String(die), this.dice_styles[die_count]);
            text.x = x + 30;
            text.y = y + 20;
            container.addChild(text);
        }
        parent.addChild(container);
    }

    draw_column(parent, {x, y, column, flip}) {
        let container = new PIXI.Container();
        let cy = y;
        let cells = flip ? Arr.rev(column.cells) : column.cells;
        let die_counts = column.die_counts();
        for (const die of cells) {
            let args = {x, y: cy, die, die_count: die_counts[die]};

            this.draw_cell(container, args);
            cy += CELL_SIZE + PADDING;
        }
        parent.addChild(container);
    }

    draw_player({x, y, player, flip}) {
        let container = new PIXI.Container();
        let cx = x;
        let columns = player.columns;
        for (const column of columns) {
            this.draw_column(container, {x: cx, y, column, flip});
            cx += CELL_SIZE + PADDING;
        }
        this.addChild(container);
    }

    draw_game({x, y, game}) {
        let cy = y;
        this.draw_player({x, y: cy, player: game.players[0], flip: true});
        cy += PLAYER_SIZE + 100;
        this.draw_player({x, y: cy, player: game.players[1], flip: false});
    }
}

const graphics = new Graphics();

let game = new Game();
graphics.draw_game({x:20, y:20, game});

setInterval(() => {
    if (!game.game_over()) {
        graphics.erase();
        let moves = game.available_moves();
        game.player_move(Rand.pick(moves));
        graphics.draw_game({x:20, y:20, game});
    }
}, 500);