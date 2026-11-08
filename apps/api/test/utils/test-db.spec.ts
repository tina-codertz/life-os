import { assertTestDatabaseName, assertTestEnvironment, databaseNameFromUrl } from './test-db.js';

describe('test database guard', () => {
  it.each(['lifeos_test', 'anything_test'])('accepts %s', (name) => {
    expect(() => assertTestDatabaseName(name)).not.toThrow();
  });

  it.each(['lifeos_dev', 'lifeos', 'lifeos_test_backup', ''])('refuses %s', (name) => {
    expect(() => assertTestDatabaseName(name)).toThrow(/Refusing/);
  });

  it('reads the database name from a URL', () => {
    expect(databaseNameFromUrl('postgresql://u:p@localhost:5433/lifeos_test?schema=public')).toBe(
      'lifeos_test',
    );
  });
});

describe('test environment guard', () => {
  it('accepts NODE_ENV=test', () => {
    expect(() => assertTestEnvironment('test')).not.toThrow();
  });

  it.each(['development', 'production', undefined])('refuses NODE_ENV=%s', (nodeEnv) => {
    expect(() => assertTestEnvironment(nodeEnv)).toThrow(/Refusing/);
  });
});
