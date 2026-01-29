export async function getWorkEligibility(prisma, student, requestedHours = null) {
  if (!student?.id) {
    throw new Error("Invalid student object passed to getWorkEligibility");
  }

  const today = new Date();

  // 1️⃣ Course finished → no work
  if (student.courseEndDate && today > student.courseEndDate) {
    return {
      canWork: false,
      allowedWeeklyHours: 0,
      inTermTime: false,
      activeTerm: null,
      reason: "Course has ended",
    };
  }

  // 2️⃣ Find active term
  const activeTerm = await prisma.term.findFirst({
    where: {
      studentId: student.id,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });

  const inTermTime = !!activeTerm;
  const allowedWeeklyHours = inTermTime ? 20 : 40;

  return {
    canWork:
      requestedHours != null
        ? requestedHours <= allowedWeeklyHours
        : true,
    allowedWeeklyHours,
    inTermTime,
    activeTerm: activeTerm?.name ?? null,
    reason: inTermTime
      ? `In ${activeTerm.name} term`
      : "Outside term time",
  };
}
