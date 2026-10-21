// I made this dates.js so the dashboards read term dates the same way everywhere:

// term dates are saved as midnight UTC, so we read them in UTC:
// this turns a saved date into a plain day like 2026-12-11 so it cannot move:
export function toDayKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

// the visa rules follow UK dates, so today is the date it is in the UK right now:
export function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
}

// this checks if today is inside a term, counting the first and the last day:
export function isTodayInTerm(term) {
  const today = getTodayKey()
  return toDayKey(term.startDate) <= today && today <= toDayKey(term.endDate)
}

// this counts whole days from today until a date (negative once it has passed):
export function daysFromToday(date) {
  const oneDay = 1000 * 60 * 60 * 24
  return Math.round((new Date(toDayKey(date)) - new Date(getTodayKey())) / oneDay)
}

// this moves a plain day forwards or backwards, like 2026-12-11 plus 1 is 2026-12-12:
export function addDays(dayKey, days) {
  const date = new Date(dayKey)
  date.setUTCDate(date.getUTCDate() + days)
  return toDayKey(date)
}

// this shows a saved date like 11 Dec 2026 without it moving back a day abroad:
export function formatDay(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}
