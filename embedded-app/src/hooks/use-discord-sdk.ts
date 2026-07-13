import { Common, DiscordSDK } from '@discord/embedded-app-sdk';
import { useEffect, useState } from 'react';

type ActivityLayoutUpdate = { layout_mode: number };
type OrientationUpdate = { screen_orientation: number };

const setActivityLayout = ({ layout_mode }: ActivityLayoutUpdate) => {
  document.documentElement.dataset.activityLayout =
    layout_mode === Common.LayoutModeTypeObject.PIP ? 'pip' : 'focused';
};

const setScreenOrientation = ({ screen_orientation }: OrientationUpdate) => {
  document.documentElement.dataset.screenOrientation =
    screen_orientation === Common.OrientationTypeObject.PORTRAIT
      ? 'portrait'
      : 'landscape';
};

export const useDiscordSdk = (clientId: string) => {
  const [customId, setCustomId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const discordSdk = new DiscordSDK(clientId);
    setCustomId(discordSdk.customId);

    let subscribed = false;
    void discordSdk.ready().then(async () => {
      await Promise.all([
        discordSdk.subscribe('ACTIVITY_LAYOUT_MODE_UPDATE', setActivityLayout),
        discordSdk.subscribe('ORIENTATION_UPDATE', setScreenOrientation),
      ]);
      subscribed = true;
    });

    return () => {
      if (subscribed) {
        void discordSdk.unsubscribe(
          'ACTIVITY_LAYOUT_MODE_UPDATE',
          setActivityLayout,
        );
        void discordSdk.unsubscribe('ORIENTATION_UPDATE', setScreenOrientation);
      }
      document.documentElement.removeAttribute('data-activity-layout');
      document.documentElement.removeAttribute('data-screen-orientation');
    };
  }, [clientId]);

  return customId;
};
