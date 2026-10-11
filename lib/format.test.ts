import { describe, it, expect } from 'vitest';
import { fmtTime, fmtDayLabel } from './format';

describe('fmtTime', () => {
  it('formats morning minutes as am', () => expect(fmtTime(360)).toBe('6:00 am'));
  it('formats afternoon minutes as pm', () => expect(fmtTime(1140)).toBe('7:00 pm'));
  it('formats noon as 12:00 m', () => expect(fmtTime(720)).toBe('12:00 m'));
});

describe('fmtDayLabel', () => {
  it('formats an ISO date as a long Spanish weekday label', () => {
    expect(fmtDayLabel('2026-11-02')).toBe('lunes, 2 de noviembre');
  });
});
