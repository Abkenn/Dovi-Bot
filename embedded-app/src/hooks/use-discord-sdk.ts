import { DiscordSDK } from '@discord/embedded-app-sdk';
import { useEffect } from 'react';

export const useDiscordSdk = (clientId: string) => {
  useEffect(() => {
    if (!clientId) {
      return;
    }

    const discordSdk = new DiscordSDK(clientId);
    void discordSdk.ready();
  }, [clientId]);
};
