import { generatePuzzle } from '../src/utils/geoSudoGenerator.js';
import { analyzeDeduction, countAnchors } from '../src/utils/geoSudoGenerator.js';

async function runTest() {
    console.log("--- GeoSudo ESM Logic Verification ---");

    const levels = [1, 5, 10, 20, 32];
    for (const level of levels) {
        try {
            const seed = "test-seed-" + level + "-" + Date.now();
            const result = generatePuzzle(level, seed);

            // Re-calculate to verify
            const metrics = analyzeDeduction(result.grid, result.questionRow, result.questionCol, result.shapes);
            const anchors = countAnchors(result.grid);

            console.log(`Level ${level}: Depth=${metrics.depth} (${metrics.method}), Anchors=${anchors}`);

            if (level <= 5) {
                // Check triviality: Row and Col of target row must have < 3 knowns
                const rowKnowns = result.grid[result.questionRow].filter(c => c !== null).length;
                let colKnowns = 0;
                for (let r = 0; r < 4; r++) if (result.grid[r][result.questionCol] !== null) colKnowns++;

                if (rowKnowns === 3 || colKnowns === 3) {
                    console.error(`!!! FAIL: Level ${level} is trivial (Row: ${rowKnowns}, Col: ${colKnowns})`);
                }
            }

            if (level >= 16) {
                if (anchors > 0) console.error(`!!! FAIL: Level ${level} has ${anchors} anchors`);
                if (metrics.depth < 3) console.warn(`!!! WARN: Level ${level} depth is only ${metrics.depth}`);
            }
        } catch (e) {
            console.error(`Error at Level ${level}:`, e.message);
            // If it's RangeError, log the stack
            if (e instanceof RangeError) console.error(e.stack);
        }
    }
    console.log("--- Verification Complete ---");
}

runTest();
