import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const guildId = process.env.DISCORD_STAGING_ENV_GUILD_ID;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

if (!guildId) {
  throw new Error('DISCORD_STAGING_ENV_GUILD_ID is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

async function main() {
  await prisma.guildConfig.upsert({
    where: { guildId },
    update: {
      canonicalTimezone: 'America/Sao_Paulo',
      currentWindowMinutes: 240,
      lookaheadDays: 21,
      defaultStreamKind: 'GAME',
    },
    create: {
      guildId,
      canonicalTimezone: 'America/Sao_Paulo',
      currentWindowMinutes: 240,
      lookaheadDays: 21,
      defaultStreamKind: 'GAME',
    },
  });

  await prisma.streamScheduleDefault.upsert({
    where: {
      guildId_weekday: {
        guildId,
        weekday: 'FRIDAY',
      },
    },
    update: {
      startMinutes: 15 * 60 + 10,
      durationMinutes: 240,
      isEnabled: true,
    },
    create: {
      guildId,
      weekday: 'FRIDAY',
      startMinutes: 15 * 60 + 10,
      durationMinutes: 240,
      isEnabled: true,
    },
  });

  await prisma.streamScheduleDefault.upsert({
    where: {
      guildId_weekday: {
        guildId,
        weekday: 'SATURDAY',
      },
    },
    update: {
      startMinutes: 15 * 60 + 10,
      durationMinutes: 240,
      isEnabled: true,
    },
    create: {
      guildId,
      weekday: 'SATURDAY',
      startMinutes: 15 * 60 + 10,
      durationMinutes: 240,
      isEnabled: true,
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
