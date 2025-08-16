// @ts-check
// noinspection UnnecessaryLocalVariableJS, UnnecessaryReturnStatementJS

let DEBUG_MODE = false;
let RENDER_AREA_HAS_BEEN_RESIZED = true;

/**
 * A coordinate on the grid, identified by its row and column.
 * @typedef {Object} Coord
 * @property {number} row - The row index within the grid.
 * @property {number} col - The column index within the grid.
 */

/**
 * A Point on the canvas, identified by its x and y position.
 * @typedef {Object} Point2D
 * @property {number} x - The x coordinate (horizontal).
 * @property {number} y - The y coordinate (vertical).
 */

/**
 * Rectangle drawn on the canvas.
 * @typedef {Object} Rectangle
 * @property {number} x - The X position of the top-left corner.
 * @property {number} y - The Y position of the top-left corner.
 * @property {number} width - Width of the rectangle.
 * @property {number} height - Height of the rectangle.
 */

/**
 * Represents a hexagon's geometry and position on the canvas.
 * @typedef {Object} Hexagon
 * @property {number} cx - The X coordinate of the hexagon's center.
 * @property {number} cy - The Y coordinate of the hexagon's center.
 * @property {number} width - Horizontal span (distance between opposite sides).
 * @property {number} height - Vertical span (distance between top and bottom).
 */

/**
 * A hallway connecting rooms. Hallways may not always be present.
 * If enabled, their status reflects what's on the other side.
 * @typedef {Object} Hallway
 * @property {"unknown" | "open" | "blocked"} status - Current state of the hallway.
 * @property {boolean} enabled - Whether the hallway is active (can be used).
 */

/**
 * A room effect triggered by interaction such as entering, leaving, or activating the room.
 * @typedef {Object} Effect
 * @property {() => void} invoke - Function to trigger the effect.
 * @property {string} description - Text describing the effect’s behavior.
 * @property {string} triggerText - UI message shown when the effect is activated.
 * @property {number} triggerLimit - Max number of times this effect can be triggered.
 * @property {number} rarity - Numeric value indicating how rare this effect is.
 */

/**
 * Represents the active state of keyboard modifier keys.
 * @typedef {Object} ModifierState
 * @property {boolean} shift - Whether the Shift key is currently held.
 * @property {boolean} ctrl - Whether the Control key is currently held.
 * @property {boolean} alt - Whether the Alt key is currently held.
 * @property {boolean} meta - Whether the Meta key is currently held (e.g., Cmd on macOS or Windows key).
 */

/**
 * Represents the current state of the mouse.
 * @typedef {Object} MouseState
 * @property {number} x - The current mouse X position (relative to canvas).
 * @property {number} y - The current mouse Y position.
 * @property {Set<number>} buttons - A set of pressed mouse button codes (0 = left, 1 = middle, 2 = right).
 */

/**
 * Events related to room activities
 * @typedef {"enter"|"exit"|"use"} RoomEvent
 */

/**
 * What state the game is in
 * @typedef {"move"|"draft"} GameState
 */
/**
 * What can be found in a room
 * @typedef {"keys"|"lock"|"gems"|"steps"} Item
 */

/**
 * Direction of movement on the grid
 * @typedef {
 * "NORTH" |
 * "NORTH_EAST" |
 * "SOUTH_EAST" |
 * "SOUTH" |
 * "SOUTH_WEST" |
 * "NORTH_WEST"
 * } Direction
 */

/**
 * Represents primary visual symbols used to identify the main room effect
 * @typedef {"spiral" | "diamond" | "loop" | "bright" | "circle" | "square"} Symbol
 */


/**
 * Represents alternate symbols that may appear in rooms
 * @typedef {"target" | "star" | "slash" | "paint" | "egg" | "grid"} AltSymbol
 */

/**
 * Represents font scale levels.
 * @typedef {"xs" | "sm" | "md" | "lg" | "xl"} FontSize
 */

/**
 * Rectangle drawn on the canvas.
 * @typedef {Object} PuzzlePiece
 * @property {Symbol} innerSymbol - The symbol in the middle of the puzzle
 * @property {AltSymbol} outerSymbol - The symbol being run around the inner sections
 * @property {string} fillColor - The main color of the hexagon
 * @property {"straight" | "wavy" | "dotted" | "dashed"} lineType - The line type coming from the center
 */

/** @type {Direction[]} */
const DIRECTION_VALUES = [
    "NORTH",
    "NORTH_EAST",
    "SOUTH_EAST",
    "SOUTH",
    "SOUTH_WEST",
    "NORTH_WEST"];


/** @type {Record<Item, string>} */
const ItemTexts = {
    "steps": "👣",
    "keys": "🔑",
    "lock": "🔒",
    "gems": "💎",
};


/** @type {Record<Symbol, string>} */
const SymbolTexts = {
    "spiral": "🌀",
    "diamond": "🔶",
    "loop": "➰",
    "bright": "🔆",
    "circle": "🔴",
    "square": "🟩",
};


/** @type {Record<AltSymbol, string>} */
const AltSymbolTexts = {
    "target": "🎯",
    "star": "✴️",
    "slash": "〰️",
    "paint": "🎨",
    "egg": "🥚",
    "grid": "🔳",
};

/**
 * Determines whether a point (x, y) lies inside a given rectangular area.
 *
 * @param {number} x - The horizontal position of the point.
 * @param {number} y - The vertical position of the point.
 * @param {Rectangle} rect - The rectangle to test against.
 * @returns {boolean} - Returns true if the point is within the bounds of the rectangle.
 */
const isInside = (x, y, rect) =>
    rect.x <= x && rect.y <= y && x <= rect.x + rect.width && y <= rect.y + rect.height;

/**
 *
 * @param {Coord} coord
 * @return {string} the string representation of the given coordinate
 */
const coordToString = (coord) => `[${coord.row};${coord.col}]`;

/**
 *
 * @param {Coord} coord1
 * @param {Coord} coord2
 * @return {boolean} if the two coords are the same, false otherwise
 */
const areEqualCoords = (coord1, coord2) => coord1.row === coord2.row && coord1.col === coord2.col;

/**
 *
 * @param {Coord} coord1
 * @param {Coord} coord2
 * @return {boolean} if the two coords are neighbors on the grid, false otherwise
 */
const areNeighbors = (coord1, coord2) => DIRECTION_VALUES.some((direction) => areEqualCoords(tileTowards(coord1, direction), coord2));

/**
 *
 * @param origin the origin to check the direction from
 * @param coord the coord to check towards to
 * @return {Direction | undefined} if they are neighbors, the proper direction, undefined otherwise
 */
const getDirection = (origin, coord) => DIRECTION_VALUES.find((direction) => areEqualCoords(tileTowards(origin, direction), coord))

class SeededRNG {
    /**
     * The current seed used by the generator
     * @type {number}
     */
    #seed;

    constructor(seed = 0) {
        this.setSeed(seed);
    }

    setSeed(seed) {
        this.#seed = seed ?? Math.floor(Math.random() * Math.pow(2, 31)) + 1;
    }

    float() {
        this.#seed ^= this.#seed << 13;
        this.#seed ^= this.#seed >> 17;
        this.#seed ^= this.#seed << 5;
        return (this.#seed >>> 0) / 0xFFFFFFFF;
    }

    int32() {
        this.#seed ^= this.#seed << 13;
        this.#seed ^= this.#seed >> 17;
        this.#seed ^= this.#seed << 5;
        return this.#seed | 0;
    }

    get seed() {
        return this.#seed;
    }
}

const rng = new SeededRNG(Date.now());

/**
 * Sets the random seed.
 * @param {number} seed
 */
const setSeed = (seed) => rng.setSeed(seed);

/**
 * Returns a random float between 0 (inclusive) and 1 (exclusive).
 * @returns {number}
 */
const randomFloat = () => rng.float();

/**
 * Returns a random integer between min (inclusive) and max (exclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const randomRange = (min, max) => Math.floor(randomFloat() * (max - min)) + min;

/**
 * Returns a random 32-bit integer or one bounded between 0 and the specified value.
 * @param {number} bound
 * @returns {number}
 */
const randomInt32 = (bound = 0) => bound ? randomRange(0, bound) : rng.int32();

/**
 * Returns a random boolean.
 * @returns {boolean}
 */
const randomBool = () => randomInt32() % 2 === 0;

/**
 * Picks a random element from an array.
 * @template T
 * @param {Array<T>} items
 * @returns {T}
 */
const randomElement = items => items[randomInt32(items.length)];

/**
 * Generates a random hex color string (e.g., #A3F2D1).
 * @returns {string}
 */
const randomHexColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += randomElement([...letters]);
    }
    return color;
};

/** @typedef { "noop" | "taxes" | "garden" | "shop" | "extraSteps" | "money" | "extraKey" | "exit" } EffectType */

