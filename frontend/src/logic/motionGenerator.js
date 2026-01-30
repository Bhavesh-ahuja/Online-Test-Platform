/**
 * motionGenerator.js
 * 
 * Logic for generating solvability-guaranteed Motion Challenge puzzles on a 4x6 grid.
 * Uses a Reverse Search or Random+Solve approach.
 * 
 * Grid: 4 (width) x 6 (height)
 * Coordinates: x (0..3), y (0..5)
 */

const GRID_WIDTH = 4;
const GRID_HEIGHT = 6;

export const ItemTypes = {
    EMPTY: 0,
    TARGET: 1, // The ball
    BLOCK: 2,  // Movable block
    WALL: 3,   // Immovable block
};

// Utils
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Check if a rect overlaps with any existing items
const isOverlap = (item, items) => {
    return items.some(existing => {
        return (
            item.x < existing.x + existing.w &&
            item.x + item.w > existing.x &&
            item.y < existing.y + existing.h &&
            item.y + item.h > existing.y
        );
    });
};

const isOutOfBounds = (item) => {
    return (
        item.x < 0 || item.y < 0 ||
        item.x + item.w > GRID_WIDTH ||
        item.y + item.h > GRID_HEIGHT
    );
};

const serializeState = (items) => {
    // Sort items by ID for canonical state
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify(sorted.map(i => ({ id: i.id, x: i.x, y: i.y })));
};

const covers = (item, pos) => {
    return (
        pos.x >= item.x && pos.x < item.x + item.w &&
        pos.y >= item.y && pos.y < item.y + item.h
    );
};

const getSlideDistance = (item, dir, allItems) => {
    let dist = 0;
    let currX = item.x;
    let currY = item.y;

    while (true) {
        const nextX = currX + dir.dx;
        const nextY = currY + dir.dy;

        // 1. Boundary Check
        if (nextX < 0 || nextY < 0 || nextX + item.w > GRID_WIDTH || nextY + item.h > GRID_HEIGHT) {
            break;
        }

        // 2. Collision Check
        const testItem = { ...item, x: nextX, y: nextY };
        const collision = allItems.some(other => {
            if (other.id === item.id) return false;
            return isOverlap(testItem, [other]);
        });

        if (collision) break;

        currX = nextX;
        currY = nextY;
        dist++;
    }

    return dist;
};

const getValidMoves = (items) => {
    const validMoves = [];
    const directions = [
        { dx: 0, dy: -1, dir: 'UP' },
        { dx: 0, dy: 1, dir: 'DOWN' },
        { dx: -1, dy: 0, dir: 'LEFT' },
        { dx: 1, dy: 0, dir: 'RIGHT' }
    ];

    items.forEach((item) => {
        if (item.type === ItemTypes.WALL) return;

        directions.forEach(d => {
            const dist = getSlideDistance(item, d, items);
            if (dist > 0) {
                validMoves.push({
                    itemId: item.id,
                    ...d,
                    dist
                });
            }
        });
    });
    return validMoves;
};

const applyMove = (items, move) => {
    return items.map(item => {
        if (item.id === move.itemId) {
            return {
                ...item,
                x: item.x + (move.dx * move.dist),
                y: item.y + (move.dy * move.dist)
            };
        }
        return item;
    });
};

// BFS Solver to check solvability
const solvePuzzle = (initialItems, exitPos) => {
    // Only movable items matter for state
    const queue = [{ items: initialItems, moves: 0, path: [] }];
    const visited = new Set();
    visited.add(serializeState(initialItems));

    const MAX_DEPTH = 60;
    let head = 0;

    while (head < queue.length) {
        const current = queue[head++];

        if (current.moves > MAX_DEPTH) continue;

        // Check win
        const target = current.items.find(i => i.type === ItemTypes.TARGET);
        if (target.x === exitPos.x && target.y === exitPos.y) {
            return current.path;
        }

        // Generate moves
        const moves = getValidMoves(current.items);

        for (const move of moves) {
            const nextItems = applyMove(current.items, move);
            const key = serializeState(nextItems);
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({
                    items: nextItems,
                    moves: current.moves + 1,
                    path: [...current.path, move]
                });
            }
        }

        if (queue.length > 20000) return null;
    }
    return null;
};

