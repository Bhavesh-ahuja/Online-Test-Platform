// src/utils/datetime.js

// Local (IST) -> UTC ISO string (for backend)
export function localToUtc(localDateTime) {
  if (!localDateTime) return null;
  const localDate = new Date(localDateTime);
  return localDate.toISOString();
}

// UTC ISO string -> Local datetime-local format
export function utcToLocal(utcDateTime) {
  if (!utcDateTime) return '';

  const date = new Date(utcDateTime);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
