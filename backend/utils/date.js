export function daysBetween(from, to) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(from);
  const d2 = new Date(to);
  return Math.round((d2 - d1) / msPerDay);
}

export function isOverlap(aStart, aEnd, bStart, bEnd) {
  const as = new Date(aStart);
  const ae = new Date(aEnd);
  const bs = new Date(bStart);
  const be = new Date(bEnd);
  return as < be && bs < ae;
}

export function isPast(date) {
  return new Date(date) < new Date();
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function toDateInput(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function now() {
  return new Date();
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
