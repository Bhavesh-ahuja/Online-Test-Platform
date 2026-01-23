// test.controller.js
import TestService from '../services/test.service.js';
import catchAsync from '../utils/catchAsync.js';

/* =========================
   CREATE TEST
========================= */
export const createTest = catchAsync(async (req, res) => {
  const newTest = await TestService.createTest(req.body, req.user.userId);
  res.status(201).json(newTest);
});

export const updateTest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updatedTest = await TestService.updateTest(id, req.body, req.user.role, req.user.userId);
  res.json(updatedTest);

});

/* =========================
   START TEST (ATTEMPTS)
========================= */
export const startTest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.userId;
  const result = await TestService.startTest(id, studentId);
  res.json(result);
});

// Get all tests
export const getAllTests = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const tests = await TestService.getAllTests(userId);
  res.json(tests);
});

// Get a single test by its ID
export const getTestById = catchAsync(async (req, res) => {
  const { id } = req.params;  // Get ID from URL
  const test = await TestService.getTestById(id, false);
  res.json(test);
});

// Admin: get test with correct answers
export const getTestByIdForAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;
  const test = await TestService.getTestById(id, true);
  res.json(test);
});


export const submitTest = catchAsync(async (req, res) => {
  // Ensure we have the student ID
  const submissionData = {
    ...req.body,
    studentId: req.user?.userId || req.body.studentId
  };

  const result = await TestService.submitTest(req.params, submissionData, req.examSession);
  return res.json(result);
});

/* =========================
   RESULTS
========================= */
export const getTestResult = catchAsync(async (req, res) => {
  const { submissionId } = req.params;
  const studentId = req.user.userId;
  const submission = await TestService.getTestResult(submissionId, studentId, req.user.role);
  res.json(submission);
});

export const getMySubmissions = catchAsync(async (req, res) => {
  const studentId = req.user.userId;
  const submissions = await TestService.getMySubmissions(studentId);
  res.json(submissions);
});


export const getTestSubmissions = catchAsync(async (req, res) => {
  const { id } = req.params; // Test ID
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'score';
  const order = req.query.order || 'desc';

  const result = await TestService.getTestSubmissions(id, page, limit, sortBy, order);
  res.json(result);
});

export const deleteTest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await TestService.deleteTest(id);
  res.json(result);
});


export const uploadTestPDF = catchAsync(async (req, res) => {
  const result = await TestService.uploadTestPDF(req.file);
  res.json(result);
});

// Export Test Results (PDF)
export const exportTestResultsPDF = catchAsync(async (req, res) => {
  const { id } = req.params;
  const pdfStream = await TestService.exportTestResultsPDF(id);

  // Set Headers for Download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Test_${id}_Report.pdf"`);

  // Stream directly to response
  pdfStream.pipe(res);
});

export const autosaveTestProgress = catchAsync(async (req, res) => {
  await TestService.autosaveTestProgress(req.examSession, req.body);
  res.json({ success: true });
});