Project Summary — Online Test Platform

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL Database

### Setup

1. **Install Dependencies**
   Run the setup script from the root directory to install dependencies for both frontend and backend.
   *(Note: You do not need to run `npm install` in the root folder itself).*
   ```bash
   npm run setup
   ```

2. **Database Setup**
   - Ensure your MySQL server is running.
   - Create a database named `online-test-platform-mysql`.
   - Go to `backend/` directory.
   - Copy `.env.example` to `.env`.
   - Update `DATABASE_URL` with your local credential.
   - Run the database setup script from the root:
   ```bash
   npm run db:setup
   ```
   This command will generate the Prisma client and run migrations to keep your schema in sync.

3. **Environment Configuration**
   - Go to `backend/` directory.
   - Copy `.env.example` to `.env`.
   - Update `DATABASE_URL`, `GEMINI_API_KEY`, and `JWT_SECRET` with your local values.

4. **Start the Application**
   Double-click the `run_app.bat` file in the root directory.
   
   *Alternatively, if you prefer manual terminals:*
   - Terminal 1: `cd backend && npm run dev`
   - Terminal 2: `cd frontend && npm run dev`

### Project Structure
- `backend/`: Node.js/Express API with Prisma.
- `frontend/`: React + Vite application.
---

Overview
The project is a web-based platform designed to simplify the process of creating, managing, and taking online tests. It enables administrators to create and schedule tests while allowing students to attempt them securely within a set timeframe. The system supports multiple question types, includes basic anti-cheating measures, and offers real-time monitoring of test sessions.

---

User Roles

1. Admin

* Create, manage, and schedule tests.
* Add and edit questions (multiple-choice or short-answer).
* Set test start and end times.
* Monitor active tests in real time.
* View or download test results.

2. Student / Participant

* Register or log in securely.
* View upcoming or available tests.
* Attempt tests within the allowed duration.
* Receive results upon completion.

---

Core Features (MVP)

* Authentication: Secure login and signup.
* Test Management: Admins can create, edit, and delete tests as needed.
* Question Handling: Support for adding multiple-choice and short-answer questions.
* Test Taking: Students can take tests only within the scheduled duration.
* Timer & Auto Submission: Built-in timer that automatically submits the test when time expires.
* Tab-Switch Restriction: Detects tab-switching to discourage cheating, with options to warn or auto-submit.
* Result Calculation: Automatically grades multiple-choice questions and short answers.
* Dashboard: Provides admins with a clear overview of test statistics and results.
* Responsive UI: Designed to work seamlessly on both desktop and mobile devices.

---

Tech Stack Overview

* Frontend: React with JavaScript and Tailwind CSS for a fast, interactive, and mobile-friendly interface.
* Backend: Node.js with Express.js for building scalable RESTful APIs.
* Database: PostgreSQL for reliable and structured data storage.
* Authentication: JWT with bcrypt to ensure secure user sessions.
* Real-Time Monitoring: Socket.io for live test monitoring and tab-switch detection.
* Orm : Prisma (for clean schema + easy querying)

---

Future Enhancements

* Randomized question order for each student.
* Live camera monitoring using WebRTC.
* AI-based cheating detection.
* Exportable results in PDF or Excel format.
* Advanced analytics dashboard with visual reports.
* Support for additional question types, such as long answers or file uploads.

---

