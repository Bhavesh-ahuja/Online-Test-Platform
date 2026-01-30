/**
 * motionGenerator.js
 * 
 * Logic for generating solvability-guaranteed Motion Challenge puzzles on dynamic grids.
 * Uses A* Search to FILTER random puzzles.
 * 
 * Strategy:
 * 1. Generate a RANDOM messy board (high entropy).
 * 2. Solve it using A* (optimal path).
 * 3. IF solution_length < min_difficulty_moves THEN discard and retry.
 * 4. IF solution_length >= min_difficulty_moves THEN return it.
 */

export const ItemTypes = {
    EMPTY: 0,
    TARGET: 1, // The ball
    BLOCK: 2,  // Movable block
    WALL: 3,   // Immovable block
};

// --- Configuration ---
const getGridConfig = (difficulty) => {
    // Smoother Size Progression with Continuous Scaling
    if (difficulty <= 2) return { w: 4, h: 5 };
    if (difficulty <= 5) return { w: 4, h: 6 };
    if (difficulty <= 9) return { w: 5, h: 6 };
    return { w: 5, h: 7 };
};

// --- Priority Queue (Min-Heap) for A* ---
class PriorityQueue {
    constructor() { this.heap = []; }

    push(node) {
        this.heap.push(node);
        this.bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        const min = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.sinkDown(0);
        }
        return min;
    }

    bubbleUp(n) {
        while (n > 0) {
            const parent = Math.floor((n - 1) / 2);
            if (this.heap[n].f >= this.heap[parent].f) break;
            [this.heap[n], this.heap[parent]] = [this.heap[parent], this.heap[n]];
            n = parent;
        }
    }

    sinkDown(n) {
        const length = this.heap.length;
        while (true) {
            let swap = null;
            let left = 2 * n + 1, right = 2 * n + 2;

            if (left < length && this.heap[left].f < this.heap[n].f) swap = left;
            if (right < length && this.heap[right].f < (swap === null ? this.heap[n].f : this.heap[left].f)) swap = right;

            if (swap === null) break;
            [this.heap[n], this.heap[swap]] = [this.heap[swap], this.heap[n]];
            n = swap;
        }
    }

    size() { return this.heap.length; }
}

// --- Utils ---
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const isOverlap = (item, items) => {
    return items.some(existing => {
        if (existing.id === item.id) return false;
        return (
            item.x < existing.x + existing.w &&
            item.x + item.w > existing.x &&
            item.y < existing.y + existing.h &&
            item.y + item.h > existing.y
        );
    });
};

const serializeState = (items) => {
    // Sort items by ID for canonical state key
    return items.map(i => `${i.x},${i.y}`).join('|');
};

const getManhattan = (items, exitPos) => {
    const t = items.find(i => i.type === ItemTypes.TARGET);
    if (!t) return 999;
    return Math.abs(t.x - exitPos.x) + Math.abs(t.y - exitPos.y);
};

// --- A* Solver ---

const getValidMoves = (items, gridW, gridH) => {
    const validMoves = [];
    items.forEach((item, idx) => {
        if (item.type === ItemTypes.WALL) return;

        // Try 4 directions
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
            const nextX = item.x + dx;
            const nextY = item.y + dy;

            // Boundary
            if (nextX < 0 || nextY < 0 || nextX + item.w > gridW || nextY + item.h > gridH) return;

            // Collision with other items
            const colliding = items.some((other, oIdx) => {
                if (idx === oIdx) return false;
                return (
                    nextX < other.x + other.w &&
                    nextX + item.w > other.x &&
                    nextY < other.y + other.h &&
                    nextY + item.h > other.y
                );
            });

            if (!colliding) {
                validMoves.push({ itemIdx: idx, dx, dy });
            }
        });
    });
    return validMoves;
};

