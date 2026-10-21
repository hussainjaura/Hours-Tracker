import { getTodayUk } from "./dates.js";

// this picks the hours limit to use: the law sets the maximum:
// a student's own limit can only make it lower, never higher:
function applyPersonalLimit(legalLimit, personalLimit) {
  if (personalLimit && personalLimit < legalLimit) {
    return personalLimit;
  }
  return legalLimit;
}

export async function getWorkEligibility(prisma, student, requestedHours = null) {
  if (!student?.id) {
    throw new Error("Invalid student object passed to getWorkEligibility");
  }

  // today is the UK date at midnight, so the last day of term still counts as term time:
  const today = getTodayUk();

  // Course finished = no work
  if (student.courseEndDate && today > student.courseEndDate) {
    return {
      canWork: false,
      allowedWeeklyHours: 0,
      inTermTime: false,
      activeTerm: null,
      reason: "Course has ended",
    };
  }

  // Find active term:
  const activeTerm = await prisma.term.findFirst({
    where: {
      studentId: student.id,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });

  const inTermTime = !!activeTerm;

  // if the student has not added any term dates we cannot know if it is a holiday:
  // so we play it safe and use the term time limit until they add their dates:
  const termCount = await prisma.term.count({
    where: { studentId: student.id },
  });
  const termsMissing = termCount === 0;

  if (termsMissing) {
    // the custom limit is only used if the student set a lower one:
    const safeLimit = applyPersonalLimit(20, student.maxWeeklyHours);
    const tooManyHours = requestedHours != null && requestedHours > safeLimit;

    return {
      canWork: !tooManyHours,
      allowedWeeklyHours: safeLimit,
      inTermTime: false,
      termsMissing: true,
      personalLimitApplied: safeLimit < 20,
      activeTerm: null,
      reason: tooManyHours
        ? `Requested ${requestedHours}h exceeds the safe limit of ${safeLimit}h. The student has not added their term dates yet, so the term time limit applies.`
        : `No term dates added yet. Until the student adds them, treat this as term time: maximum ${safeLimit} hours per week.`,
    };
  }

  // Determine allowed hours based on course level:
  // Default to full-time which are holidays:
  let allowedWeeklyHours = 40;
  if (inTermTime) {
    // BELOW_DEGREE = 10 hours, DEGREE_OR_ABOVE or null = 20 hours
    if (activeTerm.courseLevel === 'BELOW_DEGREE') {
      allowedWeeklyHours = 10;
    } else {
      // DEGREE_OR_ABOVE or null/undefined
      allowedWeeklyHours = 20;
    }
  }

  // Compliance rules no hour tracking just rules:
  let canWork = true;
  let reason = inTermTime
    ? `In ${activeTerm?.name || 'term time'} - Maximum ${allowedWeeklyHours} hours per week allowed`
    : "Outside term time - Full-time work allowed (no weekly limit)";

  // this uses the students own limit only when it is stricter than the law:
  const effectiveLimit = applyPersonalLimit(allowedWeeklyHours, student.maxWeeklyHours);
  const personalLimitApplied = effectiveLimit < allowedWeeklyHours;

  if (requestedHours != null && requestedHours > effectiveLimit) {
    canWork = false;
    reason = `Requested ${requestedHours}h exceeds the weekly limit of ${effectiveLimit}h. During ${inTermTime ? 'term time' : 'holidays'}, the maximum allowed is ${effectiveLimit}h per week.`;
  } else if (inTermTime) {
    reason = `Term time: Maximum ${effectiveLimit} hours per week allowed. Student can work up to ${effectiveLimit}h but not more.`;
  } else if (personalLimitApplied) {
    // this explains a holiday limit that comes from the student not the law:
    reason = `Holiday period: the law allows full-time work, but the student has set their own limit of ${effectiveLimit} hours per week.`;
  } else {
    reason = `Holiday period: Full-time work allowed. No weekly hour limit applies.`;
  }

  return {
    canWork,
    allowedWeeklyHours: effectiveLimit,
    inTermTime,
    termsMissing: false,
    personalLimitApplied,
    activeTerm: activeTerm?.name ?? null,
    reason,
  };
}
