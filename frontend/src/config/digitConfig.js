/**
 * =============================================
 * DIGIT CHALLENGE - CONFIGURATION CONSTANTS
 * =============================================
 * 
 * This file contains all configurable parameters for the Digit Challenge.
 * These values define default behavior when not explicitly overridden by
 * admin-configured test settings.
 * 
 * @module digitConfig
 */

/**
 * DEFAULT_DURATION_SECONDS
 * 
 * Default timer duration for Digit Challenge assessments.
 * 
 * Rationale:
 * - 10 minutes (600 seconds) is the company standard for cognitive gaming rounds
 * - Matches the duration used by Switch Challenge for consistency
 * - Provides adequate time for 20 progressive levels (~30 seconds per level average)
 * - Can be overridden via test configuration (see digitConfig.durationSeconds)
 * 
 * Configuration Priority:
 * 1. Test-specific config (data.digitConfig?.durationSeconds)
 * 2. General test duration (data.duration * 60)
 * 3. This default value (600 seconds)
 * 
 * @type {number}
 * @constant
 * @default 600
 */
export const DEFAULT_DURATION_SECONDS = 600; // 10 minutes

/**
 * TOTAL_LEVELS
 * 
 * Total number of levels in a Digit Challenge session.
 * Progressive difficulty scaling from BASIC (1-3) to MASTER (17-20).
 * 
 * @type {number}
 * @constant
 * @default 20
 */
export const TOTAL_LEVELS = 20;

/**
 * MAX_CONSECUTIVE_FAILURES
 * 
 * Maximum number of consecutive wrong answers before auto-termination.
 * This prevents random guessing and ensures assessment quality.
 * 
 * @type {number}
 * @constant
 * @default 3
 */
export const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * TIME_WARNING_THRESHOLD
 * 
 * Threshold (in seconds) to trigger low-time warning UI.
 * Timer display changes color when time remaining falls below this value.
 * 
 * @type {number}
 * @constant
 * @default 60
 */
export const TIME_WARNING_THRESHOLD = 60; // 1 minute

/**
 * SCORE_MULTIPLIERS
 * 
 * Speed bonus multipliers based on answer submission time.
 * Applied to base score calculation.
 * 
 * @type {Object}
 * @constant
 */
export const SCORE_MULTIPLIERS = {
    FAST: 1.5,    // < 5 seconds
    MEDIUM: 1.2,  // < 10 seconds
    NORMAL: 1.0   // >= 10 seconds
};
