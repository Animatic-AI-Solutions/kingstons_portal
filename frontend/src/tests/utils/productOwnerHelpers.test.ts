/**
 * Product Owner Helper Functions Tests (RED Phase)
 *
 * Tests for utility functions that process product owner data:
 * - Age calculation
 * - Full name formatting
 * - Status display
 */

import {
  calculateAge,
  formatFullName,
  getStatusBadgeColor,
  formatPhoneNumber,
  isProductOwnerComplete,
} from '@/utils/productOwnerHelpers';
import { createProductOwner, createMinimalProductOwner } from '../factories/productOwnerFactory';

describe('Product Owner Helpers', () => {
  describe('calculateAge', () => {
    describe('Happy Path', () => {
      it('should calculate correct age for person born 30 years ago', () => {
        const today = new Date();
        const birthDate = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
        const dob = birthDate.toISOString().split('T')[0];

        const age = calculateAge(dob);

        expect(age).toBe(30);
      });

      it('should calculate correct age for person born 45 years and 6 months ago', () => {
        const today = new Date();
        const birthDate = new Date(today.getFullYear() - 45, today.getMonth() - 6, today.getDate());
        const dob = birthDate.toISOString().split('T')[0];

        const age = calculateAge(dob);

        expect(age).toBe(45);
      });

      it('should calculate age of 0 for person born this year', () => {
        const today = new Date();
        const birthDate = new Date(today.getFullYear(), 0, 1);
        const dob = birthDate.toISOString().split('T')[0];

        const age = calculateAge(dob);

        expect(age).toBe(0);
      });

      it('should handle birthday that hasn\'t occurred yet this year', () => {
        const today = new Date();
        // Birth date is tomorrow in the past year
        const birthDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate() + 1);
        const dob = birthDate.toISOString().split('T')[0];

        const age = calculateAge(dob);

        // Should be 24, not 25, since birthday hasn't occurred
        expect(age).toBe(24);
      });
    });

    describe('Edge Cases', () => {
      it('should return null when dob is null', () => {
        const age = calculateAge(null);

        expect(age).toBeNull();
      });

      it('should return null when dob is undefined', () => {
        const age = calculateAge(undefined);

        expect(age).toBeNull();
      });

      it('should return null when dob is empty string', () => {
        const age = calculateAge('');

        expect(age).toBeNull();
      });

      it('should throw error for invalid date format', () => {
        const invalidDate = 'not-a-date';

        expect(() => calculateAge(invalidDate)).toThrow('Invalid date format');
      });

      it('should throw error for future date', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const dob = futureDate.toISOString().split('T')[0];

        expect(() => calculateAge(dob)).toThrow('Date of birth cannot be in the future');
      });

      it('should throw error for date more than 120 years ago', () => {
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 121);
        const dob = oldDate.toISOString().split('T')[0];

        expect(() => calculateAge(dob)).toThrow('Date of birth cannot be more than 120 years ago');
      });

      it('should handle leap year birthdays correctly', () => {
        const leapYearDob = '2000-02-29';

        const age = calculateAge(leapYearDob);

        expect(age).toBeGreaterThan(20);
        expect(typeof age).toBe('number');
      });
    });
  });

  describe('formatFullName', () => {
    describe('Happy Path', () => {
      it('should format name with all fields present', () => {
        const productOwner = createProductOwner({
          title: 'Dr',
          firstname: 'John',
          middle_names: 'William Robert',
          surname: 'Smith',
        });

        const fullName = formatFullName(productOwner);

        expect(fullName).toBe('Dr John William Robert Smith');
      });

      it('should format name with title, firstname and surname', () => {
        const productOwner = createProductOwner({
          title: 'Mrs',
          firstname: 'Jane',
          middle_names: null,
          surname: 'Doe',
        });

        const fullName = formatFullName(productOwner);

        expect(fullName).toBe('Mrs Jane Doe');
      });

      it('should format name without title', () => {
        const productOwner = createProductOwner({
          title: null,
          firstname: 'John',
          middle_names: null,
          surname: 'Smith',
        });

        const fullName = formatFullName(productOwner);

        expect(fullName).toBe('John Smith');
      });

      it('should use known_as when includeKnownAs is true', () => {
        const productOwner = createProductOwner({
          title: 'Mr',
          firstname: 'Jonathan',
          known_as: 'Johnny',
          surname: 'Smith',
        });

        const fullName = formatFullName(productOwner, { includeKnownAs: true });

        expect(fullName).toBe('Mr Jonathan "Johnny" Smith');
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing title gracefully', () => {
        const productOwner = createProductOwner({
          title: null,
          firstname: 'John',
          surname: 'Smith',
        });

        const fullName = formatFullName(productOwner);

        expect(fullName).not.toContain('null');
        expect(fullName).toBe('John Smith');
      });

      it('should throw error when surname is null', () => {
        const productOwner = createProductOwner({
          firstname: 'John',
          surname: null as any,
        });

        expect(() => formatFullName(productOwner)).toThrow('Surname is required');
      });

      it('should throw error when firstname is undefined', () => {
        const productOwner = {
          firstname: undefined,
          surname: 'Smith',
        } as any;

        expect(() => formatFullName(productOwner)).toThrow('Firstname is required');
      });

      it('should throw error when all fields are null', () => {
        const productOwner = {
          title: null,
          firstname: null,
          middle_names: null,
          surname: null,
        } as any;

        expect(() => formatFullName(productOwner)).toThrow('Firstname is required');
      });

      it('should handle empty string firstname', () => {
        const productOwner = createProductOwner({
          firstname: '',
          surname: 'Smith',
        });

        expect(() => formatFullName(productOwner)).toThrow('Firstname cannot be empty');
      });

      it('should handle whitespace-only names', () => {
        const productOwner = createProductOwner({
          firstname: '   ',
          surname: '   ',
        });

        expect(() => formatFullName(productOwner)).toThrow('Firstname cannot be empty');
      });

      it('should trim extra whitespace between name parts', () => {
        const productOwner = createProductOwner({
          title: 'Dr  ',
          firstname: '  John  ',
          middle_names: '  William  ',
          surname: '  Smith  ',
        });

        const fullName = formatFullName(productOwner);

        expect(fullName).toBe('Dr John William Smith');
        expect(fullName).not.toContain('  ');
      });
    });

    describe('Options', () => {
      it('should respect lastNameFirst option', () => {
        const productOwner = createProductOwner({
          title: 'Dr',
          firstname: 'John',
          surname: 'Smith',
        });

        const fullName = formatFullName(productOwner, { lastNameFirst: true });

        expect(fullName).toBe('Smith, Dr John');
      });

      it('should respect includeMiddleNames option', () => {
        const productOwner = createProductOwner({
          firstname: 'John',
          middle_names: 'William Robert',
          surname: 'Smith',
        });

        const fullName = formatFullName(productOwner, { includeMiddleNames: false });

        expect(fullName).toBe('John Smith');
        expect(fullName).not.toContain('William');
      });
    });
  });

  describe('getStatusBadgeColor', () => {
    it('should return green for active status', () => {
      const color = getStatusBadgeColor('active');

      expect(color).toBe('green');
    });

    it('should return gray for lapsed status', () => {
      const color = getStatusBadgeColor('lapsed');

      expect(color).toBe('gray');
    });

    it('should return red for deceased status', () => {
      const color = getStatusBadgeColor('deceased');

      expect(color).toBe('red');
    });

    it('should return default color for unknown status', () => {
      const color = getStatusBadgeColor('unknown' as any);

      expect(color).toBe('gray');
    });

    it('should handle null status', () => {
      const color = getStatusBadgeColor(null as any);

      expect(color).toBe('gray');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format UK mobile number', () => {
      const phone = formatPhoneNumber('07700900123');

      expect(phone).toBe('07700 900 123');
    });

    it('should format UK landline number', () => {
      const phone = formatPhoneNumber('02079460958');

      expect(phone).toBe('020 7946 0958');
    });

    it('should preserve international format', () => {
      const phone = formatPhoneNumber('+44 7700 900 123');

      expect(phone).toBe('+44 7700 900 123');
    });

    it('should return null for empty phone number', () => {
      const phone = formatPhoneNumber('');

      expect(phone).toBeNull();
    });

    it('should return null for null phone number', () => {
      const phone = formatPhoneNumber(null);

      expect(phone).toBeNull();
    });

    it('should handle phone numbers with various separators', () => {
      const phone = formatPhoneNumber('077-009-00123');

      expect(phone).toBe('07700 900 123');
    });
  });

  describe('isProductOwnerComplete', () => {
    it('should return true for product owner with all required fields', () => {
      const productOwner = createProductOwner({
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        dob: '1980-01-15',
        email_1: 'john@example.com',
        phone_1: '07700900123',
      });

      const isComplete = isProductOwnerComplete(productOwner);

      expect(isComplete).toBe(true);
    });

    it('should return false for product owner missing email', () => {
      const productOwner = createMinimalProductOwner({
        email_1: null,
        email_2: null,
      });

      const isComplete = isProductOwnerComplete(productOwner);

      expect(isComplete).toBe(false);
    });

    it('should return false for product owner missing phone', () => {
      const productOwner = createMinimalProductOwner({
        phone_1: null,
        phone_2: null,
      });

      const isComplete = isProductOwnerComplete(productOwner);

      expect(isComplete).toBe(false);
    });

    it('should return false for product owner missing date of birth', () => {
      const productOwner = createMinimalProductOwner({
        dob: null,
      });

      const isComplete = isProductOwnerComplete(productOwner);

      expect(isComplete).toBe(false);
    });

    it('should return true if only optional fields are missing', () => {
      const productOwner = createProductOwner({
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        dob: '1980-01-15',
        email_1: 'john@example.com',
        phone_1: '07700900123',
        middle_names: null,
        known_as: null,
        three_words: null,
      });

      const isComplete = isProductOwnerComplete(productOwner);

      expect(isComplete).toBe(true);
    });
  });
});
