// test.controller.js
import TestService from '../services/test.service.js';



/* =========================
   CREATE TEST
========================= */
export const createTest = async (req, res) => {
  try {
    const newTest = await TestService.createTest(req.body, req.user.userId);
    res.status(201).json(newTest);
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
};

export const updateTest = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedTest = await TestService.updateTest(id, req.body, req.user.role, req.user.userId);
    res.json(updatedTest);
  } catch (error) {
    console.error('Update test error:', error);
    if (error.message === 'Test not found') return res.status(404).json({ error: error.message });
    res.status(500).json({ error: 'Failed to update test' });
  }
};

/* =========================
   START TEST (ATTEMPTS)
========================= */
export const startTest = async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.userId;

  try {
    const result = await TestService.startTest(id, studentId);
    res.json(result);
  } catch (error) {
    console.error("Start test error:", error);
    if (error.message === 'Test not found') return res.status(404).json({ error: error.message });
    if (error.message.includes('Test has not started')) return res.status(403).json({ error: error.message });
    if (error.message === 'Test window has closed') return res.status(403).json({ error: error.message });
    if (error.message === 'Maximum attempts reached') {
      // Ideally we should pass the submissionId here but for now just error
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to start test' });
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
    const test = await TestService.getTestById(id, false);
    res.json(test);
  } catch (error) {
    if (error.message === 'Test not found') return res.status(404).json({ error: error.message });
    res.status(500).json({ error: 'Failed to fetch test' });
  }
};

// Admin: get test with correct answers
export const getTestByIdForAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const test = await TestService.getTestById(id, true);
    res.json(test);
  } catch (error) {
    console.error('Fetch test (admin) error:', error);
    if (error.message === 'Test not found') return res.status(404).json({ error: error.message });
    res.status(500).json({ error: 'Failed to fetch test (admin)' });
  }
};


export const submitTest = async (req, res) => {
  try {
    const result = await TestService.submitTest(req.params, req.body, req.examSession);
    return res.json(result);
  } catch (err) {
    console.error('Submit error:', err);
    if (err.message === 'Invalid or expired exam session') return res.status(401).json({ error: err.message });
    if (err.message === 'Submission not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Submission already finalized') return res.status(400).json({ error: err.message });
    if (err.message === 'Submission already closed') return res.status(400).json({ error: err.message });
    return res.status(500).json({ error: 'Failed to submit test' });
  }
};

/* =========================
   RESULTS
========================= */
export const getTestResult = async (req, res) => {
  const { submissionId } = req.params;
  const studentId = req.user.userId;

  try {
    const submission = await TestService.getTestResult(submissionId, studentId, req.user.role);
    res.json(submission);
  } catch (error) {
    if (error.message === 'Submission not found or unauthorized') return res.status(404).json({ error: 'Submission not found' });
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

export const getMySubmissions = async (req, res) => {
  const studentId = req.user.userId;
  try {
    const submissions = await TestService.getMySubmissions(studentId);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};


export const getTestSubmissions = async (req, res) => {
  const { id } = req.params; // Test ID

  try {
    const submissions = await TestService.getTestSubmissions(id);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};



export const deleteTest = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await TestService.deleteTest(id);
    res.json(result);
  }
  catch (error) {
    console.error('Delete test error:', error);
    if (error.message === 'Test not found') return res.status(404).json({ error: error.message });
    if (error.message.includes('Cannot delete test')) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to delete test' });
  }
};


export const uploadTestPDF = async (req, res) => {
  try {
    const result = await TestService.uploadTestPDF(req.file);
    res.json(result);
  } catch (error) {
    console.error("PDF Upload Error:", error);
    if (error.message === "No PDF file uploaded" || error.message.includes("Could not extract")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to process PDFDataRangeTransport." });
  }
};

export const autosaveTestProgress = async (req, res) => {
  try {
    await TestService.autosaveTestProgress(req.examSession, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Autosave error:', error);
    res.status(500).json({ error: 'Autosave failed' });
  }
};
