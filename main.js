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
    constructor(which) {
        // CR-someday: This is a bit hacky. We consider a cell to have a die if it's
        // value is not -1. Otherwise it's an empty cell. There are other hacks
        // in the code that treat a cell and a die as interchangable and it's confugsing.
        this.cells = Arr.init(3, _ => -1);
        this.which = which;
    }

    is_full() {
        return Arr.for_all(this.cells, cell => cell != -1);
    }

    add_die(die) {
        let first_empty = this.cells.findIndex(cell => cell == -1);
        this.cells[first_empty] = die;
    }

    non_empty() {
        return this.cells.filter(cell => cell != -1);
    }

    die_counts() {
        let counts = {};
        let max_count = 0;
        this.non_empty().forEach(x => {
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
        const counts = this.die_counts();
        return this.non_empty().reduce((sum, cell) => sum + cell * counts[cell], 0);
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
    constructor(which) {
        this.columns = Arr.init(3, i => new Column(i));
        this.which = which;
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
        return this.columns.reduce((sum, col) => sum + col.score(), 0);
    }

    negate({column, die}) {
        this.columns[column].negate(die);
    }
}
class Game {

    constructor() {
        this.players = Arr.init(2, i => new Player(i));
        this.turn = Rand.int(2);
        this.die = Rand.die();
    }

    game_over() {
        return Arr.exists(this.players, player => player.is_full());
    }

    next_turn() {
        if (this.game_over()) return;
        
        this.die = Rand.int(6) + 1;
        this.turn = 1 - this.turn;
    }

    available_moves() {
        return this.players[this.turn].possible_moves();
    }

    valid_move(column) {
        return !this.game_over() && this.available_moves().indexOf(column) != -1;
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
                lineJoin: 'round',
            });
        const score_style = 
            new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 46,
                fill: ['#ffffff'],
                strokeThickness: 5,
                wordWrapWidth: 440,
                lineJoin: 'round',
            });
        const next_move_style = 
            new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 100,
                stroke: '#4a1850',
                fill: ['#ffffff', '#00ff99'],
                fontStyle: 'italic',
                fontWeight: 'bold',
                strokeThickness: 5,
                wordWrapWidth: 440,
                lineJoin: 'round',
            });
        const game_over_style = 
            new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 50,
                stroke: '#4a1850',
                fill: ['#ffffff'],
                fontStyle: 'italic',
                fontWeight: 'bold',
                strokeThickness: 5,
                wordWrapWidth: 440,
                lineJoin: 'round',
            });
        this.text_styles = {
            1: dice_style(['#ffffff', '#00ff99']),
            2: dice_style(['#ffffff', "#ffff00"]),
            3: dice_style(['#5ffcfc', "#9e5ffc"]),
            score: score_style,
            next_move: next_move_style,
            game_over: game_over_style
        };
    }

    addChild(child) {
        this.children.push(child);
        return this.app.stage.addChild(child);
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
            let text = new PIXI.Text(String(die), this.text_styles[die_count]);
            text.x = x + 30;
            text.y = y + 20;
            container.addChild(text);
        }
        parent.addChild(container);
    }

    draw_column(parent, {x, y, column, flip, game, redraw}) {
        let container = new PIXI.Container();
        let cy = y;
        let cells = flip ? Arr.rev(column.cells) : column.cells;
        let die_counts = column.die_counts();
        for (const die of cells) {
            let args = {x, y: cy, die, die_count: die_counts[die]};

            this.draw_cell(container, args);
            cy += CELL_SIZE + PADDING;
        }
        let on_click = () => {
            if (game.valid_move(column.which)) {
                game.player_move(column.which);
                redraw();
            }
        };
        container.interactive = true;
        container.on("click", on_click);
        container.on("tap", on_click);
        parent.addChild(container);
    }

    draw_player_board(parent, {x, y, player, flip, game, redraw}) {
        let container = new PIXI.Container();
        let cx = x;
        let columns = player.columns;
        for (const column of columns) {
            this.draw_column(container, {x: cx, y, column, flip, game, redraw});
            cx += CELL_SIZE + PADDING;
        }
        return parent.addChild(container);
    }

    draw_player(parent, args) {
        let container = new PIXI.Container();
        let board = this.draw_player_board(container, args);
        let boardBounds = board.getBounds();
        let score = args.player.score();
        let scoreText  = new PIXI.Text("Score: " + String(score), this.text_styles["score"]);
        scoreText.x = boardBounds.x + boardBounds.width + 2 * PADDING;
        scoreText.y = boardBounds.y + PADDING;
        container.addChild(scoreText);
        if (!game.game_over && args.player.which == args.game.turn) {
            let die = game.die;
            let dieText = new PIXI.Text(String(die), this.text_styles["next_move"]);
            dieText.x = boardBounds.x + boardBounds.width + 70;
            dieText.y = boardBounds.y + boardBounds.height / 2 - 50;
            container.addChild(dieText);
        }
        return parent.addChild(container);
    }

    draw_game({x, y, game}) {
        let container = new PIXI.Container();
        let cy = y;
        let redraw = () => {
            this.erase();
            this.draw_game({x, y, game});
        }
        let p1 = this.draw_player(container, {x, y: cy, player: game.players[0], flip: true, game, redraw});
        cy += PLAYER_SIZE + 100;
        let p2 = this.draw_player(container, {x, y: cy, player: game.players[1], flip: false, game, redraw});
        if (game.game_over()) {
            let text = new PIXI.Text("GAME OVER!", this.text_styles["game_over"]);
            text.x = x + 100;
            text.y = y + 330;
            container.addChild(text);
            container.interactive = true;
            let restart = () => {
                this.erase();
                this.draw_game({x, y, game: new Game()});
            };
            container.on("click", restart);
            container.on("tap", restart);
        }
        return this.addChild(container);
    }
}

const graphics = new Graphics();

let game = new Game();
graphics.draw_game({x:20, y:20, game});
