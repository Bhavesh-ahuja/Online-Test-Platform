// Test level validation
import { MOTION_LEVELS } from '../data/motionLevels.js';
import { validateLevelDesign } from '../utils/motionEngine.js';

console.log('\\n=== Level Validation Report ===\\n');

MOTION_LEVELS.forEach(level => {
    const result = validateLevelDesign(level);
    console.log(`Level ${level.id}:`);
    console.log(`  Valid: ${result.valid}`);
    console.log(`  Stats:`, result.stats);
    if (result.issues.length > 0) {
        console.log(`  Issues:`, result.issues);
    }
    console.log('');
});
