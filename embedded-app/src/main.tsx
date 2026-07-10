import { DiscordSDK } from '@discord/embedded-app-sdk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './index.css';

if (__DISCORD_CLIENT_ID__) {
  const discordSdk = new DiscordSDK(__DISCORD_CLIENT_ID__);
  void discordSdk.ready();
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
