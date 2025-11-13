Project Summary — Online Test Platform

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

