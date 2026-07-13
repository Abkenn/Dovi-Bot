export const buildEmbeddedAppActivityUrl = (
  applicationId: string,
  gameName?: string | null,
) => {
  const url = new URL(`https://discord.com/activities/${applicationId}`);
  const cleanGameName = gameName?.trim();

  if (cleanGameName) {
    url.searchParams.set('custom_id', cleanGameName);
  }

  return url.toString();
};
