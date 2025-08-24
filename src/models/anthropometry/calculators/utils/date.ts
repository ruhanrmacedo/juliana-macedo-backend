export function getAgeYearsAt(dob?: Date, at?: Date): number | null {
  if (!dob) return null;
  const date = at ? new Date(at) : new Date();
  let years = date.getFullYear() - new Date(dob).getFullYear();
  const m = date.getMonth() - new Date(dob).getMonth();
  if (m < 0 || (m === 0 && date.getDate() < new Date(dob).getDate())) years--;
  return years;
}

export function getAgeMonthsAt(dob?: Date, at?: Date): number | null {
  if (!dob) return null;
  const d1 = new Date(dob);
  const d2 = at ? new Date(at) : new Date();
  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() < d1.getDate()) months--;
  return months;
}

export function betweenDates(from?: Date, to?: Date) {
  const start = from ?? new Date("1970-01-01T00:00:00Z");
  const end = to ?? new Date();
  return { start, end };
}
