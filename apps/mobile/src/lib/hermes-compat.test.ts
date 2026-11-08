/// <reference types="node" />
// Node types for this test only: it reads source files. App code must not use Node APIs.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { reversed, sorted } from './arrays';

// Array methods newer than the Hermes engine in Expo Go. Jest runs on Node, which has them, so a
// screen using one passes its tests and then crashes on the phone ("undefined is not a
// function", 2026-11-08). This scans app code (not tests) so it can't happen again.
const MISSING_ON_HERMES =
  /\.(toSorted|toReversed|toSpliced|findLast|findLastIndex)\(|\b(Object|Map)\.groupBy\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

it('app code uses no array methods the phone (Hermes) lacks', () => {
  const roots = [join(__dirname, '..'), join(__dirname, '../../../../packages/shared/src')];
  const offenders = roots
    .flatMap(sourceFiles)
    .filter((file) => !file.endsWith('.spec.ts'))
    .filter((file) => MISSING_ON_HERMES.test(readFileSync(file, 'utf8')));
  expect(offenders).toEqual([]);
});

it('sorted / reversed copy, leaving the original as it was', () => {
  const original = [3, 1, 2];
  expect(sorted(original)).toEqual([1, 2, 3]);
  expect(sorted(original, (a, b) => b - a)).toEqual([3, 2, 1]);
  expect(reversed(original)).toEqual([2, 1, 3]);
  expect(original).toEqual([3, 1, 2]);
});
