type ActivityTargetGame = {
  id: string;
  name: string;
};

export const resolveActivityTargetGame = <Game extends ActivityTargetGame>(
  games: Game[],
  customId: string | null,
): Game | null => {
  const targetName = customId?.trim().toLocaleLowerCase();

  if (!targetName) {
    return null;
  }

  return (
    games.find((game) => game.name.toLocaleLowerCase() === targetName) ?? null
  );
};
