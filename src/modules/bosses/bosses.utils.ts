export const normalizeBossName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

export const resolveGameStatsGameName = (
  gameName: string | null,
  defaultGameName: string | null,
) => {
  const resolvedGameName = gameName?.trim() || defaultGameName?.trim();

  if (!resolvedGameName) {
    throw new Error('Set the stream game first, or pass game in this command.');
  }

  return resolvedGameName;
};