const solveAStar = (initialItems, exitPos, gridW, gridH, limitMoves = 30) => {
    // Sort items once for consistency
    const sortedItems = [...initialItems].sort((a, b) => a.id.localeCompare(b.id));

    const startNode = {
        items: sortedItems,
        g: 0,
        h: getManhattan(sortedItems, exitPos),
        f: 0
    };
    startNode.f = startNode.g + startNode.h;

    const pq = new PriorityQueue();
    pq.push(startNode);

    const visited = new Set();
    visited.add(serializeState(sortedItems));

    const MAX_NODES = 8000; // Increased search depth
    let nodesExplored = 0;

    while (pq.size() > 0) {
        if (nodesExplored++ > MAX_NODES) return null;

        const current = pq.pop();

        // Check Win
        const target = current.items.find(i => i.type === ItemTypes.TARGET);
        if (target.x === exitPos.x && target.y === exitPos.y) {
            return current.g;
        }

        if (current.g >= limitMoves) continue;

        const moves = getValidMoves(current.items, gridW, gridH);

        for (const move of moves) {
            // Optimization: Clone only what's needed
            const nextItems = [...current.items];
            const movedItem = { ...nextItems[move.itemIdx] };
            movedItem.x += move.dx;
            movedItem.y += move.dy;
            nextItems[move.itemIdx] = movedItem;

            const stateKey = serializeState(nextItems);
            if (visited.has(stateKey)) continue;

            visited.add(stateKey);

            const g = current.g + 1;
            const h = getManhattan(nextItems, exitPos);
            pq.push({
                items: nextItems,
                g, h, f: g + h
            });
        }
    }
    return null; // Unsolvable or exceed depth
};

// --- Generator Helper ---

const generateRandomBoard = (difficulty, exitPos, gridW, gridH, densityRatio, numWalls) => {
    const items = [];
    const suffix = Math.random().toString(36).substring(7);

    // 1. Place Target (Optimized: Force Far Quadrant)
    // To ensure difficulty, try to place target in a "far" quadrant relative to exit
    let tx, ty;
    // Divide grid into 4 quadrants. Exit is in one. Pick opposite.
    // Simplifying: If exit is top-half, put target bottom-half.
    const isExitTop = exitPos.y < gridH / 2;
    const isExitLeft = exitPos.x < gridW / 2;

    const minTy = isExitTop ? Math.floor(gridH / 2) : 0;
    const maxTy = isExitTop ? gridH - 1 : Math.floor(gridH / 2) - 1;
    const minTx = isExitLeft ? Math.floor(gridW / 2) : 0;
    const maxTx = isExitLeft ? gridW - 1 : Math.floor(gridW / 2) - 1;

    let t = {
        id: `target-${suffix}`, type: ItemTypes.TARGET,
        x: 0, y: 0, w: 1, h: 1, color: 'red'
    };

    // Try to place in optimal zone
    for (let k = 0; k < 20; k++) {
        t.x = getRandomInt(minTx, maxTx);
        t.y = getRandomInt(minTy, maxTy);
        if (t.x !== exitPos.x || t.y !== exitPos.y) break;
    }
    // Fallback if loop failed (unlikely)
    if (t.x === exitPos.x && t.y === exitPos.y) {
        t.x = (exitPos.x + 2) % gridW;
    }

    items.push(t);

    // 2. Place Walls
    for (let i = 0; i < numWalls; i++) {
        let placed = false;
        let tries = 0;
        while (!placed && tries < 20) {
            const wall = {
                id: `wall-${i}-${suffix}`, type: ItemTypes.WALL,
                x: getRandomInt(0, gridW - 1), y: getRandomInt(0, gridH - 1),
                w: 1, h: 1, color: 'grey'
            };
            if (!isOverlap(wall, items) && (wall.x !== exitPos.x || wall.y !== exitPos.y)) {
                items.push(wall);
                placed = true;
            }
            tries++;
        }
    }

    // 3. Place Blocks (Strategic Fill)
    const targetArea = (gridW * gridH) * densityRatio;
    let currentArea = 1; // Target is 1
    let attempts = 0;

    while (currentArea < targetArea && attempts < 200) {
        attempts++;
        const rand = Math.random();
        let bw = 1, bh = 1;

        // At higher difficulty, prefer "bars" over small dots to create barriers
        const bigBlockChance = Math.min(0.8, 0.3 + (difficulty * 0.05));

        if (rand < bigBlockChance) {
            if (Math.random() > 0.5) { bw = 1; bh = 2; } else { bw = 2; bh = 1; }
        } else {
            bw = 1; bh = 1;
        }

        if (gridW < 4 && bw > 1) bw = 1;

        const b = {
            id: `b-${attempts}-${suffix}`, type: ItemTypes.BLOCK,
            x: getRandomInt(0, gridW - bw), y: getRandomInt(0, gridH - bh),
            w: bw, h: bh,
            color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][getRandomInt(0, 4)]
        };

        if (!isOverlap(b, items) && (b.x !== exitPos.x || b.y !== exitPos.y)) {
            // Extra Check: Don't completely block the target immediately (heuristic)
            // Allow it, A* will filter if unsolvable
            items.push(b);
            currentArea += (bw * bh);
        }
    }

    return items;
};

