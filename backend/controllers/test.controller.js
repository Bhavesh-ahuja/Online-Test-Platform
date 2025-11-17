import prisma from '../lib/prisma.js';

// Create a new test with questions
export const createTest = async (req, res) => {
    const { title, description, duration, questions } = req.body;
    const userId = req.user.userId;  //Got from auth middleware

    try {
        // Create Test AND Questions in on transaction

        const newTest = await prisma.test.create({
            data: {
                title,
                description,
                duration: parseInt(duration),
                createdById: userId,
                questions: {
                    create: questions.map(q => ({
                        text: q.text,
                        type: q.type,
                        options: q.options || [],
                        correctAnswer: q.correctAnswer
                    }))
                }
            },
            include: {
                questions: true //Return the questions in the response
            }
        });

        res.status(201).json(newTest);
    } catch (error) {
        console.error('Create test error:', error);
        res.status(500).json({ error: 'Failed to create test'});
    }
};

// Get all tests
export const getAllTests = async (req, res) => {
    try {
        const tests = await prisma.test.findMany({
            include: {
                createdBy: {
                    select: { email: true } // Only return creator's email, not password
                },
                _count: {
                    select: { questions: true } //Return number of questions
                }
            }
        });
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tests' });
    }
};

// Get a single test by its ID
export const getTestById = async (req,res) => {
    const { id } = req.params;  // Get ID from URL

    try {
        const test = await prisma.test.findUnique({
            where: { id: parseInt(id) },
            include: {
                questions: {
                    // IMPORTANT we do NoT send the correctAnswer to the student
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        // We intentionally leave out correctAnswer
                    }
                }
            }
        });

        if(!test){
            return res.status(404).json({ error: 'Test not found' });
        }

        res.json(test);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch test' });
    }
};