/** @type {Record<EffectType, Effect>} */
const Effects = {
    "extraSteps":
        {
            invoke: () => gameState.addResource("steps", 2),
            description: "Take a rest.",
            triggerText: "You have gained 2 extra steps.",
            triggerLimit: -1,
            rarity: 0.5,
        },
    "extraKey":
        {
            invoke: () => gameState.addResource("keys"),
            description: "Alohomora.",
            triggerText: "You have found a key.",
            triggerLimit: 1,
            rarity: 0.3,
        },
    "money":
        {
            invoke: () => gameState.addResource("gems"),
            description: "What's that spark in the corner?",
            triggerText: "You have found a gem.",
            triggerLimit: 1,
            rarity: 0.3,
        },
    "taxes":
        {
            invoke: () => gameState.removeResource("gems"),
            description: "Takes a toll on you.",
            triggerText: `You have to pay taxes: ${ItemTexts.gems}`,
            triggerLimit: -1,
            rarity: 0.3,
        },
    "garden":
        {
            invoke: () => gameState.setResource("steps", 41),
            description: "Like starting again.",
            triggerText: "Your steps have been reset.",
            triggerLimit: -1,
            rarity: 0.4,
        },
    "shop":
        {
            invoke: () => {
                if (gameState.getResource("gems") >= 5) {
                    gameState.addResource("keys");
                    gameState.removeResource("gems", 5);
                }
            },
            description: "Buy your passage.",
            triggerText: "You can buy a key for #5 with [Space].",
            triggerLimit: 1,
            rarity: 0.9,
        },
    "exit":
        {
            invoke: () => {
                gameState.pause();
            },
            description: "",
            triggerText: "You have won!",
            triggerLimit: -1,
            rarity: 0,
        },
    "noop":
        {
            invoke: () => {
            },
            description: "A simple room.",
            triggerText: "",
            triggerLimit: -1,
            rarity: 0.7,
        },
};

class Tween {
    /**
     *
     * @param {{
     * from: number,
     * to: number,
     * duration: number,
     * ease?: (value: number) => number,
     * onUpdate?: (value: number) => void,
     * onComplete?: () => void,
     * loop?: boolean,
     * reverse?: boolean,
     * type?: string
     * }} values
     */
    constructor({from, to, duration, ease = t => t, onUpdate, onComplete, loop = false, reverse = false, type = ""}) {
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.ease = ease;
        this.onUpdate = onUpdate;
        this.onComplete = onComplete;
        this.loop = loop;
        this.reverse = reverse;
        this.active = true;
        this.startTime = performance.now();
        this.type = type;
    }

    /**
     *
     * @param {number} time
     */
    update(time) {
        const t = Math.min((time - this.startTime) / this.duration, 1);
        const eased = this.ease(t);
        const value = this.from + (this.to - this.from) * eased;

        this.onUpdate(value);

        if (t === 1) {
            if (this.loop) {
                if (this.reverse) {
                    [this.from, this.to] = [this.to, this.from];
                }
                this.startTime = time;
            } else {
                this.active = false;
                this.onComplete?.();
            }
        }
    }
}

/**
 * @type {Tween[]}
 */
let animations = [
    //@ts-ignore
    new Tween({
        from: 0.1,
        to: 1,
        duration: 800,
        loop: true,
        reverse: true,
        onUpdate: (val) => selectionAlpha = val,
        type: "selection-pulse"
    }),
    //@ts-ignore
    new Tween({
        from: 0,
        to: 2 * Math.PI,
        duration: 2000,
        loop: true,
        onUpdate: (val) => refreshRotation = val,
        type: "refresh-rotate"
    }),
];

class Room {
    /** @type {Record<RoomEvent, string>} */
    events;
    /** @type {Record<Direction, Hallway>} */
    hallways;
    /** @type {boolean} */
    revealed;
    /** @type {number} */
    triggerCount;
    /** @type {boolean} */
    needsKey;
    /** @type {Item[]} */
    items;
    /** @type {Coord} */
    coord;

    /** @param {Room | undefined} values */
    constructor(values = undefined) {
        if (!!values) {
            this.events = values.events;
            this.hallways = values.hallways;
            this.revealed = values.revealed;
            this.triggerCount = values.triggerCount;
            this.needsKey = values.needsKey;
            this.items = values.items;
            this.coord = values.coord;
        } else {
            this.#defaults();
        }
    }

    #defaults() {
        this.events = {
            "enter": "noop",
            "exit": "noop",
            "use": "noop",
        }
        this.hallways = {
            NORTH: {status: "unknown", enabled: true},
            NORTH_EAST: {status: "unknown", enabled: true},
            SOUTH_EAST: {status: "unknown", enabled: true},
            SOUTH: {status: "unknown", enabled: true},
            SOUTH_WEST: {status: "unknown", enabled: true},
            NORTH_WEST: {status: "unknown", enabled: true},
        };
        this.revealed = false;
        this.triggerCount = 0;
        this.needsKey = false;
        this.items = [];
        this.coord = {row: -1, col: -1};

    }

    /** @param {string} event */
    #invokeEvent(event) {
        if (Effects[event].triggerLimit === -1) {
            // the event has no limitation on its invocation
            Effects[event].invoke();
            gameState.lastEffect = Effects[event].triggerText;
        } else if (this.triggerCount < Effects[event].triggerLimit) {
            // the event does have limitation on its invocation, but the player has not yet exhausted it
            Effects[event].invoke();
            gameState.lastEffect = Effects[event].triggerText;
            this.triggerCount += 1;
        } else {
            // Effect limitation exhausted
            gameState.lastEffect = "";
        }
    }

    /**
     * Called when the player enters the room.
     */
    enter() {
        this.#invokeEvent(this.events.enter);
    }

    use() {
        this.#invokeEvent(this.events.use);
    }

    exit() {
        this.#invokeEvent(this.events.exit);
    }

    /**
     *
     * @returns {Room} copy of this
     */
    copy() {
        return new Room(JSON.parse(JSON.stringify(this)));
    }
}

/**
 * Represents a draft state used for room placement and selection.
 * @typedef {Object} Draft
 * @property {number} index - The currently selected room index in the draft.
 * @property {Coord} position - The grid coordinate where the draft is positioned.
 * @property {Direction} direction - Direction of placement for the current room.
 * @property {Room[]} options - Array of room options available in the draft.
 */


/** @type {HTMLCanvasElement} */
// @ts-ignore
const canvas = document.querySelector("#canvas");

/** @type {CanvasRenderingContext2D} */
// @ts-ignore
const context = canvas.getContext("2d");

// CSS Color Names
// The full list can be found here: https://www.w3schools.com/cssref/css_colors.asp

const CSS_COLOR_NAMES = {
    AliceBlue: '#F0F8FF',
    AntiqueWhite: '#FAEBD7',
    Aqua: '#00FFFF',
    Aquamarine: '#7FFFD4',
    Azure: '#F0FFFF',
    Beige: '#F5F5DC',
    Bisque: '#FFE4C4',
    Black: '#000000',
    BlanchedAlmond: '#FFEBCD',
    Blue: '#0000FF',
    BlueViolet: '#8A2BE2',
    Brown: '#A52A2A',
    BurlyWood: '#DEB887',
    CadetBlue: '#5F9EA0',
    Chartreuse: '#7FFF00',
    Chocolate: '#D2691E',
    Coral: '#FF7F50',
    CornflowerBlue: '#6495ED',
    Cornsilk: '#FFF8DC',
    Crimson: '#DC143C',
    Cyan: '#00FFFF',
    DarkBlue: '#00008B',
    DarkCyan: '#008B8B',
    DarkGoldenRod: '#B8860B',
    DarkGray: '#A9A9A9',
    DarkGrey: '#A9A9A9',
    DarkGreen: '#006400',
    DarkKhaki: '#BDB76B',
    DarkMagenta: '#8B008B',
    DarkOliveGreen: '#556B2F',
    DarkOrange: '#FF8C00',
    DarkOrchid: '#9932CC',
    DarkRed: '#8B0000',
    DarkSalmon: '#E9967A',
    DarkSeaGreen: '#8FBC8F',
    DarkSlateBlue: '#483D8B',
    DarkSlateGray: '#2F4F4F',
    DarkSlateGrey: '#2F4F4F',
    DarkTurquoise: '#00CED1',
    DarkViolet: '#9400D3',
    DeepPink: '#FF1493',
    DeepSkyBlue: '#00BFFF',
    DimGray: '#696969',
    DimGrey: '#696969',
    DodgerBlue: '#1E90FF',
    FireBrick: '#B22222',
    FloralWhite: '#FFFAF0',
    ForestGreen: '#228B22',
    Fuchsia: '#FF00FF',
    Gainsboro: '#DCDCDC',
    GhostWhite: '#F8F8FF',
    Gold: '#FFD700',
    GoldenRod: '#DAA520',
    Gray: '#808080',
    Grey: '#808080',
    Green: '#008000',
    GreenYellow: '#ADFF2F',
    HoneyDew: '#F0FFF0',
    HotPink: '#FF69B4',
    IndianRed: '#CD5C5C',
    Indigo: '#4B0082',
    Ivory: '#FFFFF0',
    Khaki: '#F0E68C',
    Lavender: '#E6E6FA',
    LavenderBlush: '#FFF0F5',
    LawnGreen: '#7CFC00',
    LemonChiffon: '#FFFACD',
    LightBlue: '#ADD8E6',
    LightCoral: '#F08080',
    LightCyan: '#E0FFFF',
    LightGoldenRodYellow: '#FAFAD2',
    LightGray: '#D3D3D3',
    LightGrey: '#D3D3D3',
    LightGreen: '#90EE90',
    LightPink: '#FFB6C1',
    LightSalmon: '#FFA07A',
    LightSeaGreen: '#20B2AA',
    LightSkyBlue: '#87CEFA',
    LightSlateGray: '#778899',
    LightSlateGrey: '#778899',
    LightSteelBlue: '#B0C4DE',
    LightYellow: '#FFFFE0',
    Lime: '#00FF00',
    LimeGreen: '#32CD32',
    Linen: '#FAF0E6',
    Magenta: '#FF00FF',
    Maroon: '#800000',
    MediumAquaMarine: '#66CDAA',
    MediumBlue: '#0000CD',
    MediumOrchid: '#BA55D3',
    MediumPurple: '#9370DB',
    MediumSeaGreen: '#3CB371',
    MediumSlateBlue: '#7B68EE',
    MediumSpringGreen: '#00FA9A',
    MediumTurquoise: '#48D1CC',
    MediumVioletRed: '#C71585',
    MidnightBlue: '#191970',
    MintCream: '#F5FFFA',
    MistyRose: '#FFE4E1',
    Moccasin: '#FFE4B5',
    NavajoWhite: '#FFDEAD',
    Navy: '#000080',
    OldLace: '#FDF5E6',
    Olive: '#808000',
    OliveDrab: '#6B8E23',
    Orange: '#FFA500',
    OrangeRed: '#FF4500',
    Orchid: '#DA70D6',
    PaleGoldenRod: '#EEE8AA',
    PaleGreen: '#98FB98',
    PaleTurquoise: '#AFEEEE',
    PaleVioletRed: '#DB7093',
    PapayaWhip: '#FFEFD5',
    PeachPuff: '#FFDAB9',
    Peru: '#CD853F',
    Pink: '#FFC0CB',
    Plum: '#DDA0DD',
    PowderBlue: '#B0E0E6',
    Purple: '#800080',
    RebeccaPurple: '#663399',
    Red: '#FF0000',
    RosyBrown: '#BC8F8F',
    RoyalBlue: '#4169E1',
    SaddleBrown: '#8B4513',
    Salmon: '#FA8072',
    SandyBrown: '#F4A460',
    SeaGreen: '#2E8B57',
    SeaShell: '#FFF5EE',
    Sienna: '#A0522D',
    Silver: '#C0C0C0',
    SkyBlue: '#87CEEB',
    SlateBlue: '#6A5ACD',
    SlateGray: '#708090',
    SlateGrey: '#708090',
    Snow: '#FFFAFA',
    SpringGreen: '#00FF7F',
    SteelBlue: '#4682B4',
    Tan: '#D2B48C',
    Teal: '#008080',
    Thistle: '#D8BFD8',
    Tomato: '#FF6347',
    Turquoise: '#40E0D0',
    Violet: '#EE82EE',
    Wheat: '#F5DEB3',
    White: '#FFFFFF',
    WhiteSmoke: '#F5F5F5',
    Yellow: '#FFFF00',
    YellowGreen: '#9ACD32',
};

