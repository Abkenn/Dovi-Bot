import { describe, expect, it } from 'vitest';
import {
  embedFieldToLabelValueRows,
  getEmbedFieldValue,
  textToLabelValueRows,
} from './discord-output';

describe('discord output test utils', () => {
  it('returns empty rows for empty text', () => {
    expect(textToLabelValueRows(null)).toEqual({});
    expect(textToLabelValueRows(undefined)).toEqual({});
    expect(textToLabelValueRows('')).toEqual({});
  });

  it('parses multiline label-value rows', () => {
    expect(textToLabelValueRows('Deaths: 2\nAvg attempt: 1m 5s')).toEqual({
      Deaths: '2',
      'Avg attempt': '1m 5s',
    });
  });

  it('rejects text that is not label-value shaped', () => {
    expect(() => textToLabelValueRows('No separator here')).toThrow(
      'Expected label-value line, got: No separator here',
    );
  });

  it('reads embed-like fields from raw objects and toJSON objects', () => {
    const rawEmbed = {
      fields: [{ name: 'Stats', value: 'Deaths: 1' }],
    };
    const jsonEmbed = {
      toJSON: () => rawEmbed,
    };

    expect(getEmbedFieldValue(rawEmbed, 'Stats')).toBe('Deaths: 1');
    expect(embedFieldToLabelValueRows(jsonEmbed, 'Stats')).toEqual({
      Deaths: '1',
    });
  });

  it('returns null for missing embed fields', () => {
    expect(getEmbedFieldValue({ fields: [] }, 'Missing')).toBeNull();
    expect(getEmbedFieldValue({}, 'Missing')).toBeNull();
  });
});
