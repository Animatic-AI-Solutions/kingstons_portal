import { validateAddress } from '../../../utils/validation/addressValidation';
import { AddressFormData } from '../../../types/clientGroupForm';

describe('validateAddress', () => {
  describe('when all fields are empty', () => {
    it('should return null (valid)', () => {
      const data: AddressFormData = {
        line_1: '',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: '',
      };
      expect(validateAddress(data)).toBeNull();
    });
  });

  describe('when line_1 is provided', () => {
    it('should return null for valid line_1', () => {
      const data: AddressFormData = {
        line_1: '123 Main Street',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: '',
      };
      expect(validateAddress(data)).toBeNull();
    });

    it('should return error when line_1 exceeds 100 characters', () => {
      const data: AddressFormData = {
        line_1: 'a'.repeat(101),
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: '',
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_1).toContain('100');
    });
  });

  describe('when other lines are provided without line_1', () => {
    it('should return error when line_2 has content but line_1 is empty', () => {
      const data: AddressFormData = {
        line_1: '',
        line_2: 'Apartment 4B',
        line_3: '',
        line_4: '',
        line_5: '',
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_1).toContain('required');
    });

    it('should return error when line_5 has content but line_1 is empty', () => {
      const data: AddressFormData = {
        line_1: '',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: 'Postcode AB12 3CD',
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_1).toContain('required');
    });
  });

  describe('max length validation for all lines', () => {
    it('should return error when line_2 exceeds 100 characters', () => {
      const data: AddressFormData = {
        line_1: '123 Main Street',
        line_2: 'a'.repeat(101),
        line_3: '',
        line_4: '',
        line_5: '',
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_2).toContain('100');
    });

    it('should return error when line_3 exceeds 100 characters', () => {
      const data: AddressFormData = {
        line_1: '123 Main Street',
        line_2: '',
        line_3: 'a'.repeat(101),
        line_4: '',
        line_5: '',
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_3).toContain('100');
    });

    it('should return error when line_4 exceeds 100 characters', () => {
      const data: AddressFormData = {
        line_1: '123 Main Street',
        line_2: '',
        line_3: '',
        line_4: 'a'.repeat(101),
        line_5: '',
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_4).toContain('100');
    });

    it('should return error when line_5 exceeds 100 characters', () => {
      const data: AddressFormData = {
        line_1: '123 Main Street',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: 'a'.repeat(101),
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_5).toContain('100');
    });
  });

  describe('valid complete addresses', () => {
    it('should return null for valid full address', () => {
      const data: AddressFormData = {
        line_1: '123 Main Street',
        line_2: 'Apartment 4B',
        line_3: 'Westminster',
        line_4: 'London',
        line_5: 'SW1A 1AA',
      };
      expect(validateAddress(data)).toBeNull();
    });

    it('should return null when only line_1 and line_5 are filled', () => {
      const data: AddressFormData = {
        line_1: '123 Main Street',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: 'SW1A 1AA',
      };
      expect(validateAddress(data)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace-only line_1', () => {
      const data: AddressFormData = {
        line_1: '   ',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: '',
      };
      // Whitespace-only should be treated as empty
      expect(validateAddress(data)).toBeNull();
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const data: AddressFormData = {
        line_1: 'a'.repeat(101),
        line_2: 'a'.repeat(101),
        line_3: '',
        line_4: '',
        line_5: '',
      };
      const errors = validateAddress(data);
      expect(errors).not.toBeNull();
      expect(errors?.line_1).toBeDefined();
      expect(errors?.line_2).toBeDefined();
    });
  });
});
