// Digit Challenge Level Configuration
// Progressive difficulty with constraint-based puzzles

export const DIGIT_LEVELS = [
    {
        id: 1,
        template: "□ + □",
        targetRHS: 7,
        availableDigits: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        disabledDigits: [],
        operators: ['+'],
        slots: 2,
        timeLimit: 30,
        difficulty: 'EASY',
        description: 'Simple addition'
    },
    {
        id: 2,
        template: "□ - □",
        targetRHS: 3,
        availableDigits: [1, 2, 3, 4, 5],
        disabledDigits: [6, 7, 8, 9],
        operators: ['-'],
        slots: 2,
        timeLimit: 25,
        difficulty: 'EASY',
        description: 'Subtraction with limited digits'
    },
    {
        id: 3,
        template: "□ × □ + □",
        targetRHS: 11,
        availableDigits: [1, 2, 3, 4, 5],
        disabledDigits: [6, 7, 8, 9],
        operators: ['×', '+'],
        slots: 3,
        timeLimit: 20,
        difficulty: 'MEDIUM',
        description: 'Mixed operations - left to right'
    },
    {
        id: 4,
        template: "□ ÷ □ × □",
        targetRHS: 6,
        availableDigits: [1, 2, 3, 4, 6, 8, 9],
        disabledDigits: [5, 7],
        operators: ['÷', '×'],
        slots: 3,
        timeLimit: 18,
        difficulty: 'MEDIUM',
        allowsDecimals: true,
        description: 'Division included'
    },
    {
        id: 5,
        template: "□ + □ × □ - □",
        targetRHS: 8,
        availableDigits: [1, 2, 3, 4, 5, 6],
        disabledDigits: [7, 8, 9],
        operators: ['+', '×', '-'],
        slots: 4,
        timeLimit: 15,
        difficulty: 'HARD',
        description: 'Complex expression - plan carefully'
    }
];

// Helper to get level by ID
export const getLevel = (levelId) => {
    return DIGIT_LEVELS.find(level => level.id === levelId);
};

// Helper to get available (non-disabled) digits
export const getAvailableDigits = (level) => {
    return level.availableDigits.filter(d => !level.disabledDigits.includes(d));
};
