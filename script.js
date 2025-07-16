// @ts-check
// noinspection UnnecessaryLocalVariableJS

let DEBUG_MODE = false;
/**
 * A coordinate on the grid, identified by its row and column.
 * @typedef {{row: number, col: number}} Coord
 *  */

/**
 * Rectangle drawn on the canvas
 * @typedef {{x: number, y: number, width: number, height: number}} Rectangle
 *  */

/**
 * A hallway, connecting rooms. Hallways are not necessarily present in a room, in this case they are not enabled.
 * Otherwise, depending on what's on the _other side_, their status can differ.
 * @typedef {{status: "unknown" | "open" | "blocked", enabled: boolean }} Hallway
 *  */

/**
 * Direction of movement on the grid
 * @typedef {"UP"|"DOWN"|"LEFT"|"RIGHT"} Direction
 */

/**
 * Events related to room activities
 * @typedef {"enter"|"exit"|"use"} RoomEvent
 */
/**
 * What can be found in a room
 * @typedef {"keys"|"gems"|"steps"} Item
 */

/** @type {Record<Item, string>} */
const ItemTexts = {
    "keys": "🔑",
    "gems": "💎",
    "steps": "👣",
};

/**
 * A room effect, which can trigger when the player enters or leaves it, or "uses" the room.
 * Some can trigger on each invocation, some only once. These are bound to the effects, not the rooms.
 * @typedef {{ invoke: () => void, description: string, triggerText: string, triggerLimit: number, rarity: number }} Effect
 *  */
