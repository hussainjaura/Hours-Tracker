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
      universityId: "UNI0001",
      visaType: "Student Visa",
      maxWeeklyHours: 20,
      courseEndDate: new Date("2026-09-01"),
      termStartDate: new Date("2026-01-01"),
      termEndDate: new Date("2026-06-01"),
    },
  });

  console.log("✅ Student profile ensured for:", studentUser.email);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
