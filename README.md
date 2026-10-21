# ISC Audit – International Student Compliance Audit

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/hussainjaura/Hours-Tracker)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**Stop guessing student work hours.**

ISC Audit is a SaaS compliance platform for UK employers who hire international students on visas. Students are limited to a set number of work hours each week during term time, and employers who get it wrong face Right-to-Work fines of up to £60,000 per worker. ISC Audit builds a clear, tamper-proof record of who declared what and when, so employers can show they did their checks and students can protect their visa status.

![Dashboard](client/public/images/landing/app-desktop-2280.webp)

---

## How It Works

**For international students**
1. Create an account and a student profile (university, visa type, course end date)
2. Add your term dates, by hand or from your university's term template
3. Confirm your term declarations
4. Accept link requests from your employers

**For employers / managers**
1. Create an employer account with your organisation details
2. Send a link request to a student using their university ID
3. Acknowledge the student's term declarations
4. Check a student's work eligibility and weekly hour limit at any time
5. Export a PDF audit pack as evidence for your Statutory Excuse

---

## Features

- **Role-based accounts:** Student, Employer and Admin, each with their own dashboard and protected routes
- **Authentication:** JWT login, Bcrypt password hashing, password strength checks, forgot/reset password emails and optional email verification
- **Term declarations:** students add term dates (Autumn, Spring, Summer) per academic year and confirm them
- **University term templates:** admins manage universities and their term templates, and students can create their terms from one
- **Work eligibility checks:** works out the legal weekly limit from term time vs holidays, course level (10 or 20 hours a week) and course end date
- **Safe defaults:** if a student hasn't added term dates yet, the term-time limit applies until they do
- **Compliance violations:** detects weekly limit breaches (Monday to Sunday weeks) with LOW / MEDIUM / HIGH / CRITICAL severity
- **Student-employer linking:** send, accept, reject and deactivate link requests, with employer acknowledgements
- **Automatic re-acknowledgement:** if a student changes their term details, employer acknowledgements are reset so they must check again
- **Immutable audit log:** every key action is recorded with the IP address, user agent, declaration text and change history
- **PDF exports:** downloadable student audit packs, relationship audit packs and term letters generated with PDFKit
- **Compliance dashboards:** weekly summaries, violation history and employer activity
- **Security:** rate limiting, security headers, request size limits, CORS allow-list, request IDs, input validation and central error handling
- **Health checks:** `/health`, `/health/ready` and `/health/live` endpoints for hosting platforms

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, Vite, React Router v6, Axios, Context API, CSS |
| Backend | Node.js, Express 5, ES Modules |
| Database | PostgreSQL, Prisma ORM, Prisma Migrations |
| Auth & Security | JWT, Bcrypt, custom rate limiting and security middleware |
| Other | PDFKit (PDF generation), Resend (transactional email), dotenv, Nodemon |

---

## Project Structure

```
startup-code/
├── client/                 # React + Vite frontend
│   ├── public/
│   └── src/
│       ├── components/     # Layout, menu, protected routes
│       ├── contexts/       # Auth and mobile nav context
│       ├── hooks/
│       ├── pages/          # Landing, auth pages, student and employer dashboards
│       ├── services/       # Axios API client
│       └── utils/
└── server/                 # Express API
    ├── prisma/             # Schema, migrations and seed script
    └── src/
        ├── middleware/     # Auth, roles, security, validation, errors
        ├── routes/         # Auth, students, employers, terms, compliance, audit...
        └── utils/          # Eligibility, weekly hours, audit logger, PDFs, email
```

---

## Getting Started

### Prerequisites
- Node.js 18 or newer
- A PostgreSQL database (local, or a hosted one like Neon)

### 1. Clone the repo

```bash
git clone https://github.com/hussainjaura/Hours-Tracker.git
cd Hours-Tracker
```

### 2. Set up the server

```bash
cd server
npm install
```

Create a `server/.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
JWT_SECRET=a-long-random-secret
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# optional
ENABLE_EMAIL_VERIFICATION=false
# RESEND_API_KEY=re_xxxxxxxxxxxx
# EMAIL_FROM=ISC Audit <no-reply@yourdomain.com>
```

Run the migrations, seed the database and start the API:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The API runs on http://localhost:4000. Without the Resend keys, emails (like password reset links) are printed in the server console instead.

### 3. Set up the client

In a new terminal:

```bash
cd client
npm install
```

Create a `client/.env` file:

```env
VITE_API_URL=http://localhost:4000
```

Then start it:

```bash
npm run dev
```

Open http://localhost:3000.

---

## Disclaimer

ISC Audit helps employers and students keep clear records of work hours and declarations. It is not legal advice, and it does not replace the official Home Office Right-to-Work checks.

---

## Author

**Muhammad Hussain Jaura**, Software Engineering student at Solent University, Southampton

[![Email](https://img.shields.io/badge/Email-hussainjaura10@gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:hussainjaura10@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/muhammad-hussain-jaura-b303482b1/)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-6E40C9?style=for-the-badge)](https://hussainjaura.github.io/Hussain-Portfolio/)
