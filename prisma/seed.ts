import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

if (!process.env.DISCORD_GUILD_ID) {
  throw new Error('DISCORD_GUILD_ID is not set');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const guildId = process.env.DISCORD_GUILD_ID;

async function main() {
  await prisma.guildConfig.upsert({
    where: { guildId },
    update: {},
    create: {
      guildId,
      canonicalTimezone: 'UTC',
    },
  });

  await prisma.streamScheduleDefault.upsert({
    where: {
      guildId_weekday: {
        guildId,
        weekday: 'FRIDAY',
      },
    },
    update: {},
    create: {
      guildId,
      weekday: 'FRIDAY',
      startMinutes: 20 * 60,
      streamKind: 'MUSIC',
      musicMode: 'UNKNOWN',
    },
  });

  await prisma.streamScheduleDefault.upsert({
    where: {
      guildId_weekday: {
        guildId,
        weekday: 'SATURDAY',
      },
    },
    update: {},
    create: {
      guildId,
      weekday: 'SATURDAY',
      startMinutes: 20 * 60,
      streamKind: 'MUSIC',
      musicMode: 'UNKNOWN',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