/** @type {Record<string, Effect>} */
const Effects = {
    "extraSteps":
        {
            invoke: () => gameState.steps += 2,
            description: "Take a rest.",
            triggerText: "You have gained 2 extra steps.",
            triggerLimit: -1,
            rarity: 0.5,
        },
    "extraKey":
        {
            invoke: () => addInventoryItem("keys"),
            description: "Alohomora.",
            triggerText: "You have found a key.",
            triggerLimit: 1,
            rarity: 0.3,
        },
    "money":
        {
            invoke: () => addInventoryItem("gems"),
            description: "What's that spark in the corner?",
            triggerText: "You have found a gem.",
            triggerLimit: 1,
            rarity: 0.3,
        },
    "taxes":
        {
            invoke: () => removeInventoryItem("gems"),
            description: "Takes a toll on you.",
            triggerText: `You have to pay taxes: ${ItemTexts.gems}`,
            triggerLimit: -1,
            rarity: 0.3,
        },
    "garden":
        {
            invoke: () => gameState.steps = 41,
            description: "Like starting again.",
            triggerText: "Your steps have been reset.",
            triggerLimit: -1,
            rarity: 0.4,
        },
    "shop":
        {
            invoke: () => {
                if (getInventoryItemCount("gems") >= 5) {
                    addInventoryItem("keys");
                    removeInventoryItem("gems", 5);
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
                gameState.isRunning = false;
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
     * ease: (value: number) => number,
     * onUpdate: (value: number) => void,
     * onComplete: () => void,
     * loop: boolean,
     * reverse: boolean,
     * type: string
     * }} values
     */
    constructor({from, to, duration, ease = t => t, onUpdate, onComplete, loop = false, reverse = false, type}) {
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

        // console.log(`Updating with value ${value} of type ${this.type}`);
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

    /** @param {{events: Record<RoomEvent, string>, hallways: Record<Direction, Hallway>, revealed: boolean, triggerCount: number, needsKey: boolean, items: Item[]} | undefined} values */
    constructor(values = undefined) {
        if (!!values) {
            this.events = values.events;
            this.hallways = values.hallways;
            this.revealed = values.revealed;
            this.triggerCount = values.triggerCount;
            this.needsKey = values.needsKey;
            this.items = values.items;
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
            UP: {status: "unknown", enabled: true},
            DOWN: {status: "unknown", enabled: true},
            LEFT: {status: "unknown", enabled: true},
            RIGHT: {status: "unknown", enabled: true},
        };
        this.revealed = false;
        this.triggerCount = 0;
        this.needsKey = false;
        this.items = [];

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
};

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

/**
 *
 * @param {number} value
 * @param {number} lower
 * @param {number} upper
 * @returns {number} the clamped value
 */
const clamp = (value, lower, upper) => value < lower ? lower : value > upper ? upper : value;

const sleep = (duration = 1000) => new Promise(r => setTimeout(r, duration));

const DIRECTIONS = {
    UP: {row: -1, col: 0},
    DOWN: {row: 1, col: 0},
    LEFT: {row: 0, col: -1},
    RIGHT: {row: 0, col: 1},
    NONE: {row: 0, col: 0},
};

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

const gameState = {
    /** @type {Room[][]} */
    grid: [],
    /** @type {number} */
    rows: 5,
    /** @type {number} */
    cols: 10,
    /** @type {Coord} */
    player: {row: 2, col: 0},
    /** @type {Coord} */
    exit: {row: 2, col: 9},
    /** @type {boolean} */
    isRunning: true,
    /** @type {number} */
    steps: 40,
    /** @type {string} */
    lastEffect: "noop",
    /** @type {"move"|"draft"} */
    currentState: "move",
    /** @type {{index: number, position: Coord, direction: Direction, options: Room[] }} */
    draft: {
        index: 0,
        direction: "RIGHT",
        position: {
            row: 0,
            col: 0,
        },
        options: []
    },
    /** @type {Record<Item, number>} */
    inventory: {
        keys: 0,
        gems: 0,
        steps: 0,
    },
    /** @type {number} */
    lastTimeStamp: 0,
};

/** @param {Coord} coord */
const valid = (coord) => coord.row >= 0 && coord.row < gameState.rows && coord.col >= 0 && coord.col < gameState.cols;

/**
 * @param {Coord} coord
 * @return {Room}
 * */
const at = (coord) => gameState.grid[coord.row][coord.col];

/** @param {Coord} coord */
const hidden = (coord) => valid(coord) && !at(coord).revealed;

/**
 * @param {Coord} x
 * @param {Coord} y
 * @return {Coord}
 * */
const add = (x, y) => ({row: x.row + y.row, col: x.col + y.col});

const randomRoomPurpose = () => {
    const effects = Object.values(Effects);
    const sum = effects.reduce((acc, r) => acc + r.rarity, 0);
    let roll = Math.random() * sum;

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
    if (direction === "DOWN") return "UP";
    if (direction === "UP") return "DOWN";
    if (direction === "LEFT") return "RIGHT";
    if (direction === "RIGHT") return "LEFT";
    throw new Error();
}

const newGame = () => {
    gameState.grid = Array.from({length: gameState.rows},
        () => Array.from({length: gameState.cols},
            () => (new Room()))
    );

    gameState.player = {row: 2, col: 0};
    at(gameState.player).events = {
        enter: "noop",
        exit: "noop",
        use: "noop",
    };
    at(gameState.player).revealed = true;
    at(gameState.player).hallways = {
        UP: {status: "unknown", enabled: true},
        DOWN: {status: "unknown", enabled: true},
        RIGHT: {status: "unknown", enabled: true},
        LEFT: {status: "blocked", enabled: true},
    };
    gameState.exit = {row: 2, col: 9};
    at(gameState.exit).events = {
        enter: "exit",
        exit: "noop",
        use: "noop",
    };
    at(gameState.exit).revealed = true;
    at(gameState.exit).hallways = {
        UP: {status: "unknown", enabled: true},
        DOWN: {status: "unknown", enabled: true},
        RIGHT: {status: "blocked", enabled: true},
        LEFT: {status: "unknown", enabled: true},
    };
    gameState.isRunning = true;
    gameState.steps = 40;
    gameState.lastEffect = "";
    gameState.currentState = "move";
    gameState.draft = {
        index: 0,
        position: {
            row: 0,
            col: 0,
        },
        direction: "UP",
        options: [
            new Room(),
            new Room(),
            new Room(),
        ]
    };
    gameState.draft.options.forEach(draft => draft.revealed = true);
    gameState.inventory = {
        "keys": 1,
        "gems": 0,
        "steps": 0,
    };
};

/**
 * Retrieves the amount of the selected item in the player inventory.
 *  @param {Item} item
 *  */
const getInventoryItemCount = (item) => gameState.inventory[item] ?? 0;

/**
 * Adds the selected item to the player inventory.
 *  @param {Item} item
 *  @param {number} amount
 *  */
const addInventoryItem = (item, amount = 1) => {
    if (!(item in gameState.inventory)) {
        gameState.inventory[item] = 0;
    }
    gameState.inventory[item] += amount;
}

/**
 * Adds the selected item to the player inventory.
 *  @param {Item} item
 *  @param {number} amount
 *  */
const removeInventoryItem = (item, amount = 1) => {
    if (item in gameState.inventory) {
        gameState.inventory[item] -= amount;
        if (gameState.inventory[item] < 0) {
            gameState.inventory[item] = 0;
        }
    }
}

/**
 *  @param {Coord} position
 *  @param {Direction} direction
 *  @param {Room} draftRoom
 *  */
const generateHallway = (position, direction, draftRoom) => {
    const chance = 0.4;
    const neighborPos = add(position, DIRECTIONS[direction]);
    if (valid(neighborPos)) {
        if (Math.random() < chance) {
            const neighbor = at(neighborPos);
            if (hidden(neighborPos)) {
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

    generateHallway(gameState.draft.position, "UP", room);
    generateHallway(gameState.draft.position, "DOWN", room);
    generateHallway(gameState.draft.position, "LEFT", room);
    generateHallway(gameState.draft.position, "RIGHT", room);

    room.hallways[opposite(direction)].enabled = true;
    room.hallways[opposite(direction)].status = "open";
    room.needsKey = purpose !== "extraKey" && Math.random() < 0.5;

}

const refreshDrafts = () => {
    const direction = gameState.draft.direction;
    gameState.draft.index = 0;
    let canDraft = true;
    do {
        generateDraftRoom(0, direction);
        generateDraftRoom(1, direction);
        generateDraftRoom(2, direction);
        canDraft = getInventoryItemCount("keys") !== 0 || gameState.draft.options.findIndex(room => !room.needsKey) !== -1;
    } while (!canDraft);
}


let playerAnimationIsPlaying = false;
/**
 *  @param {Direction} direction
 */
const updatePlayerPosition = (direction) => {
    if (!gameState.isRunning) return;

    const newPosition = add(gameState.player, DIRECTIONS[direction]);
    if (!valid(newPosition)) return;
    if (gameState.steps <= 0) return;
    const hallways = at(gameState.player).hallways;
    if (hallways[direction].enabled && hallways[direction].status !== "blocked") {
        if (hidden(newPosition)) {
            gameState.draft.position = newPosition;
            gameState.draft.direction = direction;
            gameState.currentState = "draft";
            refreshDrafts();
            return;
        } else if (at(newPosition).hallways[opposite(direction)].enabled) {
            at(newPosition).enter();
            gameState.player = newPosition;
            gameState.steps -= 1;
        }
    }
}

const placeRoom = () => {
    const newRoom = gameState.draft.options[gameState.draft.index].copy();
    if (newRoom.needsKey && getInventoryItemCount("keys") === 0) {
        return;
    }
    if (newRoom.needsKey) {
        newRoom.needsKey = false;
        removeInventoryItem("keys");
    }
    gameState.grid[gameState.draft.position.row][gameState.draft.position.col] = newRoom;
    updatePlayerPosition(gameState.draft.direction);
    gameState.draft.index = 0;
    /** @type {Direction[]} */
    const dirs = ["UP", "DOWN", "LEFT", "RIGHT"];
    dirs.forEach(direction => {
        const neighborPos = add(gameState.draft.position, DIRECTIONS[direction]);
        if (valid(neighborPos) && !hidden(neighborPos)) {
            const neighbor = at(neighborPos);
            if (!newRoom.hallways[direction].enabled && neighbor.hallways[opposite(direction)].enabled) {
                neighbor.hallways[opposite(direction)].status = "blocked";
            } else if (newRoom.hallways[direction].enabled && neighbor.hallways[opposite(direction)].enabled) {
                neighbor.hallways[opposite(direction)].status = "open";
            }
        }
    });

    gameState.currentState = "move";
};

/**@param {number} delta - the delta time since last update call */
const update = (delta) => {
    for (const tween of animations) {
        if (tween.active) {
            tween.update(delta);
        }
    }
    animations = animations.filter((t) => t.active);
};

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
 * @param {Hallway} hallway
 * @param {number} midX
 * @param {number} midY
 * @param {number} unitWidth
 * @param {number} unitHeight
 * @param {"UP" | "DOWN" | "RIGHT" | "LEFT"} direction
 */
const renderHallway = (hallway, midX, midY, unitWidth, unitHeight, direction) => {
    if (!hallway.enabled) return;
    const options = {
        "open": {
            factor: 2,
            color: CSS_COLOR_NAMES.Lavender,
        },
        "blocked": {
            factor: 5,
            color: CSS_COLOR_NAMES.FireBrick,
        },
        "unknown": {
            factor: 3,
            color: "#e6e6e6",
        }
    }
    const factor = options[hallway.status].factor;
    context.fillStyle = options[hallway.status].color;

    context.lineWidth = 1;
    context.strokeStyle = "black";

    const lineWidth = Math.max(10, Math.floor(unitWidth / 10));
    const lineHeight = Math.max(10, Math.floor(unitHeight / 10));

    if (direction === "UP") {
        context.strokeRect(midX - lineWidth / 2, midY - unitHeight / factor, lineWidth, unitHeight / factor);
        context.fillRect(midX - lineWidth / 2, midY - unitHeight / factor, lineWidth, unitHeight / factor);
    }
    if (direction === "DOWN") {
        context.strokeRect(midX - lineWidth / 2, midY, lineWidth, unitHeight / factor);
        context.fillRect(midX - lineWidth / 2, midY, lineWidth, unitHeight / factor);
    }
    if (direction === "RIGHT") {
        context.strokeRect(midX, midY - lineHeight / 2, unitWidth / factor, lineHeight);
        context.fillRect(midX, midY - lineHeight / 2, unitWidth / factor, lineHeight);
    }
    if (direction === "LEFT") {
        context.strokeRect(midX - unitWidth / factor, midY - lineHeight / 2, unitWidth / factor, lineHeight);
        context.fillRect(midX - unitWidth / factor, midY - lineHeight / 2, unitWidth / factor, lineHeight);
    }
};

/**
 *
 * @param {Coord} coord
 * @param {number} unitWidth
 * @param {number} unitHeight
 * @param {Room} room
 */
const renderRoom = (coord, unitWidth, unitHeight, room) => {
    if (!room.revealed) return;
    const hallways = room.hallways;

    const roomX = (coord.col * unitWidth);
    const roomY = (coord.row * unitHeight);

    context.fillStyle = ROOM_COLORS[room.events.enter];
    context.fillRect(roomX, roomY, unitWidth, unitHeight);


    const midX = roomX + unitWidth / 2;
    const midY = roomY + unitHeight / 2;

    context.beginPath();
    context.arc(midX, midY, 14.5, 0, Math.PI * 2);
    context.fillStyle = "black";
    context.fill();

    context.globalAlpha = 1; // reset
    renderHallway(hallways.UP, midX, midY, unitWidth, unitHeight, "UP");
    renderHallway(hallways.DOWN, midX, midY, unitWidth, unitHeight, "DOWN");
    renderHallway(hallways.LEFT, midX, midY, unitWidth, unitHeight, "LEFT");
    renderHallway(hallways.RIGHT, midX, midY, unitWidth, unitHeight, "RIGHT");

    context.beginPath();
    context.arc(midX, midY, 14, 0, Math.PI * 2);
    context.fillStyle = CSS_COLOR_NAMES.Lavender;
    context.fill();
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
        context.lineWidth = 3;
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
    const paddingX = 8;
    const paddingY = 5;
    const fontSize = 20;

    context.font = `${fontSize}px monospace`;
    const textWidth = context.measureText(label).width;

    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;

    // Draw background rectangle (like a key)
    context.fillStyle = "#f0f0f0"; // key background
    context.strokeStyle = "#333";  // border color
    context.lineWidth = 1;
    context.fillRect(centerX, centerY, boxWidth, boxHeight);
    context.strokeRect(centerX, centerY, boxWidth, boxHeight);

    // Draw text centered
    context.fillStyle = "#000";
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillText(label, centerX + boxWidth / 2, centerY + boxHeight / 2);
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
const renderGoal = (width, height) => {
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = "white";
    context.font = "32px Consolas";
    context.fillText(`Draft your way to the exit! Can you reach it? Watch your steps!`, width / 2, 25);
    context.font = "25px monospace";
    context.fillText(`Steps left: ${gameState.steps}`, width / 2, height / 2);
};

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderInventory = (width, height) => {
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = "white";
    context.font = "25px monospace";
    context.fillText(`Inventory`, width / 2, 0);

    context.textAlign = 'left';
    context.font = "20px monospace";
    const texts = [];
    for (const [key, value] of Object.entries(gameState.inventory)) {
        texts.push(`\u2022 ${ItemTexts[key]} ${key.substring(0, 1).toUpperCase() + key.substring(1)}: ${value}`);
    }

    texts.forEach((text, idx) => {
        context.fillText(text, width / 2.5, (idx + 1) * 30 + 10);
    });
};

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderPlayer = (width, height) => {
    const unitWidth = width / gameState.cols;
    const unitHeight = height / gameState.rows;

    //player
    const playerX = gameState.player.col * unitWidth;
    const playerY = gameState.player.row * unitHeight;

    context.beginPath();
    context.arc(playerX + unitWidth / 2, playerY + unitHeight / 2, 10, 0, Math.PI * 2);
    context.fillStyle = PLAYER_COLOR;
    context.fill();
};

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderGrid = (width, height) => {
    const unitWidth = width / gameState.cols;
    const unitHeight = height / gameState.rows;
    context.strokeStyle = "#CECECE";
    context.lineWidth = 2;

    const cols = gameState.cols;
    // Vertical lines
    if (DEBUG_MODE) {
        for (let col = 0; col <= cols; ++col) {
            const x = col * unitWidth;
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.stroke();
        }
    }
    const rows = gameState.rows;
    // Horizontal lines
    if (DEBUG_MODE) {
        for (let row = 0; row <= rows; ++row) {
            const y = row * unitHeight;
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
    }

    // rooms
    for (let row = 0; row < gameState.rows; ++row) {
        for (let col = 0; col < gameState.cols; ++col) {
            const coord = {row: row, col: col};
            renderRoom(coord, unitWidth, unitHeight, gameState.grid[row][col]);
        }
    }

    renderPlayer(width, height);

    if (gameState.currentState === "draft") {
        context.save();
        const pendingRadius = 20;
        const roomX = (gameState.draft.position.col * unitWidth + pendingRadius);
        const roomY = (gameState.draft.position.row * unitHeight + pendingRadius);
        context.fillStyle = ROOM_COLORS.draft;
        context.globalAlpha = selectionAlpha;
        context.fillRect(roomX, roomY, unitWidth - 2 * pendingRadius, unitHeight - 2 * pendingRadius);
        context.fillStyle = "white";
        context.font = "50px 'Sans-Sarif'";
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText("?",
            (gameState.draft.position.col + 0.5) * unitWidth,
            (gameState.draft.position.row + 0.5) * unitHeight);
        context.restore();
    }
};

let selectionAlpha = 1;
let refreshRotation = 0;
/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderDraft = (width, height) => {
    if (gameState.currentState !== "draft") return;

    const unitWidth = width / 16;
    const unitHeight = height / 2;

    for (let idx = 0; idx < gameState.draft.options.length; ++idx) {
        const row = 0.5;
        const col = (3 * idx + 4.5);
        const coord = {row: row, col: col};
        const draftedRoom = gameState.draft.options[idx];

        if (idx === gameState.draft.index) {
            if (Effects[draftedRoom.events.enter].description !== "noop") {
                const textX = 2.5 * unitWidth;
                const textY = (row - 0.25) * unitHeight;
                context.textAlign = 'right';
                context.textBaseline = 'middle';
                context.fillStyle = "white";
                context.font = "25px Consolas";
                context.fillText(Effects[draftedRoom.events.enter].description, textX, textY);
            }

            if (draftedRoom.needsKey) {
                const iconX = (col - 0.5) * unitWidth;
                const iconY = unitHeight;
                context.font = "50px monospace";
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText("🔒", iconX, iconY);
            }
            if (draftedRoom.items.includes("keys")) {
                const iconX = (col + 1.5) * unitWidth;
                const iconY = unitHeight;
                context.font = "50px monospace";
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(ItemTexts.keys, iconX, iconY);
            }
            // @ts-ignore
            const borderPadding = 8;
            const x = col * unitWidth - borderPadding;
            const y = row * unitHeight - borderPadding;
            const borderWidth = unitWidth + 2 * borderPadding;
            const borderHeight = unitHeight + 2 * borderPadding;
            context.save();
            if (draftedRoom.needsKey && getInventoryItemCount("keys") === 0) {
                context.strokeStyle = "red";
            } else {
                context.strokeStyle = "yellow";
            }
            context.lineWidth = 6;
            context.globalAlpha = selectionAlpha;
            context.strokeRect(x, y, borderWidth, borderHeight);
            context.restore();
        }

        renderRoom(coord, unitWidth, unitHeight, draftedRoom);

    }

    if (getInventoryItemCount("gems") >= 2) {
        const arrowX = (14.5 * unitWidth);
        const arrowY = unitHeight;
        drawRefreshArrow(arrowX, arrowY, unitHeight / 3);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = "white";
        context.font = "26px monospace";
        context.fillText(`2\u00d7${ItemTexts.gems}`, 14.5 * unitWidth, unitHeight);
        context.fillText("[R]", 14.5 * unitWidth, 2 * unitHeight);
    }

};

/**
 *
 * @param {number} width
 * @param {number} height
 */
const renderMovementAndHints = (width, height) => {
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = "white";
    context.font = "20px monospace";
    const texts = [
        "Move with arrows or [W][A][S][D]. Draft rooms by selecting an option and press [Space] or [Enter].",
        "Some rooms are locked behind a key, so look out for them to help on your journey!",
        "Different rooms can help or hinder you. Gems help you refresh your draft options. Spend them wisely!",
        "Red paths are blocked from the other side. Gray ones are yet unvisited, while whites are already known.",
        "Do not be afraid to explore for additional resources!"
    ];
    const innerUnitHeight = height / texts.length;
    texts.forEach((text, idx) => {
        context.fillText(text, width / 2, idx * innerUnitHeight + 10);
    });
};

const render = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const unitWidth = canvas.width / 16;
    const unitHeight = canvas.height / 9;

    const layout = {
        /** @type {Rectangle} */
        draft: {
            x: 0,
            y: 0,
            width: canvas.width,
            height: unitHeight * 2
        },
        /** @type {Rectangle} */
        grid: {
            x: unitWidth * 3,
            y: unitHeight * 2,
            width: unitWidth * 10,
            height: unitHeight * 5
        },
        /** @type {Rectangle} */
        inventory: {
            x: 0,
            y: unitHeight * 2,
            width: unitWidth * 3,
            height: unitHeight * 5
        },
        /** @type {Rectangle} */
        header: {
            x: unitWidth * 13,
            y: unitHeight * 2,
            width: unitWidth * 3,
            height: unitHeight * 5
        },
        /** @type {Rectangle} */
        footer: {
            x: 0,
            y: unitHeight * 7,
            width: canvas.width,
            height: unitHeight * 2
        }
    };

    const rows = gameState.rows;
    const cols = gameState.cols;

    const tileSize = Math.min(128, Math.floor(Math.min(canvas.width / cols, canvas.height / rows)));

    context.fillStyle = "#1D1D1D";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // drawKeyLabel("W", 150, 150);
    // drawKeyLabel("A", 180, 150);
    // drawKeyLabel("S", 210, 150);
    // drawKeyLabel("D", 240, 150);


    const offsetX = Math.floor((canvas.width - tileSize * cols) / 2);
    const offsetY = Math.floor((canvas.height - tileSize * rows) / 2);

    renderInLayout(layout.header, renderGoal);
    renderInLayout(layout.inventory, renderInventory);
    renderInLayout(layout.grid, renderGrid);
    renderInLayout(layout.draft, renderDraft);
    renderInLayout(layout.footer, renderMovementAndHints);

    if (DEBUG_MODE) {
        context.strokeStyle = CSS_COLOR_NAMES.Pink;
        context.lineWidth = 2;

        for (const [name, rect] of Object.entries(layout)) {
            context.strokeRect(rect.x, rect.y, rect.width, rect.height);
            context.textAlign = 'left';
            context.textBaseline = 'top';
            context.fillStyle = CSS_COLOR_NAMES.Pink;
            context.font = "25px monospace";
            context.fillText(`[${name}]`, rect.x + 5, rect.y + 5);
        }
    }

    if (gameState.currentState + "sdf" === "draft") {

    } else {
        if (gameState.lastEffect !== "noop") {
            context.textAlign = 'right';
            context.textBaseline = 'middle';
            context.fillStyle = "white";
            context.font = "25px Consolas";
            context.fillText(`${gameState.lastEffect}`, offsetX + cols * tileSize - tileSize / 2, offsetY - tileSize / 2);
        }
    }

};

/**
 *
 * @param {KeyboardEvent} event
 */
const handleInput = (event) => {
    if (gameState.currentState === "move") {
        switch (event.key) {
            case "ArrowDown":
            case "s":
                updatePlayerPosition("DOWN");
                break;
            case "ArrowUp":
            case "w":
                updatePlayerPosition("UP");
                break;
            case "ArrowLeft":
            case "a":
                updatePlayerPosition("LEFT");
                break;
            case "ArrowRight":
            case "d":
                updatePlayerPosition("RIGHT");
                break;
            case "r":
                newGame();
                break;
            case "h":
                DEBUG_MODE = !DEBUG_MODE;
                break;
            case "g":
                addInventoryItem("gems", 5);
                break;
            case "k":
                addInventoryItem("keys", 5);
                break;
        }
    } else {
        switch (event.key) {
            case "ArrowRight":
            case "d":
                gameState.draft.index = clamp(gameState.draft.index + 1, 0, gameState.draft.options.length - 1);
                break;
            case "ArrowLeft":
            case "a":
                gameState.draft.index = clamp(gameState.draft.index - 1, 0, gameState.draft.options.length - 1);
                break;
            case " ":
            case "Enter":
                placeRoom();
                break;
            case "r":
                if (getInventoryItemCount("gems") >= 2) {
                    removeInventoryItem("gems", 2);
                    refreshDrafts();
                }
                break;
            case "h":
                DEBUG_MODE = !DEBUG_MODE;
                break;
            case "g":
                addInventoryItem("gems", 5);
                break;
            case "k":
                addInventoryItem("keys", 5);
                break;
        }
    }
}

/**
 *
 * @param {number} timestamp - timestamp since last call
 */
const gameLoop = (timestamp) => {
    gameState.lastTimestamp = timestamp;
    update(timestamp);
    render();
    requestAnimationFrame(gameLoop);
}

const run = async () => {
    document.addEventListener("keydown", handleInput);
    newGame();

    gameLoop(0);
};

run();