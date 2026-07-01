import { BOT_GUILDS } from '../../config/discord-access';
import type { ReactionEchoRule } from './reaction-echo.types';

const CHOCCY_MILK_STICKER_ID = '1521938428705640659';
const DOVI_EMOJI_ID = '1137629240259514369';

export const REACTION_ECHO_RULES = [
  {
    id: 'choccy-milk-sticker',
    guildIds: [BOT_GUILDS.STAGING_ENV, BOT_GUILDS.PROD_ENV],
    trigger: { kind: 'STICKER', stickerId: CHOCCY_MILK_STICKER_ID },
    response: { kind: 'STICKER', stickerId: CHOCCY_MILK_STICKER_ID },
    every: 20,
  },
  {
    id: 'dovi-emoji-general-gaming-talk',
    guildIds: [BOT_GUILDS.PROD_ENV],
    channelIds: ['1137094933711429659', '1137234211372269679'],
    trigger: { kind: 'CUSTOM_EMOJI', emojiId: DOVI_EMOJI_ID },
    response: { kind: 'REACTION', emojiId: DOVI_EMOJI_ID },
    every: 40,
  },
] as const satisfies readonly ReactionEchoRule[];
