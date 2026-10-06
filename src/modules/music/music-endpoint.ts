import { defineRpcEndpoint } from 'orpc-stack/endpoint';
import {
  musicFactsResponseSchema,
  musicSearchPageInputSchema,
  musicSearchPageSchema,
} from './music-activity.schema';

export const musicEndpoint = defineRpcEndpoint('/api/music/rpc', {
  facts: {
    output: musicFactsResponseSchema.shape.facts,
    responseValidator: musicFactsResponseSchema.shape.facts,
  },
  searchPage: {
    input: musicSearchPageInputSchema,
    output: musicSearchPageSchema,
    responseValidator: musicSearchPageSchema,
  },
});
