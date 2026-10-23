import { getTodayUk } from "./dates.js";

// these are the only visa types a student can pick when they sign up:
// the website shows the same list in its dropdown:
export const VISA_TYPES = ["Student Visa (Tier 4)", "Graduate Route Visa"];

// this checks for the graduate visa, which has no weekly hours limit:
// any other value (including old accounts) gets the stricter student visa rules:
export const isGraduateVisa = (visaType) => visaType === "Graduate Route Visa";

// this is the full time number we show when no weekly limit applies:
const FULL_TIME_HOURS = 40;

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
  const tooMany = (limit) => requestedHours != null && requestedHours > limit;

  // GRADUATE VISA: no term rules and no weekly limit, only the student's own lower limit:
  if (isGraduateVisa(student.visaType)) {
    const limit = applyPersonalLimit(FULL_TIME_HOURS, student.maxWeeklyHours);
    const personalLimitApplied = limit < FULL_TIME_HOURS;
    return {
      canWork: !tooMany(limit),
      allowedWeeklyHours: limit,
      inTermTime: false,
      termsMissing: false,
      termsIncomplete: false,
      noHoursLimit: !personalLimitApplied,
      personalLimitApplied,
      visaRule: "GRADUATE",
      activeTerm: null,
      termCount: 0,
      confirmedTermCount: 0,
      datesUnconfirmed: false,
      reason: personalLimitApplied
        ? `Graduate visa: the law sets no weekly limit, but the student has set their own limit of ${limit} hours per week.`
        : "Graduate visa: no weekly hours limit applies, so term dates are not needed.",
    };
  }

  // Course finished = no work
  if (student.courseEndDate && today > student.courseEndDate) {
    return {
      canWork: false,
      allowedWeeklyHours: 0,
      inTermTime: false,
      termsMissing: false,
      termsIncomplete: false,
      noHoursLimit: false,
      visaRule: "STUDENT",
      activeTerm: null,
      termCount: 0,
      confirmedTermCount: 0,
      datesUnconfirmed: false,
      reason: "Course has ended",
    };
  }

  // this loads every term once, oldest first, so we can find today's term and the last one:
  const terms = await prisma.term.findMany({
    where: { studentId: student.id },
    orderBy: { startDate: "asc" },
  });
  const activeTerm = terms.find((term) => term.startDate <= today && term.endDate >= today) || null;
  const inTermTime = !!activeTerm;
  const lastTermEnd = terms.reduce((latest, term) => (term.endDate > latest ? term.endDate : latest), new Date(0));

  // this counts how many terms the student has confirmed, so employers can see if the dates are checked:
  const confirmedTermCount = terms.filter((term) => term.confirmedAt).length;
  const shared = {
    visaRule: "STUDENT",
    termCount: terms.length,
    confirmedTermCount,
    datesUnconfirmed: terms.length > 0 && confirmedTermCount < terms.length,
    noHoursLimit: false,
  };

  // if the student has not added any term dates we cannot know if it is a holiday:
  // the same goes for the time after their last term when the course has not ended yet (like a missing summer term):
  // so we play it safe and use the term time limit until they add their dates:
  const termsMissing = terms.length === 0;
  const termsIncomplete = !termsMissing && !inTermTime && today > lastTermEnd;

  if (termsMissing || termsIncomplete) {
    // the custom limit is only used if the student set a lower one:
    const safeLimit = applyPersonalLimit(20, student.maxWeeklyHours);
    const whyUnknown = termsMissing
      ? "The student has not added their term dates yet"
      : "The student's last declared term has ended but their course has not, so the next term dates are missing";

    return {
      ...shared,
      canWork: !tooMany(safeLimit),
      allowedWeeklyHours: safeLimit,
      inTermTime: false,
      termsMissing,
      termsIncomplete,
      personalLimitApplied: safeLimit < 20,
      activeTerm: null,
      reason: tooMany(safeLimit)
        ? `Requested ${requestedHours}h exceeds the safe limit of ${safeLimit}h. ${whyUnknown}, so the term time limit applies.`
        : `${whyUnknown}. Until they are added, treat this as term time: maximum ${safeLimit} hours per week.`,
    };
  }

  // Determine allowed hours based on course level:
  // BELOW_DEGREE = 10 hours, DEGREE_OR_ABOVE or null = 20 hours, holidays are full time:
  let allowedWeeklyHours = FULL_TIME_HOURS;
  if (inTermTime) {
    allowedWeeklyHours = activeTerm.courseLevel === "BELOW_DEGREE" ? 10 : 20;
  }

  // this uses the students own limit only when it is stricter than the law:
  const effectiveLimit = applyPersonalLimit(allowedWeeklyHours, student.maxWeeklyHours);
  const personalLimitApplied = effectiveLimit < allowedWeeklyHours;

  // this explains the rule in words, starting with the most important case:
  let canWork = true;
  let reason;
  if (tooMany(effectiveLimit)) {
    canWork = false;
    reason = `Requested ${requestedHours}h exceeds the weekly limit of ${effectiveLimit}h. During ${inTermTime ? "term time" : "holidays"}, the maximum allowed is ${effectiveLimit}h per week.`;
  } else if (inTermTime) {
    reason = `Term time: Maximum ${effectiveLimit} hours per week allowed. Student can work up to ${effectiveLimit}h but not more.`;
  } else if (personalLimitApplied) {
    // this explains a holiday limit that comes from the student not the law:
    reason = `Holiday period: the law allows full-time work, but the student has set their own limit of ${effectiveLimit} hours per week.`;
  } else {
    reason = `Holiday period: Full-time work allowed. No weekly hour limit applies.`;
  }

  return {
    ...shared,
    canWork,
    allowedWeeklyHours: effectiveLimit,
    inTermTime,
    termsMissing: false,
    termsIncomplete: false,
    personalLimitApplied,
    activeTerm: activeTerm?.name ?? null,
    activeTermEnd: activeTerm?.endDate ?? null,
    activeTermConfirmed: activeTerm ? !!activeTerm.confirmedAt : null,
    reason,
  };
}
