
// Weekly Hours Calculation Utilities
// Functions to calculate and track weekly work hours for compliance:

/**
 * Get the start of the week (Monday) for a given date
 * @param {Date} date - Any date in the week
 * @returns {Date} - Start of week (Monday 00:00:00)
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the end of the week (Sunday) for a given date
 * @param {Date} date - Any date in the week
 * @returns {Date} - End of week (Sunday 23:59:59)
 */
export function getWeekEnd(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Calculate total hours worked in a specific week
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {number} studentId - Student ID
 * @param {Date} weekStart - Start of the week (optional, defaults to current week)
 * @returns {Promise<Object>} - { totalHours, shifts, weekStart, weekEnd }
 */
export async function getWeeklyHours(prisma, studentId, weekStart = null) {
  const start = weekStart ? getWeekStart(weekStart) : getWeekStart();
  const end = getWeekEnd(start);

  const shifts = await prisma.workShift.findMany({
    where: {
      studentId,
      date: {
        gte: start,
        lte: end,
      },
      status: "CONFIRMED", // Only count confirmed shifts
    },
    orderBy: {
      date: "asc",
    },
  });

  // Sum up hours (convert Decimal to Number)
  const totalHours = shifts.reduce((sum, shift) => {
    return sum + Number(shift.hours);
  }, 0);

  return {
    totalHours: parseFloat(totalHours.toFixed(2)),
    shifts,
    weekStart: start,
    weekEnd: end,
    shiftCount: shifts.length,
  };
}

/**
 * Check if adding hours would exceed weekly limit
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {number} studentId - Student ID
 * @param {number} additionalHours - Hours to add
 * @param {Date} date - Date of the shift (to determine which week)
 * @param {number} allowedWeeklyHours - Maximum allowed hours per week
 * @returns {Promise<Object>} - { wouldExceed, currentHours, newTotal, remaining }
 */
export async function checkWeeklyLimit(
  prisma,
  studentId,
  additionalHours,
  date,
  allowedWeeklyHours
) {
  const weeklyData = await getWeeklyHours(prisma, studentId, date);
  const currentHours = weeklyData.totalHours;
  const newTotal = currentHours + additionalHours;
  const wouldExceed = newTotal > allowedWeeklyHours;
  const remaining = Math.max(0, allowedWeeklyHours - currentHours);

  return {
    wouldExceed,
    currentHours,
    newTotal: parseFloat(newTotal.toFixed(2)),
    remaining: parseFloat(remaining.toFixed(2)),
    allowedWeeklyHours,
    weekStart: weeklyData.weekStart,
    weekEnd: weeklyData.weekEnd,
  };
}

/**
 * Get hours worked across multiple weeks (for reporting)
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {number} studentId - Student ID
 * @param {Date} startDate - Start date for the range
 * @param {Date} endDate - End date for the range
 * @returns {Promise<Object>} - { totalHours, shifts, weeklyBreakdown }
 */
export async function getHoursInRange(
  prisma,
  studentId,
  startDate,
  endDate
) {
  const shifts = await prisma.workShift.findMany({
    where: {
      studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: "CONFIRMED",
    },
    orderBy: {
      date: "asc",
    },
  });

  const totalHours = shifts.reduce((sum, shift) => {
    return sum + Number(shift.hours);
  }, 0);

  // Group by week for breakdown
  const weeklyBreakdown = {};
  shifts.forEach((shift) => {
    const weekStart = getWeekStart(shift.date);
    const weekKey = weekStart.toISOString().split("T")[0];
    
    if (!weeklyBreakdown[weekKey]) {
      weeklyBreakdown[weekKey] = {
        weekStart,
        totalHours: 0,
        shifts: [],
      };
    }
    
    weeklyBreakdown[weekKey].totalHours += Number(shift.hours);
    weeklyBreakdown[weekKey].shifts.push(shift);
  });

  // Convert totals to numbers
  Object.keys(weeklyBreakdown).forEach((key) => {
    weeklyBreakdown[key].totalHours = parseFloat(
      weeklyBreakdown[key].totalHours.toFixed(2)
    );
  });

  return {
    totalHours: parseFloat(totalHours.toFixed(2)),
    shifts,
    weeklyBreakdown,
    startDate,
    endDate,
  };
}