const randomColor = () => randomElement(Object.values(CSS_COLOR_NAMES));

/**
 * @param {{fill?: string, border?: string, borderWidth?: number}} colors
 */
const useColors = (colors) => {
    if (colors.fill) {
        context.fillStyle = colors.fill;
        context.fill();
    }
    if (colors.border) {
        context.strokeStyle = colors.border;
        context.lineWidth = colors.borderWidth ?? getFontSizeInPixels("xs") / 10;
        context.stroke();
    }
}

/**
 *
 * @param {number} value
 * @param {number} lower
 * @param {number} upper
 * @returns {number} the clamped value
 */
const clamp = (value, lower, upper) => value < lower ? lower : value > upper ? upper : value;

/** @type {Record<EffectType | "draft", string>} */
const ROOM_COLORS = {
    "noop": "#AF6C31",
    "taxes": "#AE0000",
    "garden": "#2F8043",
    "shop": "#D7DE87",
    "extraSteps": "#6E5381",
    "money": CSS_COLOR_NAMES.Tan,
    "extraKey": CSS_COLOR_NAMES.Gold,
    "exit": "#005A8D",
    "draft": CSS_COLOR_NAMES.LightSteelBlue,
};

const PLAYER_COLOR = CSS_COLOR_NAMES.Black;
const CLEAR_COLOR = "#1D1D1D";

class Game {
    /**
     * Number of rows in the grid.
     * @type {number}
     */
    #rows;

    /**
     * Number of columns in the grid.
     * @type {number}
     */
    #cols;

    /**
     * 2D array representing the hexagonal grid layout of rooms.
     * @type {Room[][]}
     */
    #grid;

    /**
     * Current player position on the grid.
     * @type {Coord}
     */
    #player;

    /**
     * Exit location in the grid.
     * @type {Coord}
     */
    #exit;

    /**
     * Current gameplay state.
     * @type {GameState}
     */
    #currentState;

    /**
     * Collection of resource types and their quantities.
     * Keys are item names, values are counts.
     * @type {Partial<Record<Item, number>>}
     */
    #resources;

    /**
     * Whether the game loop is currently active.
     * @type {boolean}
     */
    #running;

    /**
     * Most recently triggered effect type.
     * @type {EffectType}
     */
    #lastEffect;

    /**
     * Timestamp from last game tick or update.
     * @type {number}
     */
    #lastTimeStamp;

    /**
     * Draft pool used for room placement.
     * Values are randomly generated upon entering draft mode.
     * @type {Draft}
     */
    #draft;

    /**
     * Grid row index beneath the mouse pointer.
     * @type {number}
     */
    mouseGridRow;

    /**
     * Grid column index beneath the mouse pointer.
     * @type {number}
     */
    mouseGridCol;

    constructor() {
        this.newGame();
    }

    newGame() {
        this.#rows = 5;
        this.#cols = 13;

        this.#grid = Array.from({length: this.#rows},
            (_, row) => Array.from({length: this.#cols},
                (_, col) => {
                    /** @type {Room}*/
                    const room = new Room();
                    room.coord.row = row;
                    room.coord.col = col;
                    return room;
                })
        );

        this.#player = {row: 2, col: 0};
        this.atCoord(this.player).events = {
            enter: "noop",
            exit: "noop",
            use: "noop",
        };
        this.atCoord(this.player).revealed = true;
        this.atCoord(this.player).hallways = {
            NORTH: {status: "unknown", enabled: true},
            NORTH_EAST: {status: "unknown", enabled: true},
            SOUTH_EAST: {status: "unknown", enabled: true},
            SOUTH: {status: "unknown", enabled: true},
            SOUTH_WEST: {status: "blocked", enabled: true},
            NORTH_WEST: {status: "blocked", enabled: true},
        };

        this.#exit = {row: 2, col: 9};
        this.atCoord(this.exit).events = {
            enter: "exit",
            exit: "noop",
            use: "noop",
        };
        this.atCoord(this.exit).revealed = true;
        this.atCoord(this.exit).hallways = {
            NORTH: {status: "unknown", enabled: true},
            NORTH_EAST: {status: "blocked", enabled: true},
            SOUTH_EAST: {status: "blocked", enabled: true},
            SOUTH: {status: "unknown", enabled: true},
            SOUTH_WEST: {status: "unknown", enabled: true},
            NORTH_WEST: {status: "unknown", enabled: true},
        };
        this.#draft = {
            index: 0,
            position: {
                row: 0,
                col: 0,
            },
            direction: "NORTH",
            options: [
                new Room(),
                new Room(),
                new Room(),
            ]
        };
        this.#draft.options.forEach(draft => draft.revealed = true);

