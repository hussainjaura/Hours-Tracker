import bcrypt from "bcrypt";
import prisma from "../src/prisma.js";
import { validatePasswordStrength } from "../src/utils/password.js";
import { logTermDeclaration, logEmployerAcknowledgement } from "../src/utils/auditLogger.js";

// these demo logins are meant to be public: the README shows them so recruiters can try the app:
// they only ever see the demo student and demo employer, never anyone else's data:
const DEMO_PASSWORD = "DemoPass@2026";
const DEMO_STUDENT_EMAIL = "aisha.khan@demo.iscaudit.app";
const DEMO_EMPLOYER_EMAIL = "james.carter@demo.iscaudit.app";

// this works out the academic year we are in now (a new year starts on 1 August):
// so the demo always has current term dates, whenever the seed is run:
function getAcademicYearStart(today = new Date()) {
  return today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
}

// this builds a date at midnight UTC, the same way the app saves term dates:
const day = (year, month, date) => new Date(Date.UTC(year, month - 1, date));

// this lists each university's terms for one academic year, as month and day:
// the autumn term is in the first calendar year, spring and summer are in the next one:
const TERM_PATTERNS = {
  SOUTHAMPTON: [
    { name: "AUTUMN", start: [9, 22], end: [12, 12], nextYear: false },
    { name: "SPRING", start: [1, 5], end: [3, 27], nextYear: true },
    { name: "SUMMER", start: [4, 13], end: [6, 5], nextYear: true },
  ],
  OXFORD: [
    { name: "AUTUMN", start: [10, 5], end: [12, 5], nextYear: false },
    { name: "SPRING", start: [1, 19], end: [3, 13], nextYear: true },
    { name: "SUMMER", start: [4, 26], end: [6, 20], nextYear: true },
  ],
};

// this turns a term pattern into real start and end dates for the given academic year:
function buildTermDates(pattern, startYear) {
  const year = pattern.nextYear ? startYear + 1 : startYear;
  return {
    name: pattern.name,
    startDate: day(year, ...pattern.start),
    endDate: day(year, ...pattern.end),
  };
}

// ADMIN: only created when you choose a password in .env, so no password is ever saved in the code:
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Skipped admin: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env to create one.");
    return;
  }

  // the admin password must pass the same strength rules as everyone else:
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new Error(`SEED_ADMIN_PASSWORD is too weak: ${strength.error}`);
  }

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: await bcrypt.hash(password, 10), role: "ADMIN", emailVerifiedAt: new Date() },
  });
  console.log("Admin user ensured:", email);
}

// UNIVERSITIES AND TERM TEMPLATES: students can create their terms from these:
async function seedUniversities(startYear) {
  const universities = [
    { code: "SOUTHAMPTON", name: "University of Southampton" },
    { code: "OXFORD", name: "University of Oxford" },
  ];

  for (const uni of universities) {
    const university = await prisma.university.upsert({
      where: { code: uni.code },
      update: {},
      create: uni,
    });

    // this replaces the old templates with this academic year's dates:
    await prisma.termTemplate.deleteMany({ where: { universityId: university.id } });
    await prisma.termTemplate.createMany({
      data: TERM_PATTERNS[uni.code].map((pattern) => ({
        universityId: university.id,
        ...buildTermDates(pattern, startYear),
      })),
    });
    console.log("University and term templates ensured:", uni.name);
  }
}

// this removes the old demo accounts so every seed starts the demo fresh:
// deleting a user also deletes their profile, terms and links (onDelete: Cascade in the schema):
async function removeOldDemoAccounts() {
  const oldUsers = await prisma.user.findMany({
    where: { email: { in: [DEMO_STUDENT_EMAIL, DEMO_EMPLOYER_EMAIL] } },
    select: { id: true },
  });
  const oldIds = oldUsers.map((user) => user.id);

  // audit logs are not linked to users in the schema, so we clear the demo ones by hand:
  await prisma.auditLog.deleteMany({ where: { performedBy: { in: oldIds } } });
  await prisma.user.deleteMany({ where: { id: { in: oldIds } } });
}

// DEMO ACCOUNTS: a student with confirmed terms, linked to an employer who has acknowledged them:
async function seedDemoAccounts(startYear) {
  await removeOldDemoAccounts();
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const academicYear = `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;

  // the demo student is in the middle of their course, which ends next June:
  const studentUser = await prisma.user.create({
    data: { email: DEMO_STUDENT_EMAIL, password, role: "STUDENT", emailVerifiedAt: new Date() },
  });
  const student = await prisma.student.create({
    data: {
      userId: studentUser.id,
      fullName: "Aisha Khan",
      universityId: "AK204518",
      universityName: "University of Southampton",
      visaType: "Student Visa (Tier 4)",
      courseEndDate: day(startYear + 1, 6, 30),
    },
  });

  // this adds this year's terms, confirmed by the student, with the same audit log the website writes:
  for (const pattern of TERM_PATTERNS.SOUTHAMPTON) {
    const term = await prisma.term.create({
      data: {
        studentId: student.id,
        ...buildTermDates(pattern, startYear),
        academicYear,
        courseLevel: "DEGREE_OR_ABOVE",
        confirmedAt: new Date(),
        confirmedBy: studentUser.id,
      },
    });
    await logTermDeclaration(prisma, term, student, studentUser, "I confirm these term dates are accurate to the best of my knowledge.");
  }

  // the demo employer runs a coffee shop that employs the demo student:
  const employerUser = await prisma.user.create({
    data: { email: DEMO_EMPLOYER_EMAIL, password, role: "EMPLOYER", emailVerifiedAt: new Date() },
  });
  await prisma.employer.create({
    data: {
      userId: employerUser.id,
      fullName: "James Carter",
      workEmail: DEMO_EMPLOYER_EMAIL,
      role: "MANAGER",
      organisationName: "Kahawa Coffee Ltd",
    },
  });

  // this links them: the student accepted the request and the employer acknowledged the dates:
  const relationship = await prisma.studentEmployer.create({
    data: {
      studentId: student.id,
      employerId: employerUser.id,
      status: "ACTIVE",
      acknowledgedAt: new Date(),
      acknowledgedBy: employerUser.id,
    },
  });
  await logEmployerAcknowledgement(prisma, relationship, student, employerUser, null);

  console.log(`Demo accounts ready (password: ${DEMO_PASSWORD}):`);
  console.log(`  Student:  ${DEMO_STUDENT_EMAIL}`);
  console.log(`  Employer: ${DEMO_EMPLOYER_EMAIL}`);
}

// this runs each part in order, using the current academic year for every date:
async function main() {
  const startYear = getAcademicYearStart();
  await seedAdmin();
  await seedUniversities(startYear);
  await seedDemoAccounts(startYear);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
