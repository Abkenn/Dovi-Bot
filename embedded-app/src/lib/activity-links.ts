type ActivityLinkOpener = (url: string) => Promise<void>;
let activeOpener: ActivityLinkOpener | null = null;

export const registerActivityLinkOpener = (opener: ActivityLinkOpener) => {
  activeOpener = opener;
  return () => {
    if (activeOpener === opener) activeOpener = null;
  };
};

export const getActivityLinkOpener = () => activeOpener;