        this.#resources = {
            "steps": 40,
            "keys": 1,
            "gems": 0,
        };

        this.mouseGridRow = -1;
        this.mouseGridCol = -1;

        this.#lastTimeStamp = 0;
        this.#lastEffect = "noop";

        this.setState("move");
        this.play();
    }

    get rows() {
        return this.#rows;
    }

    get cols() {
        return this.#cols;
    }

    /**
     *
     * @return {Coord}
     */
    get player() {
        return this.#player;
    }

    /**
     *
     * @return {Coord}
     */
    get exit() {
        return this.#exit;
    }

    /**
     Moves the player to the given position.

     @assumes The coord is a valid coordinate on the grid
     @param {number} row the row number
     @param {number} col the column number
     * */
    movePlayerTo(row, col) {
        this.#player.row = row;
        this.#player.col = col;
    }

    /**
     * Moves the player to the given position.
     *
     * @assumes The coord is a valid coordinate on the grid
     * @param {Coord} coord
     * */
    movePlayerToCoord(coord) {
        this.movePlayerTo(coord.row, coord.col);
    }

    /**
     * Returns the room at the given position.
     * @assumes The coord is a valid coordinate on the grid
     *
     * @param {number} row the row number
     * @param {number} col the column number
     * @return {Room} the room in the grid.
     * */
    at(row, col) {
        return this.#grid[row][col];
    }

    /**
     * Returns the room at the given position.
     *
     * @assumes The coord is a valid coordinate on the grid
     * @param {Coord} coord
     * @return {Room} the room in the grid.
     * */
    atCoord(coord) {
        return this.at(coord.row, coord.col);
    }

    /**
     *
     * @param {Room} room
     */
    placeRoom(room) {
        if (this.validCoord(room.coord)) {
            this.#grid[room.coord.row][room.coord.col] = room;
        }
    }

    /**
     * Returns whether the given coordinate is valid on the grid.
     *
     * @param {number} row the row number
     * @param {number} col the column number
     * @return {boolean} true if so, false otherwise
     * */
    valid(row, col) {
        return 0 <= row && row < this.#rows && 0 <= col && col < this.#cols;
    }

    /**
     * Returns whether the given coordinate is valid on the grid.
     *
     * @param {Coord} coord
     * @return {boolean} true if so, false otherwise
     * */
    validCoord(coord) {
        return this.valid(coord.row, coord.col);
    }

    /**
     * Sets the current game state
     * @param {GameState} state
     */
    setState(state) {
        this.#currentState = state;
    }

    /**
     * Gets the current game state
     * @return {GameState} current state
     */
    getState() {
        return this.#currentState;
    }

    /**
     * Sets whether the given room on the grid is revealed or not
     *
     * @param {number} row the row number
     * @param {number} col the column number
     * @param {boolean} value
     * */
    #setRevealed(row, col, value) {
        this.at(row, col).revealed = value;
    }

    /**
     * Reveals the given room on the grid
     *
     * @param {number} row the row number
     * @param {number} col the column number
     * */
    #reveal(row, col) {
        this.#setRevealed(row, col, true);
    }

    /**
     * Reveals the given room on the grid
     *
     * @param {number} row the row number
     * @param {number} col the column number
     * */
    #hide(row, col) {
        this.#setRevealed(row, col, false);
    }

    /**
     * Checks whether the given room on the grid is revealed
     *
     * @param {number} row the row number
     * @param {number} col the column number
     * */
    isRevealed(row, col) {
        return this.at(row, col).revealed;
    }

    /**
     Checks whether the given room on the grid is revealed
     *
     * @param {Coord} coord coord
     * */
    isRevealedCoord(coord) {
        return this.isRevealed(coord.row, coord.col);
    }

    /**
     Checks whether the given room on the grid is hidden
     *
     * @param {number} row the row number
     * @param {number} col the column number
     * */
    isHidden(row, col) {
        return !this.isRevealed(row, col);
    }

    /**
     Checks whether the given room on the grid is hidden
     *
     * @param {Coord} coord the coordinate
     * */
    isHiddenCoord(coord) {
        return this.isHidden(coord.row, coord.col);
    }

    /**
     * Retrieves the amount of the selected item in the player resources.
     *  @param {Item} item
     *  */
    getResource(item) {
        return this.#resources[item] ?? 0;
    }

    /**
     * Adds the selected item to the player resources.
     *  @param {Item} item
     *  @param {number} amount
     *  */
    addResource(item, amount = 1) {
        if (!(item in this.#resources)) {
            this.#resources[item] = 0;
        }
        this.#resources[item] += amount;
    }

    /**
     * Removes the selected item from the player resources.
     *  @param {Item} item
     *  @param {number} amount
     *  */
    removeResource(item, amount = 1) {
        if (item in this.#resources) {
            this.#resources[item] -= amount;
            if (this.#resources[item] < 0) {
                this.#resources[item] = 0;
            }
        }
    }

    /**
     * Sets the selected item count in the player resources.
     *  @param {Item} item
     *  @param {number} amount
     *  */
    setResource(item, amount) {
        this.#resources[item] = amount;
    }

    /**
     *
     * @return {{type: Item, count: number}[]}
     */
    getResources() {
        return Object.entries(this.#resources).map(([key, value]) => ({
            /** @type {Item} */
            type: key,
            /** @type {number} */
            count: value
        }));
    }

    pause() {
        this.#running = false;
    }

    play() {
        this.#running = true;
    }

    get isRunning() {
        return this.#running;
    }

    get draft() {
        return this.#draft;
    }

    get lastTimeStamp() {
        return this.#lastTimeStamp;
    }

    set lastTimeStamp(value) {
        this.#lastTimeStamp = value;
    }

    get lastEffect() {
        return this.#lastEffect;
    }

    set lastEffect(value) {
        this.#lastEffect = value;
    }

    /**
     *
     * @return {Room}
     */
    get playerRoom() {
        return this.atCoord(this.#player);
    }

    /**
     *
     * @param {Direction} direction
     * @return {boolean} true if so, false otherwise
     */
    canPlayerDraftTowards(direction) {
        if (!direction) {
            return false;
        }
        /**
         *
         * @type {Coord}
         */
        const neighborCoords = tileTowards(this.player, direction);
        if (!this.validCoord(neighborCoords)) {
            return false;
        }

        /**
         *
         * @type {Room}
         */
        const neighborRoom = this.atCoord(neighborCoords);
        if (neighborRoom.revealed) {
            return false;
        }

        /**
         *
         * @type {Room}
         */
        const playerRoom = this.playerRoom;
        return playerRoom.hallways[direction].enabled && playerRoom.hallways[direction].status === "unknown";
    }
}

/** @type {Game} */
const gameState = new Game();

/**
 * @param {Coord} coord
 * @return {Room}
 * */
const at = (coord) => gameState.atCoord(coord);

/**
 * @param {Coord} x
 * @param {Coord} y
 * @return {Coord}
 * */
const add = (x, y) => ({row: x.row + y.row, col: x.col + y.col});

/** @type {Record<Direction, Coord>} */
const HEX_DIRECTIONS_ODD_Q = {
    NORTH: {row: -1, col: 0},
    NORTH_EAST: {row: 0, col: +1},
    SOUTH_EAST: {row: +1, col: +1},
    SOUTH: {row: +1, col: 0},
    SOUTH_WEST: {row: +1, col: -1},
    NORTH_WEST: {row: 0, col: -1},
};

/** @type {Record<Direction, Coord>} */
const HEX_DIRECTIONS_EVEN_Q = {
    NORTH: {row: -1, col: 0},
    NORTH_EAST: {row: -1, col: +1},
    SOUTH_EAST: {row: 0, col: +1},
    SOUTH: {row: +1, col: 0},
    SOUTH_WEST: {row: 0, col: -1},
    NORTH_WEST: {row: -1, col: -1},
};
/**
 * @param {Coord} position
 * @param {Direction} direction
 * @return {Coord}
 * */
const tileTowards = (position, direction) => {
    /** @type {Coord} */
    const offset = position.col % 2 === 0 ? HEX_DIRECTIONS_EVEN_Q[direction] : HEX_DIRECTIONS_ODD_Q[direction];
    return add(position, offset);
}

const randomRoomPurpose = () => {
    const effects = Object.values(Effects);
    const sum = effects.reduce((acc, r) => acc + r.rarity, 0);
    let roll = randomFloat() * sum;

    for (const r of Object.keys(Effects)) {
        roll -= Effects[r].rarity;
        if (roll <= 0) return r;
    }
    throw new Error();
};

/**
 *  @param {Direction} direction
 * @returns {Direction}
 *  */
const opposite = (direction) => {
    if (direction === "NORTH") return "SOUTH";
    if (direction === "NORTH_EAST") return "SOUTH_WEST";
    if (direction === "SOUTH_EAST") return "NORTH_WEST";
    if (direction === "SOUTH") return "NORTH";
    if (direction === "SOUTH_WEST") return "NORTH_EAST";
    if (direction === "NORTH_WEST") return "SOUTH_EAST";
    throw new Error();
}

/**
 *  @param {Coord} position
 *  @param {Direction} direction
 *  @param {Room} draftRoom
 *  */
const generateHallway = (position, direction, draftRoom) => {
    const chance = 0.4;
    const neighborPos = tileTowards(position, direction);
    if (gameState.validCoord(neighborPos)) {
        if (randomFloat() < chance) {
            const neighbor = at(neighborPos);
            if (gameState.isHiddenCoord(neighborPos)) {
                draftRoom.hallways[direction].enabled = true;
                draftRoom.hallways[direction].status = "unknown";
            } else if (neighbor.hallways[opposite(direction)].enabled) {
                draftRoom.hallways[direction].enabled = true;
                draftRoom.hallways[direction].status = "open";
            } else {
                draftRoom.hallways[direction].enabled = true;
                draftRoom.hallways[direction].status = "blocked";
            }
        } else {
            draftRoom.hallways[direction].enabled = false;
            draftRoom.hallways[direction].status = "blocked";
        }
    } else {
        draftRoom.hallways[direction].enabled = false;
        draftRoom.hallways[direction].status = "blocked";
    }
}

/**
 *  @param {number} index
 *  @param {Direction} direction
 *  */
const generateDraftRoom = (index, direction) => {
    const purpose = randomRoomPurpose();
    const room = gameState.draft.options[index];
    room.events = {
        enter: purpose,
        exit: "noop",
        use: "noop",
    };
    if (purpose === "extraKey") {
        room.items.push("keys");
    } else {
        room.items.length = 0;
    }

    DIRECTION_VALUES.forEach((direction) => {
        generateHallway(gameState.draft.position, direction, room);
    });

    room.hallways[opposite(direction)].enabled = true;
    room.hallways[opposite(direction)].status = "open";
    room.needsKey = purpose !== "extraKey" && randomBool();
    room.coord.row = -1;
    room.coord.col = index;
}

const refreshDrafts = () => {
    const direction = gameState.draft.direction;
    gameState.draft.index = 0;
    let canDraft = true;
    do {
        for (let i = 0; i < gameState.draft.options.length; i++) {
            HEX_TILE_CACHE.delete(coordToString({row: -1, col: i}));
            generateDraftRoom(i, direction);
        }
        canDraft = gameState.getResource("keys") !== 0 || gameState.draft.options.findIndex(room => !room.needsKey) !== -1;
    } while (!canDraft);
}


let playerAnimationIsPlaying = false;
/**
 *  @param {Direction} direction
 */
const updatePlayerPosition = (direction) => {
    if (!gameState.isRunning) return;

    const newPosition = tileTowards(gameState.player, direction);
    if (!gameState.validCoord(newPosition)) return;
    if (gameState.getResource("steps") <= 0) return;
    const hallways = at(gameState.player).hallways;
    if (hallways[direction].enabled && hallways[direction].status !== "blocked") {
        if (gameState.isHiddenCoord(newPosition)) {
            gameState.draft.position = newPosition;
            gameState.draft.direction = direction;
            gameState.setState("draft");
            refreshDrafts();
        } else if (at(newPosition).hallways[opposite(direction)].enabled) {
            at(newPosition).enter();
            gameState.movePlayerToCoord(newPosition);
            gameState.removeResource("steps");
            // TODO move it from here
            renderer.nextSprite();
        }
    }
}

