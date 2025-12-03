import {
  isValidEmail,
  isValidNINumber,
  isValidDate,
  isFutureDate,
  isPastDate,
  isValidPhoneNumber,
} from '../../../utils/validation/commonValidators';

describe('commonValidators', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('john@example.com')).toBe(true);
      expect(isValidEmail('jane.doe@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@domain.com')).toBe(true);
      expect(isValidEmail('test_123@test-domain.org')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('user@example')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('   ')).toBe(false);
      expect(isValidEmail('a@b.c')).toBe(true);
    });
  });

  describe('isValidNINumber', () => {
    it('should return true for valid UK NI numbers', () => {
      expect(isValidNINumber('AB123456C')).toBe(true);
      expect(isValidNINumber('ab123456c')).toBe(true);
      expect(isValidNINumber('AB 12 34 56 C')).toBe(true);
      expect(isValidNINumber('JY123456D')).toBe(true);
    });

    it('should return false for invalid NI numbers', () => {
      expect(isValidNINumber('')).toBe(false);
      expect(isValidNINumber('123456789')).toBe(false);
      expect(isValidNINumber('A1234567C')).toBe(false);
      expect(isValidNINumber('ABC123456C')).toBe(false);
    });

    it('should reject excluded prefixes', () => {
      expect(isValidNINumber('BG123456C')).toBe(false);
      expect(isValidNINumber('GB123456C')).toBe(false);
      expect(isValidNINumber('NK123456C')).toBe(false);
      expect(isValidNINumber('KN123456C')).toBe(false);
      expect(isValidNINumber('TN123456C')).toBe(false);
      expect(isValidNINumber('NT123456C')).toBe(false);
      expect(isValidNINumber('ZZ123456C')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidNINumber('   ')).toBe(false);
      expect(isValidNINumber('AB123456')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid ISO date strings', () => {
      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('1980-12-31')).toBe(true);
      expect(isValidDate('2000-06-15')).toBe(true);
    });

    it('should return false for invalid date strings', () => {
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false);
      expect(isValidDate('2024-01-32')).toBe(false);
      expect(isValidDate('01/01/2024')).toBe(false);
      expect(isValidDate('2024/01/01')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidDate('   ')).toBe(false);
      expect(isValidDate('2024-02-29')).toBe(true); // leap year
      expect(isValidDate('2023-02-29')).toBe(false); // not leap year
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      expect(isFutureDate(futureDateStr)).toBe(true);
    });

    it('should return false for past dates', () => {
      expect(isFutureDate('2020-01-01')).toBe(false);
    });

    it('should return false for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isFutureDate(today)).toBe(false);
    });

    it('should handle invalid dates', () => {
      expect(isFutureDate('')).toBe(false);
      expect(isFutureDate('invalid')).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('should return true for past dates', () => {
      expect(isPastDate('2020-01-01')).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      expect(isPastDate(futureDateStr)).toBe(false);
    });

    it('should return false for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isPastDate(today)).toBe(false);
    });

    it('should handle invalid dates', () => {
      expect(isPastDate('')).toBe(false);
      expect(isPastDate('invalid')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid UK phone numbers', () => {
      expect(isValidPhoneNumber('+44 7700 900123')).toBe(true);
      expect(isValidPhoneNumber('07700900123')).toBe(true);
      expect(isValidPhoneNumber('020 7946 0958')).toBe(true);
      expect(isValidPhoneNumber('(020) 7946 0958')).toBe(true);
      expect(isValidPhoneNumber('+447700900123')).toBe(true);
      expect(isValidPhoneNumber('01632 960123')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abcdefghij')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidPhoneNumber('   ')).toBe(false);
      expect(isValidPhoneNumber('0')).toBe(false);
    });
  });
});