const generateRandomLayout = (difficulty, exitPos) => {
    // Cap blocks at 6 for 4x6 grid.
    const numBlocks = Math.min(3 + Math.floor(difficulty / 2), 6);
    const numWalls = difficulty > 4 ? (Math.random() > 0.8 ? 1 : 0) : 0;
    const suffix = Math.random().toString(36).substring(7);

    let items = [];

    // 1. Place Target
    let targetPlaced = false;
    while (!targetPlaced) {
        const t = {
            id: `target-${suffix}`, type: ItemTypes.TARGET,

            x: getRandomInt(0, GRID_WIDTH - 1),
            y: getRandomInt(0, 3),
            w: 1, h: 1, color: 'red'
        };
        if (t.x !== exitPos.x || t.y !== exitPos.y) {
            items.push(t);
            targetPlaced = true;
        }
    }

    // 2. Place Walls
    for (let i = 0; i < numWalls; i++) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            const wall = {
                id: `wall-${i}-${suffix}`, type: ItemTypes.WALL,
                x: getRandomInt(0, GRID_WIDTH - 1),
                y: getRandomInt(0, GRID_HEIGHT - 1),
                w: 1, h: 1, color: 'grey'
            };
            if (!isOverlap(wall, items) && (wall.x !== exitPos.x || wall.y !== exitPos.y)) {
                items.push(wall);
                placed = true;
            }
            attempts++;
        }
    }

    // 3. Place Blocks
    for (let i = 0; i < numBlocks; i++) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            const isVertical = Math.random() > 0.6;
            const w = isVertical ? 1 : 2;
            const h = isVertical ? 2 : 1;

            const block = {
                id: `block-${i}-${suffix}`, type: ItemTypes.BLOCK,
                x: getRandomInt(0, GRID_WIDTH - w),
                y: getRandomInt(0, GRID_HEIGHT - h),
                w, h,
                // Random colors
                color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][getRandomInt(0, 4)]
            };

            if (!isOverlap(block, items)) {
                items.push(block);
                placed = true;
            }
            attempts++;
        }
    }
    return items;
};

// Randomized Fallback that is guaranteed to change
const generateSimpleFallback = (exitPos) => {
    const suffix = Date.now() + '-' + Math.random().toString(36).substring(7);
    const items = [];

    // 1. Place Target randomly in top-left quadrant
    const target = {
        id: `target-${suffix}`, type: ItemTypes.TARGET,
        x: getRandomInt(0, 1),
        y: getRandomInt(0, 1),
        w: 1, h: 1, color: 'red'
    };
    items.push(target);

    // 2. Place 3 small random blocks in safe spots
    for (let i = 0; i < 3; i++) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const block = {
                id: `fallback-${i}-${suffix}`, type: ItemTypes.BLOCK,
                x: getRandomInt(0, GRID_WIDTH - 1),
                y: getRandomInt(0, GRID_HEIGHT - 1),
                w: 1, h: 1, color: 'blue'
            };
            // Ensure no overlap and not blocking exit directly (simple heuristic)
            if (!isOverlap(block, items) && (block.x !== exitPos.x || block.y !== exitPos.y)) {
                items.push(block);
                placed = true;
            }
            attempts++;
        }
    }

    return { items, minMoves: 1, exitPos };
};

const refineBoardUntilSolvable = (difficulty) => {
    const MAX_ATTEMPTS = 500;

    // Try to generate at requested difficulty
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const exitPos = getRandomExitPos(); // Dynamic Exit per attempt
        const newItems = generateRandomLayout(difficulty, exitPos);
        const solution = solvePuzzle(newItems, exitPos);

        const minMovesReq = Math.min(difficulty + 1, 8);
        if (solution && solution.length >= minMovesReq) {
            return { items: newItems, minMoves: solution.length, exitPos };
        }
    }

    // Recursive Fallback
    if (difficulty > 1) {
        return refineBoardUntilSolvable(difficulty - 1);
    }

    // Final Fallback
    const exitPos = getRandomExitPos();
    return generateSimpleFallback(exitPos);
};

// Pick a random spot on the perimeter
const getRandomExitPos = () => {
    const perimeter = [];
    // Top and Bottom rows
    for (let x = 0; x < GRID_WIDTH; x++) {
        perimeter.push({ x, y: 0 });
        perimeter.push({ x, y: GRID_HEIGHT - 1 });
    }
    // Left and Right cols (excluding corners already added? Set handles uniqueness or just careful loop)
    for (let y = 1; y < GRID_HEIGHT - 1; y++) {
        perimeter.push({ x: 0, y });
        perimeter.push({ x: GRID_WIDTH - 1, y });
    }
    return perimeter[getRandomInt(0, perimeter.length - 1)];
};

// Generate a random valid puzzle
export const generatePuzzle = (difficultyLevel = 1) => {
    return refineBoardUntilSolvable(difficultyLevel);
};
