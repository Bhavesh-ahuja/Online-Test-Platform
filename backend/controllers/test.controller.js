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
  const { answers, status } = req.body;  // { "questionId": "selectedAnswer", ... }
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
        status: status || 'COMPLETED',  //Default to completed if missing
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
    if (!submission || (submission.studentId !== studentId && req.user.role !== 'ADMIN')) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

export const getMySubmissions = async (req, res) => {
  const studentId = req.user.userId;
  try {
    const submissions = await prisma.testSubmission.findMany({
      where: { studentId: studentId },
      include: {
        test: { select: { title: true, _count: { select: { questions: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};


export const getTestSubmissions = async (req, res) => {
  const { id } = req.params; // Test ID

  try {
    const submissions = await prisma.testSubmission.findMany({
      where: { testId: parseInt(id) },
      include: {
        student: { select: { email: true, id: true } }, // Get student info
      },
      orderBy: { score: 'desc' } // Default sort by score
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};

export const updateTest = async (req, res) => {
  const { id } = req.params;
  const { title, description, duration, questions } = req.body;
  const userId = req.user.userId;

  try {
    // 1. Check if test exists and belongs to user (or is admin)
    const existingTest = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { submissions: true } } }
    });

    if (!existingTest) return res.status(404).json({ error: 'Test not found' });

    // 2. Check for Submissions (Safety Lock)
    const hasSubmissions = existingTest._count.submissions > 0;

    // 3. Prepare Update Data
    const updateData = {
      title,
      description,
      duration: parseInt(duration),
    };

    // 4. Handle Questions Logic
    if (questions && questions.length > 0) {
      if (hasSubmissions) {
        // If students have taken the test, we CANNOT delete/re-create questions 
        // because it would break their result history.
        // We will ignore the 'questions' update and warn the user (or just update metadata).
        // console.warn("Skipping question update due to existing submissions");
        return {
          warning: "This question cannot be updated because submissions already exist."
        };
      } else {
        // Safe to update questions: Delete all old ones, create new ones
        updateData.questions = {
          deleteMany: {}, // Wipe old questions
          create: questions.map(q => ({
            text: q.text,
            type: q.type,
            options: q.options || [],
            correctAnswer: q.correctAnswer
          }))
        };
      }
    }

    // 5. Perform Update
    const updatedTest = await prisma.test.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { questions: true }
    });

    res.json(updatedTest);

  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

export const deleteTest = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check if test exists
    const test = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { submissions: true } } }
    });

    if (!test) return res.status(404).json({ error: "Test not found" });

    // 2. Safety Check: Do not delete if student have taken it
    if (test._count.submissions > 0) {
      return req.status(400).json({
        error: 'Cannot delete test because it has student submissions. Archiving is recommended instead.'
      });
    }

    // 3. Delete (This will cascade delete Questions due to database rules, but lets be safe)
    // We use a transaction to ensure clean deletion
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { question: { testId: parseInt(id) } } }),
      prisma.question.deleteMany({ where: { testId: parseInt(id) } }),
      prisma.test.delete({ where: { id: parseInt(id) } })
    ]);
  }
  catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
};