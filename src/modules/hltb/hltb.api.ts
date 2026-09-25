import { z } from 'zod';
import type {
  HltbGame,
  HltbSearchGame,
  SearchHltbGamesInput,
} from './hltb.types';

const HLTB_BASE_URL = 'https://howlongtobeat.com';
const HLTB_SEARCH_PATH = '/api/search/site';
const HLTB_AUTH_CACHE_MS = 10 * 60 * 1_000;
const HLTB_SEARCH_CACHE_MS = 30 * 60 * 1_000;

const hltbAuthSchema = z.object({
  token: z.string().min(1),
});

const hltbSearchSchema = z.object({
  data: z.array(
    z.object({
      game_id: z.number().int(),
      game_name: z.string().min(1),
    }),
  ),
});

const hltbGamePageSchema = z.object({
  props: z.object({
    pageProps: z.object({
      game: z.object({
        data: z.object({
          game: z
            .array(
              z.object({
                game_id: z.number().int(),
                game_name: z.string().min(1),
                comp_main_l: z.number(),
                comp_main_med: z.number(),
                comp_plus_med: z.number(),
                comp_100_med: z.number(),
                comp_100_h: z.number(),
              }),
            )
            .min(1),
        }),
      }),
    }),
  }),
});

type HltbAuth = z.infer<typeof hltbAuthSchema>;
type HltbAuthCache = HltbAuth & { expiresAt: number };
type HltbSearchCache = { games: HltbSearchGame[]; expiresAt: number };

let authCache: HltbAuthCache | null = null;
const searchCache = new Map<string, HltbSearchCache>();

const buildRequestInit = (
  method: 'GET' | 'POST',
  signal: AbortSignal | undefined,
): RequestInit => {
  const requestInit: RequestInit = { method };
  if (signal) {
    requestInit.signal = signal;
  }

  return requestInit;
};

const setCommonHeaders = (headers: Record<string, string>) => {
  headers['User-Agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';
  headers['Accept-Language'] = 'en-US,en;q=0.9';
  headers.Referer = `${HLTB_BASE_URL}/`;
  headers.Origin = HLTB_BASE_URL;
};

const getSearchAuth = async (
  signal: AbortSignal | undefined,
  forceRefresh = false,
): Promise<HltbAuth> => {
  if (!forceRefresh && authCache && authCache.expiresAt > Date.now()) {
    return authCache;
  }

  const requestInit = buildRequestInit('GET', signal);
  const headers: Record<string, string> = { Accept: '*/*' };
  setCommonHeaders(headers);
  requestInit.headers = headers;

  const response = await fetch(
    `${HLTB_BASE_URL}${HLTB_SEARCH_PATH}/init?t=${Date.now()}`,
    requestInit,
  );
  if (!response.ok) {
    throw new Error(
      `HLTB search authorization failed: ${response.status} ${response.statusText}`,
    );
  }

  const parsed = hltbAuthSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('Invalid HLTB search authorization response.');
  }

  authCache = {
    ...parsed.data,
    expiresAt: Date.now() + HLTB_AUTH_CACHE_MS,
  };
  return parsed.data;
};

const buildSearchBody = (query: string) =>
  JSON.stringify({
    searchType: 'games',
    searchTerms: query.trim().split(' ').filter(Boolean),
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: '',
        sortCategory: 'popular',
        rangeCategory: 'main',
        rangeTime: { min: null, max: null },
        gameplay: {
          perspective: '',
          flow: '',
          genre: '',
          difficulty: '',
        },
        rangeYear: { min: '', max: '' },
        modifier: '',
      },
      users: { sortCategory: 'postcount' },
      lists: { sortCategory: 'follows' },
      filter: '',
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
  });

const postSearch = async (
  query: string,
  auth: HltbAuth,
  signal: AbortSignal | undefined,
) => {
  const requestInit = buildRequestInit('POST', signal);
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Content-Type': 'application/json',
    'x-auth-token': auth.token,
  };
  setCommonHeaders(headers);
  requestInit.headers = headers;
  requestInit.body = buildSearchBody(query);

  return fetch(`${HLTB_BASE_URL}${HLTB_SEARCH_PATH}`, requestInit);
};

const secondsToHours = (seconds: number): number | null =>
  seconds > 0 ? seconds / 3_600 : null;

const mapSearchGame = (
  game: z.infer<typeof hltbSearchSchema>['data'][number],
): HltbSearchGame => ({
  id: game.game_id,
  title: game.game_name,
});

export const getHltbGame = async (
  gameId: number,
  signal?: AbortSignal,
): Promise<HltbGame> => {
  const requestInit = buildRequestInit('GET', signal);
  const headers: Record<string, string> = { Accept: 'text/html' };
  setCommonHeaders(headers);
  requestInit.headers = headers;

  const response = await fetch(`${HLTB_BASE_URL}/game/${gameId}`, requestInit);
  if (!response.ok) {
    throw new Error(
      `HLTB game lookup failed: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const markerIndex = html.indexOf('__NEXT_DATA__');
  const jsonStart = html.indexOf('>', markerIndex) + 1;
  const jsonEnd = html.indexOf('</script>', jsonStart);
  if (markerIndex < 0 || jsonStart === 0 || jsonEnd < 0) {
    throw new Error('Invalid HLTB game response.');
  }

  const parsed = hltbGamePageSchema.safeParse(
    JSON.parse(html.slice(jsonStart, jsonEnd)),
  );
  if (!parsed.success) {
    throw new Error('Invalid HLTB game response.');
  }

  const game = parsed.data.props.pageProps.game.data.game[0];
  if (!game) {
    throw new Error('Invalid HLTB game response.');
  }

  return {
    id: game.game_id,
    title: game.game_name,
    mainStoryHours: secondsToHours(game.comp_main_med),
    mainExtraHours: secondsToHours(game.comp_plus_med),
    completionistHours: secondsToHours(game.comp_100_med),
    rushedMainStoryHours: secondsToHours(game.comp_main_l),
    leisureCompletionistHours: secondsToHours(game.comp_100_h),
  };
};

export const searchHltbGames = async ({
  query,
  signal,
}: SearchHltbGamesInput): Promise<HltbSearchGame[]> => {
  const cacheKey = query
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .join(' ');
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.games;
  }

  let auth = await getSearchAuth(signal);
  let response = await postSearch(query, auth, signal);
  if (response.status === 403) {
    await response.body?.cancel();
    auth = await getSearchAuth(signal, true);
    response = await postSearch(query, auth, signal);
  }

  if (!response.ok) {
    throw new Error(
      `HLTB search failed: ${response.status} ${response.statusText}`,
    );
  }

  const parsed = hltbSearchSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('Invalid HLTB search response.');
  }

  const games = parsed.data.data.map(mapSearchGame);
  searchCache.set(cacheKey, {
    games,
    expiresAt: Date.now() + HLTB_SEARCH_CACHE_MS,
  });

  return games;
};