const placeRoom = () => {
    const newRoom = gameState.draft.options[gameState.draft.index].copy();
    if (newRoom.needsKey && gameState.getResource("keys") === 0) {
        return;
    }
    if (newRoom.needsKey) {
        newRoom.needsKey = false;
        gameState.removeResource("keys");
    }
    newRoom.coord.row = gameState.draft.position.row;
    newRoom.coord.col = gameState.draft.position.col;
    gameState.placeRoom(newRoom);
    updatePlayerPosition(gameState.draft.direction);
    gameState.draft.index = 0;
    DIRECTION_VALUES.forEach(direction => {
        const neighborPos = tileTowards(gameState.draft.position, direction);
        if (gameState.validCoord(neighborPos) && gameState.isRevealedCoord(neighborPos)) {
            const neighbor = at(neighborPos);
            if (!newRoom.hallways[direction].enabled && neighbor.hallways[opposite(direction)].enabled) {
                neighbor.hallways[opposite(direction)].status = "blocked";
            } else if (newRoom.hallways[direction].enabled && neighbor.hallways[opposite(direction)].enabled) {
                neighbor.hallways[opposite(direction)].status = "open";
            }
        }
    });
    gameState.setState("move");
};

/**@param {number} delta - the delta time since last update call */
const update = (delta) => {
    for (const tween of animations) {
        if (tween.active) {
            tween.update(delta);
        }
    }
    animations = animations.filter((t) => t.active);
    // gameState.mouseGridRow = -1;
    // gameState.mouseGridCol = -1;
};

class Renderer {
    /** @type {Record<string, Rectangle>} */
    layout;

    /**
     * @type {Point2D}
     */
    mousePosition;

    /**
     * @type {number}
     */
    unitWidth;

    /**
     * @type {number}
     */
    unitHeight;

    /**
     * @type {number}
     */
    canvasWidth;

    /**
     * @type {number}
     */
    canvasHeight;
    /**
     * @type {number}
     */
    gameWidth;

    /**
     * @type {number}
     */
    gameHeight;

    /** @type {HTMLImageElement} */
    spriteSheet;

    // 512 x 854
    // 342 px of "space" above
    // spriteWidth = 512;
    // spriteHeight = 854;

    spriteWidth = 32;
    spriteHeight = 48;

    renderedSpriteRow = 0;
    renderedSpriteCol = 0;

    maxSpriteRow = 5;
    maxSpriteCol = 8;

    useSprites = false;
    displayHallways = true;

    constructor() {
        this.mousePosition = {x: -1, y: -1};
    }

    nextSprite() {
        const spriteCount = this.maxSpriteRow * this.maxSpriteCol;
        const index = (this.renderedSpriteRow * this.maxSpriteCol + this.renderedSpriteCol + 1) % spriteCount;

        this.renderedSpriteRow = Math.floor(index / this.maxSpriteCol);
        this.renderedSpriteCol = index % this.maxSpriteCol;
    }

    isReady() {
        return !RENDER_AREA_HAS_BEEN_RESIZED;
    }
}

/**
 *
 * @param {number} from
 * @param {number} to
 * @param {number} duration
 * @param {(value: number) => void} onUpdate
 * @param {object} options
 */
const tweenLerp = (from, to, duration, onUpdate, options = {}) => {
    //@ts-ignore
    animations.push(new Tween({from, to, duration, onUpdate, ...options}));
};

const fadeIn = (duration, onUpdate, options = {}) => {
    tweenLerp(0, 1, duration, onUpdate, options);
};

const fadeOut = (duration, onUpdate, options = {}) => {
    tweenLerp(1, 0, duration, onUpdate, options);
};

const pulse = (from, to, duration, onUpdate, options = {}) => {
    tweenLerp(from, to, duration, onUpdate, {...options, loop: true, reverse: true});
};

const rotateSpin = (startAngle, endAngle, duration, onUpdate, loop = false, options = {}) => {
    tweenLerp(startAngle, endAngle, duration, onUpdate, {...options, loop});
};


/**
 *
 * @type {Record<FontSize, number>}
 */
const FontSizeFactors = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
};

/**
 * On FULL HD (1920x1080), the 'xs' unit is "12 px" wide, which is (width / 16) / 10 === unitWidth / 10.
 * @param {FontSize} size
 */
const getFontSizeInPixels = (size) => renderer.gameWidth / 160 * FontSizeFactors[size];

/**
 *
 * @param {Hallway} hallway
 * @param {number} midX
 * @param {number} midY
 * @param {number} r
 * @param {Direction} direction
 */
const renderHallway = (hallway, midX, midY, r, direction) => {
    if (!hallway.enabled) return;
    const options = {
        "open": {
            factor: 1.1,
            color: "#A6835B",
        },
        "blocked": {
            factor: 0.5,
            color: CSS_COLOR_NAMES.FireBrick,
        },
        "unknown": {
            factor: 0.75,
            color: "#A6835B",
        }
    }
    const hallwayLength = Math.sqrt(3) * r / 2;
    const factor = options[hallway.status].factor;
    context.fillStyle = options[hallway.status].color;


    context.lineWidth = getFontSizeInPixels("xs") / 2;
    context.strokeStyle = "#69401E";

    const drawRotatedRect = (x, y, width, height, angleRad) => {
        context.save();
        context.translate(x, y);
        context.rotate(angleRad);
        context.strokeRect(-width / 2, -height, width, height);
        context.fillRect(-width / 2, -height, width, height);
        context.restore();
    };
    drawRotatedRect(midX, midY, r / 5, hallwayLength * factor, DIRECTION_VALUES.indexOf(direction) * Math.PI / 3);
};

/**
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {Room} room
 * @param {boolean} borders
 */
const renderHexRoom = (cx, cy, r, room, borders = false) => {
    if (room.revealed) {
        if (renderer.useSprites) {
            renderHexTileImage(cx, cy, r, room.coord, room.events["enter"]);
        } else {
            renderHexagon(cx, cy, r, {
                fill: ROOM_COLORS[room.events.enter],
                ...(borders && {border: CSS_COLOR_NAMES.Wheat, borderWidth: 3}),
            });
        }
        if (room.coord.row === -1 || renderer.displayHallways) {
            DIRECTION_VALUES.forEach((direction) => {
                renderHallway(room.hallways[direction], cx, cy, r, direction);
            });
            renderCircle(cx, cy, r / 5, {fill: CSS_COLOR_NAMES.Lavender, border: "black", borderWidth: 0.5});
        }
    } else if (DEBUG_MODE) {
        renderHexagon(cx, cy, r, undefined,
            {
                fill: CLEAR_COLOR,
                border: CSS_COLOR_NAMES.Wheat,
            });
    }
};


/**
 *
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} radius
 */
const drawRefreshArrow = (centerX, centerY, radius = 50) => {
    const length = radius / 2;
    const items = [{
        startAngle: Math.PI * 0.4,
        endAngle: Math.PI,
        sign: -1,
    },
        {
            startAngle: Math.PI * 1.4,
            endAngle: Math.PI * 2,
            sign: 1,
        }];
    for (const item of items) {
        const startAngle = refreshRotation + item.startAngle;
        const endAngle = refreshRotation + item.endAngle;
        // Draw arc
        context.beginPath();
        context.arc(centerX, centerY, radius, startAngle, endAngle);
        context.strokeStyle = "white";
        context.lineWidth = getFontSizeInPixels("xs") / 3;
        context.stroke();
        context.save();

        context.translate(centerX, centerY);
        context.rotate(refreshRotation);

        context.beginPath();
        const halfBase = length / 2;
        const height = Math.sqrt(3) / 2 * length;

        // Draw triangle relative to center
        context.moveTo(item.sign * radius - halfBase, 0);
        context.lineTo(item.sign * radius + halfBase, 0);
        context.lineTo(item.sign * radius, item.sign * height);

        context.closePath();

        context.fillStyle = "white";
        context.fill();

        context.restore();
    }
}


/**
 *
 * @param {string} label
 * @param {number} centerX
 * @param {number} centerY
 */
const drawKeyLabel = (label, centerX, centerY) => {
    const fontSize = getFontSizeInPixels("sm");
    const paddingX = fontSize / 3;
    const paddingY = fontSize / 5;

    context.save();
    context.font = `${fontSize}px monospace`;
    const textWidth = context.measureText(label).width;

    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;

    context.fillStyle = "#f0f0f0"; // key background
    context.strokeStyle = "#333";  // border color
    context.lineWidth = getFontSizeInPixels("xs") / 10;
    context.fillRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
    context.strokeRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);

    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillStyle = "#333";
    context.lineWidth = getFontSizeInPixels("xs") / 10;
    context.fillText(label, centerX, centerY);
    context.restore();
}

/**
 *
 * @param {Rectangle} zone
 * @param {(width: number, height: number) => void} callback
 */
const renderInLayout = (zone, callback) => {
    context.save();
    context.translate(zone.x, zone.y);
    callback(zone.width, zone.height);
    context.restore();
}

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderMovement = (width, height) => {
    const unitWidth = width / 2;
    const unitHeight = height / 5;

    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = "white";
    context.font = `${getFontSizeInPixels("xl")}px monospace`;
    context.fillText("Controls", width / 2, 0);


    const cx = unitWidth;
    const cy = 2.5 * unitHeight;
    const r = unitWidth * 0.5;
    renderHexagon(cx, cy, r, {fill: ROOM_COLORS.exit});
    DIRECTION_VALUES.forEach((direction) => {
        renderHallway({enabled: true, status: "open"}, cx, cy, r, direction);
    });
    renderCircle(cx, cy, r / 5, {fill: CSS_COLOR_NAMES.Lavender, border: "black", borderWidth: 0.5});
    const controls = ["D", "S", "A", "Q", "W", "E"];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i + 30);
        const x = cx + 1.1 * r * Math.cos(angle);
        const y = cy + 1.1 * r * Math.sin(angle);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        drawKeyLabel(controls[i], x, y);
    }
};

