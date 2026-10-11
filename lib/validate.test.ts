import { describe, it, expect } from 'vitest';
import { nameValid, emailValid, phoneValid } from './validate';

describe('nameValid', () => {
  it('rejects a single character', () => expect(nameValid('A')).toBe(false));
  it('accepts a real name', () => expect(nameValid('Ana')).toBe(true));
});

describe('emailValid', () => {
  it('rejects a string with no @', () => expect(emailValid('ana.test.com')).toBe(false));
  it('accepts a well-formed email', () => expect(emailValid('ana@test.com')).toBe(true));
});

describe('phoneValid', () => {
  it('rejects fewer than 7 digits', () => expect(phoneValid('123456')).toBe(false));
  it('accepts a 10-digit Colombian number regardless of formatting', () => expect(phoneValid('300 000 0000')).toBe(true));
});