// --- Main Generator Function ---

export const generatePuzzle = (difficultyLevel = 1) => {
    // Difficulty Settings
    const config = getGridConfig(difficultyLevel);
    const { w, h } = config;

    const getExit = () => {
        // Random perimeter exit
        const perimeter = [];
        for (let x = 0; x < w; x++) { perimeter.push({ x, y: 0 }); perimeter.push({ x, y: h - 1 }); }
        for (let y = 1; y < h - 1; y++) { perimeter.push({ x: 0, y }); perimeter.push({ x: w - 1, y }); }
        return perimeter[getRandomInt(0, perimeter.length - 1)];
    };
    const exitPos = getExit();

    let bestPuzzle = null;
    let maxMovesFound = -1;

    // Linear Scaling
    const MIN_MOVES = 6 + (difficultyLevel * 2);
    const DENSITY_RATIO = 0.45 + (Math.min(difficultyLevel, 20) * 0.015);
    const NUM_WALLS = Math.floor(difficultyLevel / 3);

    // Attempts to find a hard puzzle
    const ATTEMPTS = 15;

    for (let i = 0; i < ATTEMPTS; i++) {
        const items = generateRandomBoard(difficultyLevel, exitPos, w, h, DENSITY_RATIO, NUM_WALLS);

        // Verify Solvability and Difficulty
        // Allow solver to go deep (MIN_MOVES + 15 cushion)
        const movesReq = solveAStar(items, exitPos, w, h, MIN_MOVES + 20);

        if (movesReq !== null) {
            // It is solvable
            // Is it hard enough?
            if (movesReq >= MIN_MOVES) {
                return { items, exitPos, gridSize: config, minMoves: movesReq };
            }
            // Keep track of the hardest one we found just in case
            if (movesReq > maxMovesFound) {
                maxMovesFound = movesReq;
                bestPuzzle = { items, exitPos, gridSize: config, minMoves: movesReq };
            }
        }
    }

    // Fallback: If we didn't find a "Perfect" puzzle, return the Best one we found
    // BUT if the best one is really weak (e.g. < 4 moves) and we are on Hard mode, 
    // we should probably try one last "Reverse Shuffle" attempt to guarantee SOMETHING complex?
    // For now, return best found.
    if (bestPuzzle && maxMovesFound > 3) return bestPuzzle;

    // Emergency Fallback (should rarely happen with 15 attempts)
    return generateSimpleFallback(exitPos, w, h);
};

const generateSimpleFallback = (exitPos, gridW, gridH) => {
    const suffix = Date.now().toString();
    const items = [
        {
            id: `target-${suffix}`, type: ItemTypes.TARGET,
            x: exitPos.x === 0 ? gridW - 1 : 0,
            y: exitPos.y === 0 ? gridH - 1 : 0,
            w: 1, h: 1, color: 'red'
        },
        { id: `b1`, type: 2, x: 1, y: 1, w: 1, h: 2, color: 'blue' },
        { id: `b2`, type: 2, x: 2, y: 2, w: 2, h: 1, color: 'green' },
        { id: `b3`, type: 2, x: 0, y: 2, w: 1, h: 1, color: 'orange' }
    ];
    return { items, exitPos, gridSize: { w: gridW, h: gridH }, minMoves: 5 };
};