/**
 *
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {number} periods
 * @param {number} amplitude
 */
const renderWavyLine = (startX, startY, endX, endY, periods, amplitude) => {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    context.save();
    context.translate(startX, startY);
    context.rotate(angle);
    context.beginPath();
    context.lineWidth = getFontSizeInPixels("xs") / 5;

    for (let i = 0; i <= length; i++) {
        const waveY = Math.sin((i / length) * 2 * Math.PI * periods) * amplitude;
        const px = i;
        const py = waveY;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
    }
    context.stroke();
    context.restore();
};

/** @type {Map<string, PuzzlePiece>} */
const randomSymbolCache = new Map();

/**
 *
 * @param {string} coords
 * @param {string[]} symbols
 * @param {string[]} altSymbols
 * @return {PuzzlePiece}
 */
const calculateIfAbsent = (coords, symbols, altSymbols) => {
    /** {@type {PuzzlePiece} */
    let value = randomSymbolCache.get(coords);
    if (!value) {
        const lineTypes = ["straight", "wavy", "dotted", "dashed"];
        value = {
            //fillColor: randomColor(),
            fillColor: randomElement(Object.values(ROOM_COLORS)),
            innerSymbol: randomElement(symbols),
            outerSymbol: randomElement(altSymbols),
            lineType: randomElement(lineTypes),
        };
        randomSymbolCache.set(coords, value);
    }
    return value;
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 */
const renderPuzzle = (cx, cy, r) => {

    const lineLength = r / 8;
    const spaceLength = r / 16;
    context.lineCap = 'round';
    const symbols = Object.values(SymbolTexts);
    const altSymbols = Object.values(AltSymbolTexts);

    const coords = coordToString(gameState.player);
    const randomSymbols = calculateIfAbsent(coords, symbols, altSymbols);

    if (context !== null) {
        renderHexTileImage(cx, cy, r, gameState.player, gameState.playerRoom.events["enter"]);
        return;
    }

    // temporarily disabled without linter complaints
    renderHexagon(cx, cy, r, {fill: randomSymbols.fillColor, border: "white", borderWidth: 2});

    context.setLineDash([lineLength, spaceLength]);
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i + 30);
        const x = cx + 0.6 * r * Math.cos(angle);
        const y = cy + 0.6 * r * Math.sin(angle);
        context.font = `${getFontSizeInPixels("sm")}px monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = "white";
        context.fillText(`${randomSymbols.outerSymbol}`, x, y);
    }

    context.setLineDash([]);
    context.strokeStyle = "white";
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i);

        const startX = cx + 1.5 * getFontSizeInPixels("xs") * Math.cos(angle);
        const startY = cy + 1.5 * getFontSizeInPixels("xs") * Math.sin(angle);
        const endX = cx + r * Math.cos(angle);
        const endY = cy + r * Math.sin(angle);

        if (randomSymbols.lineType === "wavy") {
            renderWavyLine(startX, startY, endX, endY, 5, getFontSizeInPixels("xs") / 2);
        } else {
            switch (randomSymbols.lineType) {
                case "straight": {
                    context.lineWidth = getFontSizeInPixels("xs") / 5;
                    context.setLineDash([]);
                    break;
                }
                case "dotted": {
                    context.setLineDash([r / 30]);
                    break;
                }
                case "dashed": {
                    context.setLineDash([r / 5]);
                    break;
                }
            }
            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();
        }
    }
    context.setLineDash([]);
    renderCircle(cx, cy, getFontSizeInPixels("xs"), {fill: "white"});
    context.font = `${getFontSizeInPixels("sm")}px monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    //const symbol = symbols[4];
    context.fillText(`${randomSymbols.innerSymbol}`, cx, cy);
};


/** @type {Map<string, Coord>} */
const HEX_TILE_CACHE = new Map();

/** @type {Record<string, Coord[]>} */
const HEX_TILE_OPTIONS = {
    "extraSteps": [{row: 3, col: 4}],
    "extraKey": [{row: 3, col: 6}],
    "money": [{row: 2, col: 6}],
    "taxes": [{row: 1, col: 2}],
    "garden": [{row: 4, col: 7}],
    "shop": [{row: 1, col: 0}],
    "start": [{row: 4, col: 7}],
    "exit": [{row: 2, col: 7}],
    "noop": [{row: 0, col: 0}],
};

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {Coord} coord
 * @param {RoomEvent} purpose
 */
const renderHexTileImage = (cx, cy, r, coord, purpose) => {
    const tx = renderer.spriteWidth / 2;
    const ty = renderer.spriteHeight - tx;

    const targetWidth = 2 * r;
    const scale = Math.round(targetWidth / renderer.spriteWidth * 100) / 100;
    const targetHeight = renderer.spriteHeight * scale;

    const dx = cx - tx * scale;
    const dy = cy - ty * scale;

    let spriteRow;
    let spriteCol;

    const coordStr = coordToString(coord);
    if (HEX_TILE_CACHE.has(coordStr)) {
        /** @type {Coord} */
        const tile = HEX_TILE_CACHE.get(coordStr);
        spriteRow = tile.row;
        spriteCol = tile.col;
    } else {
        /** @type {Coord} */
        const randomTile = randomElement(HEX_TILE_OPTIONS[purpose]);
        spriteRow = randomTile.row;
        spriteCol = randomTile.col;
        HEX_TILE_CACHE.set(coordStr, randomTile);
    }

    context.drawImage(
        renderer.spriteSheet,
        spriteCol * renderer.spriteWidth,
        spriteRow * renderer.spriteHeight + 1,
        renderer.spriteWidth,
        renderer.spriteHeight,
        dx,
        dy,
        targetWidth,
        targetHeight
    );
}

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderResources = (width, height) => {
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = "white";
    context.font = `${getFontSizeInPixels("md")}px monospace`;
    context.fillText(`Resources`, width / 2, 0);

    context.textAlign = 'left';
    context.font = `${getFontSizeInPixels("sm")}px monospace`;
    const texts = [];
    for (const {type, count} of gameState.getResources()) {
        texts.push(`\u2022 ${ItemTexts[type]} ${type.substring(0, 1).toUpperCase() + type.substring(1)}: ${count}`);
    }

    texts.forEach((text, idx) => {
        context.fillText(text, width / 2.5, (idx + 1) * getFontSizeInPixels("lg"));
    });

    const unitWidth = width / 2;
    const unitHeight = height / 5;

    const cx = unitWidth;
    const cy = 3 * unitHeight;
    const r = unitWidth * 0.5;
    renderPuzzle(cx, cy, r);
};

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderHexGrid = (width, height) => {
    context.strokeStyle = "#CECECE";
    context.lineWidth = getFontSizeInPixels("xs") / 5;
    const cols = gameState.cols;
    const rows = gameState.rows;
    const unitWidth = width / 10;
    const r = unitWidth / 2;

    const spacing = 1.1;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const hexHeight = Math.sqrt(3) * r;
            const rowOffset = hexHeight / 2;
            const cx = (1.5 * col + 1) * r;
            //Shift items in even columns 1 unit down. Center is offset as well.
            const offsetY = ((col % 2) + 1) * rowOffset;
            const cy = (row * hexHeight) + offsetY;
            renderHexRoom(spacing * cx, spacing * cy, r, gameState.at(row, col));
            //renderPuzzle(cx, cy, r);
            if (row === gameState.player.row && col === gameState.player.col) {
                //player, TODO animation
                renderCircle(spacing * cx, spacing * cy, getFontSizeInPixels("xs"), {fill: PLAYER_COLOR});
            }
            if (gameState.mouseGridRow === row && gameState.mouseGridCol === col) {
                /**
                 *
                 * @type {Coord}
                 */
                const currentCoord = {
                    row: row,
                    col: col
                };
                if (DEBUG_MODE) {
                    context.fillStyle = "white";
                    context.textBaseline = 'middle';
                    context.textAlign = 'center';
                    context.fillText(coordToString(currentCoord), spacing * cx, spacing * cy);
                }

                if (gameState.getState() === "move" && gameState.canPlayerDraftTowards(getDirection(gameState.player, currentCoord))) {
                    context.save();
                    context.globalAlpha = selectionAlpha;
                    renderHexagon(spacing * cx, spacing * cy, 0.75 * r, {fill: ROOM_COLORS.draft});
                    context.restore();
                }
            }

            if (gameState.getState() === "draft" && row === gameState.draft.position.row && col === gameState.draft.position.col) {
                context.save();
                context.fillStyle = ROOM_COLORS.draft;
                context.globalAlpha = selectionAlpha;
                renderHexRoom(spacing * cx, spacing * cy, 0.75 * r, gameState.draft.options[gameState.draft.index]);
                context.restore();
            }
        }
    }
}

let selectionAlpha = 1;
let refreshRotation = 0;

/**
 * Converts mouse coordinates to grid coordinates for flat-topped hexes
 * with even columns shifted down and origin at (r, r).
 * @param {number} mouseX
 * @param {number} mouseY
 * @returns {Coord}
 */
const mouseToGrid = (mouseX, mouseY) => {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            /**
             *
             * @type {Coord}
             */
            const coord = {row: row, col: col};
            if (context.isPointInPath(HEX_GRID_PATHS.get(coordToString(coord)), mouseX, mouseY)) {
                return coord;
            }
        }
    }
    return {row: -1, col: -1};
};


/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {{fill?: string, border?: string, borderWidth?: number}} colors
 * @param {{fill?: string, border?: string, borderWidth?: number}} highlight
 * @param {"flat"|"pointy"} orientation
 */
