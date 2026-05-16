import 'dotenv/config';

import { setupShutdown } from './app/setup-shutdown';
import { startBot } from './app/start-bot';
import { startHealthServer } from './app/start-health-server';
import { startMemoryLogger } from './app/start-memory-logger';

startMemoryLogger();
startHealthServer();
startBot({ shutdownHandler: setupShutdown });
