import { describe, expect, test } from 'vitest';
import { fakeNames } from './names.ts';

describe('fakeNames', () => {
  const people = Array.from({ length: 500 }, (_, i) => ({ lastName: `PERSON${i}`, firstInitial: 'A' }));

  test('gives everyone a distinct name', () => {
    expect(new Set(fakeNames(people)).size).toBe(people.length);
  });

  test('gives the same names on every run', () => {
    expect(fakeNames(people)).toEqual(fakeNames(people));
  });

  test("never gives a person a name that matches their own last name and initial", () => {
    const smiths = Array.from({ length: 300 }, () => ({ lastName: 'SMITH', firstInitial: 'J' }));
    for (const name of fakeNames(smiths)) {
      expect(name).not.toMatch(/^J\w* Smith$/);
    }
  });
});
