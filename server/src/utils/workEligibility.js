import { getWeeklyHours } from "./weeklyHours.js";

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
      currentWeeklyHours: 0,
      remainingWeeklyHours: 0,
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

  // 3️⃣ Get current week's hours worked
  const weeklyData = await getWeeklyHours(prisma, student.id, today);
  const currentWeeklyHours = weeklyData.totalHours;
  const remainingWeeklyHours = Math.max(0, allowedWeeklyHours - currentWeeklyHours);

  // 4️⃣ Check if requested hours would exceed limit
  let canWork = true;
  let reason = inTermTime
    ? `In ${activeTerm.name} term`
    : "Outside term time";

  if (requestedHours != null) {
    const wouldExceed = (currentWeeklyHours + requestedHours) > allowedWeeklyHours;
    canWork = !wouldExceed && requestedHours <= allowedWeeklyHours;
    
    if (wouldExceed) {
      reason = `Would exceed weekly limit. Current: ${currentWeeklyHours}h, Requested: ${requestedHours}h, Limit: ${allowedWeeklyHours}h`;
    } else if (currentWeeklyHours >= allowedWeeklyHours) {
      canWork = false;
      reason = `Weekly limit already reached. Current: ${currentWeeklyHours}h, Limit: ${allowedWeeklyHours}h`;
    }
  } else if (currentWeeklyHours >= allowedWeeklyHours) {
    canWork = false;
    reason = `Weekly limit already reached. Current: ${currentWeeklyHours}h, Limit: ${allowedWeeklyHours}h`;
  }

  return {
    canWork,
    allowedWeeklyHours,
    currentWeeklyHours: parseFloat(currentWeeklyHours.toFixed(2)),
    remainingWeeklyHours: parseFloat(remainingWeeklyHours.toFixed(2)),
    inTermTime,
    activeTerm: activeTerm?.name ?? null,
    reason,
    weekStart: weeklyData.weekStart,
    weekEnd: weeklyData.weekEnd,
  };
}
