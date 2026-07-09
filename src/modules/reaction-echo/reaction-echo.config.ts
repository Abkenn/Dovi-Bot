import { BOT_GUILDS } from '../../config/discord-access';
import type { ReactionEchoRule } from './reaction-echo.types';

const CHOCCY_MILK_STICKER_ID = '1521938428705640659';
const CHOCCY_MILK_EMOJI_ID = '1521938270290841680';
const DOVI_EMOJI_ID = '1137629240259514369';

type TrackableReactionEcho = ReactionEchoRule & { label: string };

export const TRACKABLE_REACTION_ECHOES = {
  choccyMilk: {
    label: 'Choccy Milk',
    id: 'choccy-milk-sticker',
    guildIds: [BOT_GUILDS.STAGING_ENV, BOT_GUILDS.PROD_ENV],
    triggers: [
      { kind: 'STICKER', stickerId: CHOCCY_MILK_STICKER_ID },
      { kind: 'CUSTOM_EMOJI', emojiId: CHOCCY_MILK_EMOJI_ID },
    ],
    response: { kind: 'STICKER', stickerId: CHOCCY_MILK_STICKER_ID },
    threshold: 20,
  },
  doviEmoji: {
    label: 'Dovi Emoji',
    id: 'dovi-emoji-general-gaming-talk',
    guildIds: [BOT_GUILDS.PROD_ENV],
    channelIds: ['1137094933711429659', '1137234211372269679'],
    triggers: [{ kind: 'CUSTOM_EMOJI', emojiId: DOVI_EMOJI_ID }],
    response: { kind: 'REACTION', emojiId: DOVI_EMOJI_ID },
    threshold: 20,
  },
} as const satisfies Record<string, TrackableReactionEcho>;

export const REACTION_ECHO_RULES = Object.values(TRACKABLE_REACTION_ECHOES);
