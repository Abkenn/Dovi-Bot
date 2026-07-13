import { DiscordSDK } from '@discord/embedded-app-sdk';
import { useEffect, useState } from 'react';

export const useDiscordSdk = (clientId: string) => {
  const [customId, setCustomId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const discordSdk = new DiscordSDK(clientId);
    setCustomId(discordSdk.customId);
    void discordSdk.ready();
  }, [clientId]);

  return customId;
};
