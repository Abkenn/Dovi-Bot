export const normalizeBossStatName = (value: string) =>
  value.trim().split(' ').filter(Boolean).join(' ').toLocaleLowerCase();
