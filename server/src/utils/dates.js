// I made this dates.js so every part of the server agrees on what "today" is:

// term dates are saved as midnight at the start of the day:
// so today has to be midnight too, otherwise the last day of term looks finished by 9am:
// the visa rules follow UK dates, so we use the date it is in the UK right now:
export function getTodayUk() {
  const ukDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  return new Date(ukDate);
}