const renderHexagon = (cx, cy, r, colors, highlight = undefined, orientation = "flat") => {
    /*
               r
          +----T----+         ^
         /     |     \        |
        /      |r_i   \       |
       +       X       +      | height
        \             /       |
         \           /        |
          +---------+         v

       <-------------->
              width
     */
    const extraRotation = orientation === "flat" ? 0 : 30;
    context.save();
    context.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i + extraRotation);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }
    context.closePath();
    if (highlight) {
        useColors(highlight);
    } else if (colors) {
        useColors(colors);
    }
    context.restore();
};

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {{fill?: string, border?: string, borderWidth?: number}} colors
 */
const renderCircle = (cx, cy, r, colors) => {
    context.save();
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.closePath();
    useColors(colors);
    context.restore();
};

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderHexDraft = (width, height) => {
    if (gameState.getState() !== "draft") return;
    const row = 0.5;
    const unitWidth = width / 16;
    const unitHeight = height / 2;

    for (let idx = 0; idx < gameState.draft.options.length; ++idx) {
        const col = (3 * idx + 4.5);
        const draftedRoom = gameState.draft.options[idx];

        const cx = col * unitWidth;
        const cy = unitHeight;
        const r = unitWidth * 0.5;

        renderHexRoom(cx, cy, r, draftedRoom, true);
        if (idx === gameState.draft.index) {
            if (Effects[draftedRoom.events.enter].description !== "noop") {
                const textY = (row + 1.25) * unitHeight;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillStyle = "white";
                context.font = `${getFontSizeInPixels("sm")}px monospace`;
                context.fillText(Effects[draftedRoom.events.enter].description, cx, textY);
            }

            if (draftedRoom.needsKey) {
                const iconX = (col - 1.25) * unitWidth;
                const iconY = unitHeight;
                context.font = `${getFontSizeInPixels("lg")}px monospace`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(ItemTexts.lock, iconX, iconY);
            }

            if (draftedRoom.items.includes("keys")) {
                const iconX = (col + 1.25) * unitWidth;
                const iconY = unitHeight;
                context.font = `${getFontSizeInPixels("lg")}px monospace`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(ItemTexts.keys, iconX, iconY);
            }

            const closedRoom = draftedRoom.needsKey && gameState.getResource("keys") === 0;
            context.save();
            context.globalAlpha = selectionAlpha;
            renderHexagon(cx, cy, 1.2 * r, {border: closedRoom ? "red" : "yellow", borderWidth: 6});
            context.restore();
        }
    }

    if (gameState.getResource("gems") >= 2) {
        const arrowX = (14.5 * unitWidth);
        const arrowY = unitHeight;
        drawRefreshArrow(arrowX, arrowY, unitHeight / 3);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = "white";
        context.font = `${getFontSizeInPixels("sm")}px monospace`;
        context.fillText(`2\u00d7${ItemTexts.gems}`, 14.5 * unitWidth, unitHeight);
        context.fillText("[R]", 14.5 * unitWidth, 2 * unitHeight);
    }
}
/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderHints = (width, height) => {
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = "white";
    context.font = `${getFontSizeInPixels("sm")}px monospace`;
    const texts = [
        "Draft rooms by selecting an option and press [Space] or [Enter].",
        "Some rooms are locked behind a key, so look out for them to help on your journey!",
        "Different rooms can help or hinder you. Gems help you refresh your draft options. Spend them wisely!",
        "Red paths are blocked from the other side. Gray ones are yet unvisited, while whites are already known.",
        "Do not be afraid to explore for additional resources!"
    ];
    texts.forEach((text, idx) => {
        context.fillText(text, width / 2, idx * getFontSizeInPixels("lg") + getFontSizeInPixels("xs"));
    });
};

/**
 *
 * @return {Rectangle} the bounding rectangle for the render part
 */
const getPlayArea = () => {
    const aspectRatio = 16 / 9;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const canvasAspect = canvasWidth / canvasHeight;

    if (canvasAspect > aspectRatio) {
        const height = canvasHeight;
        const width = height * aspectRatio;
        const x = (canvasWidth - width) / 2;
        const y = 0;
        return {x, y, width, height};
    } else {
        const width = canvasWidth;
        const height = width / aspectRatio;
        const x = 0;
        const y = (canvasHeight - height) / 2;
        return {x, y, width, height};
    }
};

/**
 * Precalculated map of paths, used to check mouse position against the hexes.
 * @type {Map<string, Path2D>}
 */
const HEX_GRID_PATHS = new Map();


const render = () => {
    if (RENDER_AREA_HAS_BEEN_RESIZED) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        context.imageSmoothingEnabled = false;

        const {x, y, width, height} = getPlayArea();
        const unitWidth = width / 16;
        const unitHeight = height / 9;

        /** @type {Record<string, Rectangle>} */
        const layout = {
            /** @type {Rectangle} */
            draft: {
                x: x,
                y: y,
                width: width,
                height: unitHeight * 2
            },
            /** @type {Rectangle} */
            grid: {
                x: x + unitWidth * 3,
                y: y + unitHeight * 2,
                width: unitWidth * 10,
                height: unitHeight * 5
            },
            /** @type {Rectangle} */
            resources: {
                x: x,
                y: y + unitHeight * 2,
                width: unitWidth * 3,
                height: unitHeight * 5
            },
            /** @type {Rectangle} */
            movement: {
                x: x + unitWidth * 13,
                y: y + unitHeight * 2,
                width: unitWidth * 3,
                height: unitHeight * 5
            },
            /** @type {Rectangle} */
            footer: {
                x: x,
                y: y + unitHeight * 7,
                width: width,
                height: unitHeight * 2
            }
        };

        renderer.layout = layout;
        renderer.unitWidth = unitWidth;
        renderer.unitHeight = unitHeight;
        renderer.canvasWidth = canvas.width;
        renderer.canvasHeight = canvas.height;
        renderer.gameWidth = width;
        renderer.gameHeight = height;
    }
    context.fillStyle = CLEAR_COLOR;
    context.fillRect(0, 0, renderer.canvasWidth, renderer.canvasHeight);

    /** @type {Record<string, Rectangle>} */
    const layout = renderer.layout;

    const rows = gameState.rows;
    const cols = gameState.cols;

    const tileSize = Math.min(128, Math.floor(Math.min(canvas.width / cols, canvas.height / rows)));


    const offsetX = Math.floor((canvas.width - tileSize * cols) / 2);
    const offsetY = Math.floor((canvas.height - tileSize * rows) / 2);

    renderInLayout(layout.draft, renderHexDraft);
    renderInLayout(layout.resources, renderResources);
    renderInLayout(layout.grid, renderHexGrid);
    renderInLayout(layout.movement, renderMovement);
    renderInLayout(layout.footer, renderHints);

    if (DEBUG_MODE) {
        context.strokeStyle = CSS_COLOR_NAMES.Pink;
        context.lineWidth = getFontSizeInPixels("xs") / 5;

        for (const [name, rect] of Object.entries(layout)) {
            context.strokeRect(rect.x, rect.y, rect.width, rect.height);
            context.textAlign = 'left';
            context.textBaseline = 'top';
            context.fillStyle = CSS_COLOR_NAMES.Pink;
            context.font = `${getFontSizeInPixels("sm")}px monospace`;
            context.fillText(`[${name}]`, rect.x + 5, rect.y + 5);
        }
    }

    if (gameState.lastEffect !== "noop") {
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        context.fillStyle = "white";
        context.font = `${getFontSizeInPixels("sm")}px monospace`;
        context.fillText(`${gameState.lastEffect}`, offsetX + cols * tileSize - tileSize / 2, offsetY - tileSize / 2);
    }
    if (RENDER_AREA_HAS_BEEN_RESIZED) {
        HEX_GRID_PATHS.clear();
        const r = renderer.unitWidth / 2;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const hexHeight = Math.sqrt(3) * r;
                const rowOffset = hexHeight / 2;
                const cx = (1.5 * col + 1) * r;
                //Shift items in even columns 1 unit down. Center is offset as well.
                const offsetY = ((col % 2) + 1) * rowOffset;
                const cy = (row * hexHeight) + offsetY;

                const path = new Path2D();
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 180 * (60 * i);
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    if (i === 0) path.moveTo(x, y);
                    else path.lineTo(x, y);
                }
                path.closePath();
                HEX_GRID_PATHS.set(coordToString({row: row, col: col}), path);
            }
        }
    }
    RENDER_AREA_HAS_BEEN_RESIZED = false;
    return true;
};

/**
 *
 * @type {Renderer}
 */
const renderer = new Renderer();

/**
 *
 * @param {MouseEvent} event
 */
const handleMouseMove = (event) => {
    if (!renderer.isReady()) {
        return;
    }
    renderer.mousePosition = {x: event.offsetX, y: event.offsetY};
    const x = event.offsetX - renderer.layout.grid.x;
    const y = event.offsetY - renderer.layout.grid.y;
    const mouseCoord = mouseToGrid(x, y);
    gameState.mouseGridRow = mouseCoord.row;
    gameState.mouseGridCol = mouseCoord.col;
    if (gameState.getState() === "move" && gameState.validCoord(mouseCoord)) {
        if (gameState.canPlayerDraftTowards(getDirection(gameState.player, mouseCoord))) {
            canvas.style.cursor = "pointer";
        } else if (areNeighbors(gameState.player, mouseCoord) && gameState.atCoord(mouseCoord).revealed) {
            canvas.style.cursor = "pointer";
        } else {
            canvas.style.cursor = "default";
        }
    } else {
        canvas.style.cursor = "default";
    }
};

