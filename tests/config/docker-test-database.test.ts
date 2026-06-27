import { describe, expect, it } from 'vitest';
import { buildDockerTestDatabaseUrl } from '../dal/docker-test-database';

describe('DAL Docker test database', () => {
  it('builds the database URL from Docker assigned port output', () => {
    expect(buildDockerTestDatabaseUrl('127.0.0.1:49153\n')).toBe(
      'postgresql://postgres:postgres@127.0.0.1:49153/dovi_bot_dal_test',
    );
  });

  it('rejects malformed Docker port output', () => {
    expect(() => buildDockerTestDatabaseUrl('')).toThrow(
      'Could not determine the DAL test PostgreSQL port',
    );
    expect(() => buildDockerTestDatabaseUrl('127.0.0.1:not-a-port')).toThrow(
      'Could not determine the DAL test PostgreSQL port',
    );
  });
});
