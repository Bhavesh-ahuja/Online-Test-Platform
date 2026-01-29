const fs = require('fs');
const path = require('path');

// Helper to create a sandbox
function runGeneratorTest() {
    console.log("--- GeoSudo Logic Verification ---");

    // 1. Read the necessary files
    const configPath = path.join(__dirname, '../src/config/geoSudoConfig.js');
    const generatorPath = path.join(__dirname, '../src/utils/geoSudoGenerator.js');
    const enginePath = path.join(__dirname, '../src/utils/geoSudoEngine.js');

    let configContent = fs.readFileSync(configPath, 'utf8');
    let generatorContent = fs.readFileSync(generatorPath, 'utf8');
    let engineContent = fs.readFileSync(enginePath, 'utf8');

    // Remove 'export' and 'import' for Node eval
    configContent = configContent.replace(/export /g, '');
    engineContent = engineContent.replace(/export /g, '');
    generatorContent = generatorContent.replace(/import .* from .*/g, '');
    generatorContent = generatorContent.replace(/export /g, '');

    // Context for eval
    const context = {};
    const fullCode = `
        ${configContent}
        ${engineContent}
        ${generatorContent}
        
        function testDifficulty(level) {
            const result = generatePuzzle(level, "test-seed-" + Date.now());
            const metrics = analyzeDeduction(result.grid, result.questionRow, result.questionCol, result.shapes);
            const anchors = countAnchors(result.grid);
            return {
                level,
                depth: metrics.depth,
                method: metrics.method,
                anchors,
                grid: result.grid
            };
        }
        
        // Run tests
        const levels = [1, 5, 10, 20, 32];
        const results = levels.map(l => testDifficulty(l));
        JSON.stringify(results, null, 2);
    `;

    try {
        const resultsJson = eval(fullCode);
        const results = JSON.parse(resultsJson);

        results.forEach(r => {
            console.log(`Level ${r.level}: Depth=${r.depth} (${r.method}), Anchors=${r.anchors}`);
            if (r.level <= 5) {
                // Check triviality
                const qRow = r.grid.find((row, i) => i === results.find(res => res.level === r.level).grid.indexOf(r.grid[i])); // simplified
                // Actually just verify depth >= 1 as minimum
                if (r.depth < 1) console.error("!!! FAIL: Level 1 is trivial");
            }
            if (r.level >= 16 && r.anchors > 0) {
                console.error("!!! FAIL: Hard level has anchors");
            }
            if (r.level >= 16 && r.depth < 3) {
                console.warn("!!! WARN: Hard level depth < 3");
            }
        });

        console.log("--- Verification Complete ---");
    } catch (e) {
        console.error("Verification failed with error:", e);
    }
}

runGeneratorTest();
