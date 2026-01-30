/**
 * motionGenerator.js
 * 
 * Logic for generating solvability-guaranteed Motion Challenge puzzles on dynamic grids.
 * Support 3x5, 4x6, 5x7 based on difficulty.
 */

// Grid Dimensions are now dynamic based on difficulty
const getGridConfig = (difficulty) => {
    if (difficulty <= 2) return { w: 3, h: 5 }; // Easy
    if (difficulty <= 5) return { w: 4, h: 6 }; // Medium
    return { w: 5, h: 7 }; // Hard
};

export const ItemTypes = {
    EMPTY: 0,
    TARGET: 1, // The ball
    BLOCK: 2,  // Movable block
    WALL: 3,   // Immovable block
};

// Utils
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

const getSlideDistance = (item, dir, allItems, gridW, gridH) => {
    let dist = 0;
    let currX = item.x;
    let currY = item.y;

    while (true) {
        const nextX = currX + dir.dx;
        const nextY = currY + dir.dy;

        // 1. Boundary Check
        if (nextX < 0 || nextY < 0 || nextX + item.w > gridW || nextY + item.h > gridH) {
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

const getValidMoves = (items, gridW, gridH) => {
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
            const dist = getSlideDistance(item, d, items, gridW, gridH);
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

const serializeState = (items) => {
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify(sorted.map(i => ({ id: i.id, x: i.x, y: i.y })));
};

// BFS Solver
const solvePuzzle = (initialItems, exitPos, gridW, gridH) => {
    const queue = [{ items: initialItems, moves: 0, path: [] }];
    const visited = new Set();
    visited.add(serializeState(initialItems));

    const MAX_DEPTH = 60;
    let head = 0;

    while (head < queue.length) {
        const current = queue[head++];
        if (current.moves > MAX_DEPTH) continue;

        const target = current.items.find(i => i.type === ItemTypes.TARGET);
        if (target.x === exitPos.x && target.y === exitPos.y) {
            return current.path;
        }

        const moves = getValidMoves(current.items, gridW, gridH);

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

const generateRandomLayout = (difficulty, exitPos, gridW, gridH) => {
    const numBlocks = Math.min(3 + Math.floor(difficulty / 2), 8);
    const numWalls = difficulty > 4 ? (Math.random() > 0.8 ? 1 : 0) : 0;
    const suffix = Math.random().toString(36).substring(7);

    let items = [];

    // 1. Place Target
    let targetPlaced = false;
    while (!targetPlaced) {
        const t = {
            id: `target-${suffix}`, type: ItemTypes.TARGET,
            x: getRandomInt(0, gridW - 1),
            y: getRandomInt(0, Math.floor(gridH / 2)),
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
                x: getRandomInt(0, gridW - 1),
                y: getRandomInt(0, gridH - 1),
                w: 1, h: 1, color: 'grey'
            };
            if (!isOverlap(wall, items) && (wall.x !== exitPos.x || wall.y !== exitPos.y)) {
                items.push(wall);
                placed = true;
            }
            attempts++;
        }
    }

    // 3. Place Blocks with Variety
    for (let i = 0; i < numBlocks; i++) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            // New Block Types: 1x1, 1x2, 2x1, 2x2
            const rand = Math.random();
            let w = 1, h = 1;

            if (rand < 0.2) { w = 1; h = 1; } // Small
            else if (rand < 0.5) { w = 1; h = 2; } // Vertical
            else if (rand < 0.8) { w = 2; h = 1; } // Horizontal
            else { w = 2; h = 2; } // Big Square

            // Cap size if grid is small
            if (gridW < 4 && w > 1) w = 1;

            const block = {
                id: `block-${i}-${suffix}`, type: ItemTypes.BLOCK,
                x: getRandomInt(0, gridW - w),
                y: getRandomInt(0, gridH - h),
                w, h,
                color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][getRandomInt(0, 4)]
            };

            if (!isOverlap(block, items) && (block.x !== exitPos.x || block.y !== exitPos.y)) {
                items.push(block);
                placed = true;
            }
            attempts++;
        }
    }
    return items;
};

const getRandomExitPos = (w, h) => {
    const perimeter = [];
    for (let x = 0; x < w; x++) {
        perimeter.push({ x, y: 0 });
        perimeter.push({ x, y: h - 1 });
    }
    for (let y = 1; y < h - 1; y++) {
        perimeter.push({ x: 0, y });
        perimeter.push({ x: w - 1, y });
    }
    return perimeter[getRandomInt(0, perimeter.length - 1)];
};

const generateSimpleFallback = (exitPos, gridW, gridH) => {
    const suffix = Date.now() + '-' + Math.random().toString(36).substring(7);
    const items = [];

    const target = {
        id: `target-${suffix}`, type: ItemTypes.TARGET,
        x: getRandomInt(0, 1),
        y: getRandomInt(0, 1),
        w: 1, h: 1, color: 'red'
    };
    items.push(target);

    for (let i = 0; i < 3; i++) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const block = {
                id: `fallback-${i}-${suffix}`, type: ItemTypes.BLOCK,
                x: getRandomInt(0, gridW - 1),
                y: getRandomInt(0, gridH - 1),
                w: 1, h: 1, color: 'blue'
            };
            if (!isOverlap(block, items) && (block.x !== exitPos.x || block.y !== exitPos.y)) {
                items.push(block);
                placed = true;
            }
            attempts++;
        }
    }

    return { items, minMoves: 1, exitPos, gridSize: { w: gridW, h: gridH } };
};

const refineBoardUntilSolvable = (difficulty) => {
    const config = getGridConfig(difficulty);
    const MAX_ATTEMPTS = 500;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const exitPos = getRandomExitPos(config.w, config.h);
        const newItems = generateRandomLayout(difficulty, exitPos, config.w, config.h);
        const solution = solvePuzzle(newItems, exitPos, config.w, config.h);

        const minMovesReq = Math.min(difficulty + 1, 8);
        if (solution && solution.length >= minMovesReq) {
            return { items: newItems, minMoves: solution.length, exitPos, gridSize: config };
        }
    }

    if (difficulty > 1) {
        return refineBoardUntilSolvable(difficulty - 1);
    }

    const exitPos = getRandomExitPos(config.w, config.h);
    return generateSimpleFallback(exitPos, config.w, config.h);
};

export const generatePuzzle = (difficultyLevel = 1) => {
    return refineBoardUntilSolvable(difficultyLevel);
};
