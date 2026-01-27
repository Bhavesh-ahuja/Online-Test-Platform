import prisma from '../lib/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import AppError from '../utils/AppError.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PdfService {
    async uploadTestPDF(file) {
        if (!file) throw new AppError("No PDF file uploaded", 400);

        const data = new Uint8Array(file.buffer);
        const loadingTask = getDocument(data);
        const pdfDocument = await loadingTask.promise;

        let extractedText = "";
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const content = await page.getTextContent();
            extractedText += content.items.map(item => item.str).join(" ") + "\n";
        }

        if (!extractedText || extractedText.length < 50) {
            throw new AppError("Could not extract enough text. Ensure this is a text-based PDF.", 400);
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_ID || "models/gemini-2.5-flash" });

        const prompt = `
      You are an exam parser helper.
      Read the following text extracted from a PDF.Identify all Multiple Choice Questions (MCQs).
      
      Your Goal: Convert the text into a strict JSON array.
      
      Rules:
      1. Extract the "text" (questions).
      2. Extract the "options" (array of strings).
      3. If you can detect the correct answer (marked by *,bold,or an answer key), put it in "correctAnswer".
         If you cannot find the answer, leave "correct Answer" as an empty string "".
      4. Default "type" to "MCQ".
      5. Output ONLY valid JSON. No markdown.
      
      JSON Structure:
      [
        {
          "text": "Question goes here?",
          "type": "MCQ",
          "options" : ["Option A","Option B","Option C","Option D",so on.......],
          "correctAnswer": "Correct answer goes here"
        }
      ]
        
      Here is the PDF text:
      ${extractedText}
      `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const questions = JSON.parse(cleanJson);
            return { questions };
        } catch (parseError) {
            throw new AppError("AI failed to format the questions correctly. Please try a cleaner PDF.", 500);
        }
    }

    async exportTestResultsPDF(testId) {
        // 1. Fetch Data (All Submissions, No Pagination)
        const test = await prisma.test.findUnique({ where: { id: parseInt(testId) } });
        if (!test) throw new AppError('Test not found', 404);

        const submissions = await prisma.testSubmission.findMany({
            where: { testId: parseInt(testId) },
            include: {
                student: { select: { email: true, firstName: true, lastName: true } }
            },
            orderBy: { score: 'desc' }
        });

        // 2. Setup PDF Doc
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // 3. Watermark (Team Logo)
        // Path relative to backend/services -> frontend/public/img/logo.png
        // backend/services/../../frontend/public/img/logo.png
        const logoPath = path.join(__dirname, '../../frontend/public/img/logo.png');

        if (fs.existsSync(logoPath)) {
            // Add Logo as Watermark (Centered, Faded)
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            doc.image(logoPath, pageWidth / 2 - 100, pageHeight / 2 - 100, {
                width: 200,
                opacity: 0.1
            });
        }

        // 4. Header
        doc.fontSize(20).text('Class Result Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Test: ${test.title}`, { align: 'center' });
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center', color: 'gray' });
        doc.moveDown(2);

        // 5. Table Header
        const startY = doc.y;
        const colX = [50, 200, 350, 450]; // X positions for columns

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Student Name', colX[0], startY);
        doc.text('Email', colX[1], startY);
        doc.text('Status', colX[2], startY);
        doc.text('Score', colX[3], startY);

        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();
        doc.moveDown();

        // 6. Table Rows
        doc.font('Helvetica');
        let currentY = doc.y + 10;

        submissions.forEach((sub, index) => {
            // Page Break Check
            if (currentY > 750) {
                doc.addPage();
                // Re-add Watermark on new page
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, doc.page.width / 2 - 100, doc.page.height / 2 - 100, { width: 200, opacity: 0.1 });
                }
                currentY = 50;
            }

            const fullName = `${sub.student.firstName || ''} ${sub.student.lastName || ''}`.trim() || 'N/A';

            doc.text(fullName, colX[0], currentY, { width: 140, ellipsis: true });
            doc.text(sub.student.email, colX[1], currentY, { width: 140, ellipsis: true });

            // Status Color Logic (Simple text for PDF)
            doc.fillColor(sub.status === 'TERMINATED' ? 'red' : 'black');
            doc.text(sub.status, colX[2], currentY);
            doc.fillColor('black');

            doc.text(sub.score.toString(), colX[3], currentY);

            currentY += 20;
        });

        // 7. Footer
        const totalStudents = submissions.length;
        const avgScore = totalStudents > 0 ? (submissions.reduce((acc, curr) => acc + curr.score, 0) / totalStudents).toFixed(1) : 0;

        doc.moveDown(2);
        doc.font('Helvetica-Bold').text(`Total Students: ${totalStudents}   |   Average Score: ${avgScore}`, { align: 'right' });

        doc.end();
        return doc;
    }
}

export default new PdfService();
