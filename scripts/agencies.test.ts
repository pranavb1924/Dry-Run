import { describe, expect, test } from 'vitest';
import { agencyName } from './agencies.ts';

describe('agencyName', () => {
  test('writes out abbreviated names', () => {
    expect(agencyName('S. W. OKLA. ST. UNIV.')).toBe('Southwestern Oklahoma State University');
    expect(agencyName('ROSE STATE COLEGE')).toBe('Rose State College');
  });

  test('title-cases the rest', () => {
    expect(agencyName('DEPARTMENT OF CORRECTIONS')).toBe('Department of Corrections');
    expect(agencyName('DEPARTMENT OF TOURISM AND RECREATION')).toBe('Department of Tourism & Recreation');
    expect(agencyName('OKLAHOMA STATE UNIVERSITY')).toBe('Oklahoma State University');
  });
});
