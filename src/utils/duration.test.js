import { describe, expect, it } from 'vitest';
import { MAX_GOAL_MINUTES, formatDuration, parseDuration, toHours } from './duration';

describe('parseDuration', () => {
  const valid = [
    ['1h 20min', 80],
    ['1h20m', 80],
    ['1 h 20', 80],
    ['1t 20min', 80],
    ['1H 20MIN', 80],
    ['90min', 90],
    ['90m', 90],
    ['90', 90],
    ['2h', 120],
    ['2t', 120],
    ['1.5h', 90],
    ['1,5h', 90],
    ['0,25h', 15],
    ['  45  ', 45],
    ['3 hours', 180],
    ['1 hour 5 minutes', 65],
  ];

  it.each(valid)('parses %s as %i minutes', (input, expected) => {
    expect(parseDuration(input)).toEqual({ minutes: expected });
  });

  const invalid = ['', '   ', '0', '-5', 'abc', '1h 70min', '1.5', 'h', 'min', '1h 20min 30s'];

  it.each(invalid)('rejects %s', (input) => {
    const result = parseDuration(input);
    expect(result.minutes).toBeUndefined();
    expect(typeof result.error).toBe('string');
  });

  it('rejects null and undefined', () => {
    expect(parseDuration(null).error).toBeTruthy();
    expect(parseDuration(undefined).error).toBeTruthy();
  });

  it('caps a single entry at 24h by default', () => {
    expect(parseDuration('24h')).toEqual({ minutes: 1440 });
    expect(parseDuration('25h').error).toBeTruthy();
  });

  it('allows a bigger ceiling for goals', () => {
    expect(parseDuration('40h', { maxMinutes: MAX_GOAL_MINUTES })).toEqual({ minutes: 2400 });
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0min'],
    [45, '45min'],
    [60, '1h'],
    [80, '1h 20min'],
    [120, '2h'],
    [1440, '24h'],
  ])('formats %i as %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });

  it('round-trips through parseDuration', () => {
    for (const minutes of [5, 59, 60, 61, 125, 480]) {
      expect(parseDuration(formatDuration(minutes))).toEqual({ minutes });
    }
  });
});

describe('toHours', () => {
  it('converts to one decimal place', () => {
    expect(toHours(80)).toBe(1.3);
    expect(toHours(120)).toBe(2);
    expect(toHours(0)).toBe(0);
  });
});
