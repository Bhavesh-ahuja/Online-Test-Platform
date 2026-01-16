// frontend/src/utils/datetime.js

// Convert UTC date string → local datetime-local input format
export const utcToLocal = (utcString) => {
  if (!utcString) return '';
  const date = new Date(utcString);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

// Convert local datetime-local input → UTC ISO string
export const localToUtc = (localString) => {
  if (!localString) return null;
  const date = new Date(localString);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toISOString();
};
