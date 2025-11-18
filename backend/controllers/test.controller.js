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
        res.status(500).json({ error: 'Failed to create test' });
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
export const getTestById = async (req, res) => {
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

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        res.json(test);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch test' });
    }
};


export const submitTest = async (req, res) => {
    const { id } = req.params;  //Test ID
    const { answers } = req.body;  // { "questionId": "selectedAnswer", ... }
    const studentId = req.user.userId;

    try {
        // 1 Get the correct answers from the database
        const correctQuestions = await prisma.question.findMany({
            where: { testId: parseInt(id) },
            select: { id: true, correctAnswer: true }
        });

        // 2 Grade the test
        let score = 0;
        const answerRecords = [];

        for (const q of correctQuestions) {
            const studnetAnswer = answers[q.id];
            const isCorrect = studnetAnswer === q.correctAnswer;

            if (isCorrect) {
                score++;
            }

            answerRecords.push({
                selectedAnswer: studnetAnswer || "No Answer",
                isCorrect: isCorrect,
                questionId: q.id
            });
        }

        // 3 Save the submission and answers in a transaction
        const submission = await prisma.testSubmission.create({
            data: {
                score: score,
                studentId: studentId,
                testId: parseInt(id),
                answers: {
                    create: answerRecords  // Create all related answers
                }
            }
        });

        res.status(201).json({
            message: 'Test submitted successfully!',
            score: score,
            total: correctQuestions.length,
            submissionId: submission.id
        });
    } catch (error) {
    console.error("Submit test error:", error);
    res.status(500).json({ error: 'Failed to submit test' });
  }
};

export const getTestResult = async (req, res) => {
  const { submissionId } = req.params;
  const studentId = req.user.userId;

  try {
    const submission = await prisma.testSubmission.findUnique({
      where: { id: parseInt(submissionId) },
      include: {
        test: { // Get the test title
          select: { title: true, _count: { select: { questions: true } } }
        },
        answers: { // Get all the answers for this submission
          include: {
            question: { // For each answer, get the question text/options
              select: { text: true, options: true, correctAnswer: true }
            }
          }
        }
      }
    });

    // Security Check: Make sure the user is not trying to see someone else's results
    if (!submission || submission.studentId !== studentId) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};