const handleResize = () => {
    RENDER_AREA_HAS_BEEN_RESIZED = true;
};

/**
 *
 * @param {MouseEvent} event
 */
const handleClick = (event) => {
    if (!renderer.isReady()) {
        return;
    }
    if (gameState.getState() === "move") {
        /**
         * @type {Coord}
         */
        const mouseCoord = {row: gameState.mouseGridRow, col: gameState.mouseGridCol};
        if (gameState.validCoord(mouseCoord)) {
            DIRECTION_VALUES.some((direction) => {
                const neighborPos = tileTowards(gameState.player, direction);
                if (areEqualCoords(neighborPos, mouseCoord)) {
                    updatePlayerPosition(direction);
                    return true;
                }
                return false;
            });
        }
    }

    const rectSize = getFontSizeInPixels("sm");
    /** @type {Rectangle} */
    const rect = {
        x: renderer.layout.draft.width - 2 * rectSize,
        y: renderer.layout.draft.y + rectSize,
        width: rectSize,
        height: rectSize,
    };
    if (isInside(renderer.mousePosition.x, renderer.mousePosition.y, rect)) {
        renderer.useSprites = !renderer.useSprites;
    }

};

/** @typedef {GameState | "global"} HotkeyScope */
/**
 * Represents the active state of a keyboard hotkey and its behavior in the game.
 */
class GameKeyInput {
    /**
     * The scope in which the hotkey is active.
     * Examples: `"global"`, `"movement"`, `"drafting"`.
     * @type {HotkeyScope}
     */
    scope;

    /**
     * A short, human-readable name for the hotkey.
     * @type {string}
     */
    name;

    /**
     * A detailed description of what the hotkey does.
     * @type {string}
     */
    description;

    /**
     * The actual key value as detected by the keyboard event.
     * Example: `"W"`, `"ArrowUp"`, `Q`. Multivalue is supported
     * @type {string[]}
     */
    keys;

    /**
     * The function to execute when this hotkey is triggered.
     * @type {() => void}
     */
    handler;

    /**
     * Creates a new GameKeyInput definition.
     *
     * @param {HotkeyScope} scope - The scope in which the hotkey is active.
     * @param {string} name - A short, human-readable name for the hotkey.
     * @param {string} description - A detailed description of what the hotkey does.
     * @param {string[]} keys - The actual key value as detected by the keyboard event.
     * @param {() => void} handler - The function to execute when this hotkey is triggered.
     */
    constructor(scope, name, description, keys, handler) {
        this.scope = scope;
        this.name = name;
        this.description = description;
        this.keys = keys;
        this.handler = handler;
    }
}

/**
 * Handles registering and processing keyboard hotkeys for the game.
 */
class InputHandler {
    /**
     * @type {Map<HotkeyScope, GameKeyInput[]>}
     * Keys are scope names, values are arrays of GameKeyInput objects.
     */
    hotkeysByScope = new Map();

    /**
     * Registers a new hotkey.
     * @param {...GameKeyInput} args - The hotkey definitions to register.
     */
    register = (...args) => {
        args.forEach(hotkey => {
            if (!this.hotkeysByScope.has(hotkey.scope)) {
                this.hotkeysByScope.set(hotkey.scope, []);
            }
            this.hotkeysByScope.get(hotkey.scope).push(hotkey);
        });
    }

    /**
     * Finds and runs the matching hotkey handler for the given key event.
     * Global scope is checked first.
     * @param {KeyboardEvent} event
     */
    handleKeydown = (event) => {
        const globalHotkeys = this.hotkeysByScope.get("global") || [];
        const globalMatch = globalHotkeys.find(h => h.keys.includes(event.key));

        if (globalMatch) {
            event.preventDefault();
            globalMatch.handler();
            return; // skip scope check if global handled it
        }

        // 2️⃣ Then check the active scope
        const scopeHotkeys = this.hotkeysByScope.get(gameState.getState()) || [];
        const scopeMatch = scopeHotkeys.find(h => h.keys.includes(event.key));

        if (scopeMatch) {
            event.preventDefault();
            scopeMatch.handler();
        }
    }
}

/** @type {InputHandler} */
const inputHandler = new InputHandler();

let lastFrameTime = performance.now();
/**
 *
 * @param {number} timestamp - timestamp since last call
 */
const gameLoop = (timestamp) => {
    const delta = timestamp - lastFrameTime;
    const fps = 1000 / delta;
    lastFrameTime = timestamp;
    gameState.lastTimeStamp = timestamp;
    update(timestamp);
    if (!render()) {
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = CSS_COLOR_NAMES.Red;
        context.font = `${getFontSizeInPixels("sm")}px monospace`;
        context.fillText("Play area not suitable for this game, buy a proper display.", canvas.width / 2, canvas.height / 2);
    } else {
        context.textAlign = 'left';
        context.textBaseline = 'top';
        context.fillStyle = CSS_COLOR_NAMES.Pink;
        context.font = `${getFontSizeInPixels("sm")}px monospace`;
        context.fillText(`FPS: ${Math.round(fps)}`, renderer.layout.draft.x, renderer.layout.draft.y);


        const rectSize = getFontSizeInPixels("sm");
        /** @type {Rectangle} */
        const rect = {
            x: renderer.layout.draft.width - 2 * rectSize,
            y: renderer.layout.draft.y + rectSize,
            width: rectSize,
            height: rectSize,
        };
        context.fillStyle = renderer.useSprites ? CSS_COLOR_NAMES.Wheat : CSS_COLOR_NAMES.MediumVioletRed;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
        if (isInside(renderer.mousePosition.x, renderer.mousePosition.y, rect)) {
            canvas.style.cursor = 'pointer';
        }
    }
    requestAnimationFrame(gameLoop);
}

const setup = () => {
    document.addEventListener("keydown", inputHandler.handleKeydown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleClick);
    window.addEventListener("resize", handleResize);

    inputHandler.register(
        {
            keys: ["h"],
            name: "Toggle Debug Mode",
            description: "Toggles Debug Mode on or off",
            scope: "global",
            handler: () => {
                DEBUG_MODE = !DEBUG_MODE;
            }
        },
        {
            keys: ["t"],
            name: "Toggle Sprite Mode",
            description: "Toggles Sprite Mode on or off",
            scope: "global",
            handler: () => {
                renderer.useSprites = !renderer.useSprites;
            }
        },
        {
            keys: ["u"],
            name: "Toggle Hallway Mode",
            description: "Toggles Hallway Mode on or off",
            scope: "global",
            handler: () => {
                renderer.displayHallways = !renderer.displayHallways;
            }
        },
        {
            keys: ["g"],
            name: "Add 5 Gems",
            description: "Adds 5 gems to the player inventory",
            scope: "global",
            handler: () => {
                gameState.addResource("gems", 5);
            }
        },
        {
            keys: ["k"],
            name: "Add 5 Keys",
            description: "Adds 5 keys to the player inventory",
            scope: "global",
            handler: () => {
                gameState.addResource("keys", 5);
            }
        }
    );
    inputHandler.register(
        {
            keys: ["w", "ArrowUp"],
            name: "Move North",
            description: "Move the player north",
            scope: "move",
            handler: () => updatePlayerPosition("NORTH"),
        },
        {
            keys: ["e"],
            name: "Move North-East",
            description: "Move the player north-east",
            scope: "move",
            handler: () => updatePlayerPosition("NORTH_EAST"),
        },
        {
            keys: ["d"],
            name: "Move South-East",
            description: "Move the player south-east",
            scope: "move",
            handler: () => updatePlayerPosition("SOUTH_EAST"),
        },
        {
            keys: ["s", "ArrowDown"],
            name: "Move South",
            description: "Move the player south",
            scope: "move",
            handler: () => updatePlayerPosition("SOUTH"),
        },
        {
            keys: ["a"],
            name: "Move South-West",
            description: "Move the player south-west",
            scope: "move",
            handler: () => updatePlayerPosition("SOUTH_WEST"),
        },
        {
            keys: ["q"],
            name: "Move North-West",
            description: "Move the player north-west",
            scope: "move",
            handler: () => updatePlayerPosition("NORTH_WEST"),
        },
        {
            keys: ["r"],
            name: "Restart Game",
            description: "Start a new game",
            scope: "move",
            handler: () => gameState.newGame(),
        }
    );

    inputHandler.register(
        {
            keys: ["d", "ArrowRight"],
            name: "Next Draft Option",
            description: "Move draft selection to the next option",
            scope: "draft",
            handler: () => {
                gameState.draft.index = clamp(
                    gameState.draft.index + 1,
                    0,
                    gameState.draft.options.length - 1
                );
            },
        },
        {
            keys: ["a", "ArrowLeft"],
            name: "Previous Draft Option",
            description: "Move draft selection to the previous option",
            scope: "draft",
            handler: () => {
                gameState.draft.index = clamp(
                    gameState.draft.index - 1,
                    0,
                    gameState.draft.options.length - 1
                );
            },
        },
        {
            keys: [" ", "Enter"],
            name: "Place Room",
            description: "Place the selected room",
            scope: "draft",
            handler: () => placeRoom(),
        },
        {
            keys: ["r"],
            name: "Refresh Draft",
            description: "Refresh draft options by spending 2 gems",
            scope: "draft",
            handler: () => {
                if (gameState.getResource("gems") >= 2) {
                    gameState.removeResource("gems", 2);
                    refreshDrafts();
                }
            },
        }
    );

};

const run = async () => {
    setup();
    renderer.spriteSheet = new Image();
    renderer.spriteSheet.src = "./hextiles.png";
    renderer.spriteSheet.onload = () => {
        gameLoop(0);
    };
};

run().then(() => console.log("Game started."));