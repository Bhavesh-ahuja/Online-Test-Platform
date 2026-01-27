// Digit Challenge Validation Engine
// Left-to-right expression evaluation (ignoring standard precedence)

const OPERATORS = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '×': (a, b) => a * b,
    '*': (a, b) => a * b,
    '÷': (a, b) => b !== 0 ? a / b : NaN,
    '/': (a, b) => b !== 0 ? a / b : NaN
};

/**
 * Extract operators from template
 * @param {string} template - e.g., "□ + □ × □"
 * @returns {string[]} - e.g., ['+', '×']
 */
function extractOperators(template) {
    const operators = [];
    const parts = template.split('□').filter(p => p.trim());

    parts.forEach(part => {
        const op = part.trim();
        if (op && OPERATORS[op]) {
            operators.push(op);
        }
    });

    return operators;
}

/**
 * Interleave digits and operators into expression array
 * @param {number[]} digits - e.g., [3, 2, 1]
 * @param {string[]} operators - e.g., ['+', '×']
 * @returns {(number|string)[]} - e.g., [3, '+', 2, '×', 1]
 */
function buildExpression(digits, operators) {
    const expression = [];

    for (let i = 0; i < digits.length; i++) {
        expression.push(digits[i]);
        if (i < operators.length) {
            expression.push(operators[i]);
        }
    }

    return expression;
}

/**
 * Evaluate expression LEFT-TO-RIGHT (ignoring precedence)
 * @param {(number|string)[]} tokens - e.g., [3, '+', 2, '×', 1]
 * @returns {number} - evaluated result
 */
function evaluateLeftToRight(tokens) {
    if (tokens.length === 0) return NaN;

    let result = parseFloat(tokens[0]);

    for (let i = 1; i < tokens.length; i += 2) {
        const operator = tokens[i];
        const operand = parseFloat(tokens[i + 1]);

        if (!OPERATORS[operator]) {
            return NaN;
        }

        result = OPERATORS[operator](result, operand);

        if (isNaN(result)) {
            return NaN;
        }
    }

    return result;
}

/**
 * Validate and evaluate digit expression
 * @param {number[]} userDigits - Selected digits
 * @param {Object} levelConfig - Level configuration
 * @returns {Object} - Validation result
 */
export function validateExpression(userDigits, levelConfig) {
    const { template, targetRHS, availableDigits, disabledDigits, slots } = levelConfig;

    // 1. Check completeness
    if (userDigits.length !== slots) {
        return {
            valid: false,
            error: 'INCOMPLETE',
            message: `Expression incomplete. Need ${slots} digits, got ${userDigits.length}.`
        };
    }

    // 2. Check digit availability
    const allowedDigits = availableDigits.filter(d => !disabledDigits.includes(d));

    for (const digit of userDigits) {
        if (!allowedDigits.includes(digit)) {
            return {
                valid: false,
                error: 'INVALID_DIGIT',
                digit,
                message: `Digit ${digit} is not available or is disabled.`
            };
        }
    }

    // 3. Check for duplicates
    const used = new Set();
    for (const digit of userDigits) {
        if (used.has(digit)) {
            return {
                valid: false,
                error: 'DUPLICATE',
                digit,
                message: `Digit ${digit} can only be used once.`
            };
        }
        used.add(digit);
    }

    // 4. Build expression from template
    const operators = extractOperators(template);
    const expression = buildExpression(userDigits, operators);

    // 5. Evaluate left-to-right
    const result = evaluateLeftToRight(expression);

    if (isNaN(result)) {
        return {
            valid: false,
            error: 'MATH_ERROR',
            message: 'Invalid mathematical operation (e.g., division by zero).'
        };
    }

    // 6. Compare with target (float tolerance)
    const EPSILON = 0.0001;
    const isCorrect = Math.abs(result - targetRHS) < EPSILON;

    return {
        valid: isCorrect,
        result: Math.round(result * 10000) / 10000, // Round to 4 decimals
        expected: targetRHS,
        expression: expression.join(' '),
        error: isCorrect ? null : 'WRONG_ANSWER',
        message: isCorrect
            ? 'Correct!'
            : `Got ${result}, expected ${targetRHS}.`
    };
}

export { extractOperators, buildExpression, evaluateLeftToRight };
