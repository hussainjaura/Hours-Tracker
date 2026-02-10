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
  
  // Determine allowed hours based on course level
  let allowedWeeklyHours = 40; // Default to full-time (holidays)
  if (inTermTime) {
    // BELOW_DEGREE = 10 hours, DEGREE_OR_ABOVE or null = 20 hours (default)
    if (activeTerm.courseLevel === 'BELOW_DEGREE') {
      allowedWeeklyHours = 10;
    } else {
      allowedWeeklyHours = 20; // DEGREE_OR_ABOVE or null/undefined
    }
  }

  // 3️⃣ Compliance rules - no hour tracking, just rules
  let canWork = true;
  let reason = inTermTime
    ? `In ${activeTerm?.name || 'term time'} - Maximum ${allowedWeeklyHours} hours per week allowed`
    : "Outside term time - Full-time work allowed (no weekly limit)";

  // If custom maxWeeklyHours is set, use that instead
  const effectiveLimit = student.maxWeeklyHours || allowedWeeklyHours;
  
  if (requestedHours != null && requestedHours > effectiveLimit) {
    canWork = false;
    reason = `Requested ${requestedHours}h exceeds the weekly limit of ${effectiveLimit}h. During ${inTermTime ? 'term time' : 'holidays'}, the maximum allowed is ${effectiveLimit}h per week.`;
  } else if (inTermTime) {
    reason = `Term time: Maximum ${effectiveLimit} hours per week allowed. Student can work up to ${effectiveLimit}h but not more.`;
  } else {
    reason = `Holiday period: Full-time work allowed. No weekly hour limit applies.`;
  }

  return {
    canWork,
    allowedWeeklyHours: effectiveLimit,
    inTermTime,
    activeTerm: activeTerm?.name ?? null,
    reason,
  };
}
