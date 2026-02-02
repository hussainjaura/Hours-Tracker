import bcrypt from "bcrypt";
import prisma from "../src/prisma.js";

async function main() {
  // --------------------
  // ADMIN
  // --------------------
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@system.com" },
    update: {},
    create: {
      email: "admin@system.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user ensured:", admin.email);

  // --------------------
  // UNIVERSITIES
  // --------------------
  const southampton = await prisma.university.upsert({
    where: { code: "SOUTHAMPTON" },
    update: {},
    create: {
      name: "University of Southampton",
      code: "SOUTHAMPTON",
    },
  });

  console.log("✅ University ensured:", southampton.name);

  const oxford = await prisma.university.upsert({
    where: { code: "OXFORD" },
    update: {},
    create: {
      name: "University of Oxford",
      code: "OXFORD",
    },
  });

  console.log("✅ University ensured:", oxford.name);

  // --------------------
  // TERM TEMPLATES - Southampton
  // --------------------
  // Delete existing templates for clean seed
  await prisma.termTemplate.deleteMany({
    where: { universityId: southampton.id },
  });

  const southamptonAutumn = await prisma.termTemplate.create({
    data: {
      universityId: southampton.id,
      name: "AUTUMN",
      startDate: new Date("2025-09-22"),
      endDate: new Date("2025-12-12"),
    },
  });

  const southamptonSpring = await prisma.termTemplate.create({
    data: {
      universityId: southampton.id,
      name: "SPRING",
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-03-27"),
    },
  });

  const southamptonSummer = await prisma.termTemplate.create({
    data: {
      universityId: southampton.id,
      name: "SUMMER",
      startDate: new Date("2026-04-13"),
      endDate: new Date("2026-05-15"),
    },
  });

  console.log("✅ Term templates created for Southampton");

  // --------------------
  // TERM TEMPLATES - Oxford
  // --------------------
  // Delete existing templates for clean seed
  await prisma.termTemplate.deleteMany({
    where: { universityId: oxford.id },
  });

  const oxfordAutumn = await prisma.termTemplate.create({
    data: {
      universityId: oxford.id,
      name: "AUTUMN",
      startDate: new Date("2025-10-05"),
      endDate: new Date("2025-12-05"),
    },
  });

  const oxfordSpring = await prisma.termTemplate.create({
    data: {
      universityId: oxford.id,
      name: "SPRING",
      startDate: new Date("2026-01-19"),
      endDate: new Date("2026-03-13"),
    },
  });

  const oxfordSummer = await prisma.termTemplate.create({
    data: {
      universityId: oxford.id,
      name: "SUMMER",
      startDate: new Date("2026-04-26"),
      endDate: new Date("2026-06-20"),
    },
  });

  console.log("✅ Term templates created for Oxford");

  // --------------------
  // STUDENT USER
  // --------------------
  const studentPassword = await bcrypt.hash("student123", 10);

  const studentUser = await prisma.user.upsert({
    where: { email: "student1@uni.ac.uk" },
    update: {},
    create: {
      email: "student1@uni.ac.uk",
      password: studentPassword,
      role: "STUDENT",
    },
  });

  console.log("✅ Student user ensured:", studentUser.email);

  // --------------------
  // STUDENT PROFILE
  // --------------------
  const studentProfile = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      universityId: "SOUTHAMPTON", // Matches university code
      visaType: "Student Visa",
      maxWeeklyHours: 20,
      courseEndDate: new Date("2026-09-01"),
    },
  });

  console.log("✅ Student profile ensured for:", studentUser.email);

  // --------------------
  // EMPLOYER USER (for testing)
  // --------------------
  const employerPassword = await bcrypt.hash("employer123", 10);

  const employerUser = await prisma.user.upsert({
    where: { email: "employer@company.com" },
    update: {},
    create: {
      email: "employer@company.com",
      password: employerPassword,
      role: "EMPLOYER",
    },
  });

  console.log("✅ Employer user ensured:", employerUser.email);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
