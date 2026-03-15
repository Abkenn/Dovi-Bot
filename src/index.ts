import 'dotenv/config';

import { setupShutdown } from './app/setup-shutdown';
import { startBot } from './app/start-bot';
import { startHealthServer } from './app/start-health-server';

startHealthServer();
startBot({ shutdownHandler: setupShutdown });
