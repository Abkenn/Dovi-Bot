export const normalizeBossName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');
