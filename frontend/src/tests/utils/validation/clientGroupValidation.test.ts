import { validateClientGroup } from '../../../utils/validation/clientGroupValidation';
import { ClientGroupFormData } from '../../../types/clientGroupForm';

describe('validateClientGroup', () => {
  const validData: ClientGroupFormData = {
    name: 'Smith Family',
    type: 'Family',
    status: 'active',
    ongoing_start: '',
    client_declaration: '',
    privacy_declaration: '',
    full_fee_agreement: '',
    last_satisfactory_discussion: '',
    notes: '',
  };

  describe('required fields', () => {
    it('should return error when name is empty', () => {
      const data = { ...validData, name: '' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.name).toContain('required');
    });

    it('should return error when name is less than 2 characters', () => {
      const data = { ...validData, name: 'A' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.name).toContain('2');
    });

    it('should return error when name exceeds 200 characters', () => {
      const data = { ...validData, name: 'a'.repeat(201) };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.name).toContain('200');
    });

    it('should return error when type is empty', () => {
      const data = { ...validData, type: '' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.type).toContain('required');
    });

    it('should return error when type is not in CLIENT_GROUP_TYPES', () => {
      const data = { ...validData, type: 'InvalidType' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.type).toContain('valid');
    });

    it('should return error when status is empty', () => {
      const data = { ...validData, status: '' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.status).toContain('required');
    });

    it('should return error when status is not in STATUS_OPTIONS', () => {
      const data = { ...validData, status: 'pending' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.status).toContain('active');
    });
  });

  describe('valid client group types', () => {
    it('should return null for Individual type', () => {
      const data = { ...validData, type: 'Individual' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return null for Joint type', () => {
      const data = { ...validData, type: 'Joint' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return null for Family type', () => {
      const data = { ...validData, type: 'Family' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return null for Trust type', () => {
      const data = { ...validData, type: 'Trust' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return null for Corporate type', () => {
      const data = { ...validData, type: 'Corporate' };
      expect(validateClientGroup(data)).toBeNull();
    });
  });

  describe('ongoing_start field', () => {
    it('should return null when ongoing_start is empty for valid type', () => {
      const data = { ...validData, type: 'Family', ongoing_start: '' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return error when ongoing_start is invalid date', () => {
      const data = { ...validData, ongoing_start: 'invalid-date' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.ongoing_start).toContain('valid');
    });

    it('should return null when ongoing_start is valid date', () => {
      const data = { ...validData, ongoing_start: '2024-01-01' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return null when ongoing_start is empty', () => {
      const data = { ...validData, ongoing_start: '' };
      expect(validateClientGroup(data)).toBeNull();
    });
  });

  describe('optional date fields', () => {
    it('should return error when client_declaration is invalid date', () => {
      const data = { ...validData, client_declaration: 'invalid-date' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.client_declaration).toContain('valid');
    });

    it('should return null when client_declaration is valid date', () => {
      const data = { ...validData, client_declaration: '2024-01-01' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return error when privacy_declaration is invalid date', () => {
      const data = { ...validData, privacy_declaration: 'invalid-date' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.privacy_declaration).toContain('valid');
    });

    it('should return null when privacy_declaration is valid date', () => {
      const data = { ...validData, privacy_declaration: '2024-01-01' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return error when full_fee_agreement is invalid date', () => {
      const data = { ...validData, full_fee_agreement: 'invalid-date' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.full_fee_agreement).toContain('valid');
    });

    it('should return null when full_fee_agreement is valid date', () => {
      const data = { ...validData, full_fee_agreement: '2024-01-01' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return error when last_satisfactory_discussion is invalid date', () => {
      const data = { ...validData, last_satisfactory_discussion: 'invalid-date' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.last_satisfactory_discussion).toContain('valid');
    });

    it('should return null when last_satisfactory_discussion is valid date', () => {
      const data = { ...validData, last_satisfactory_discussion: '2024-01-01' };
      expect(validateClientGroup(data)).toBeNull();
    });
  });

  describe('notes field', () => {
    it('should return null when notes is empty', () => {
      const data = { ...validData, notes: '' };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return null when notes is within 1000 characters', () => {
      const data = { ...validData, notes: 'a'.repeat(1000) };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return error when notes exceeds 1000 characters', () => {
      const data = { ...validData, notes: 'a'.repeat(1001) };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.notes).toContain('1000');
    });
  });

  describe('edge cases', () => {
    it('should return null for valid minimal data', () => {
      const data: ClientGroupFormData = {
        name: 'AB',
        type: 'Individual',
        status: 'active',
        ongoing_start: '',
        client_declaration: '',
        privacy_declaration: '',
        full_fee_agreement: '',
        last_satisfactory_discussion: '',
        notes: '',
      };
      expect(validateClientGroup(data)).toBeNull();
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const data: ClientGroupFormData = {
        name: '',
        type: 'InvalidType',
        status: 'pending',
        ongoing_start: '',
        client_declaration: 'invalid-date',
        privacy_declaration: '',
        full_fee_agreement: '',
        last_satisfactory_discussion: '',
        notes: 'a'.repeat(1001),
      };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.name).toBeDefined();
      expect(errors?.type).toBeDefined();
      expect(errors?.status).toBeDefined();
      expect(errors?.client_declaration).toBeDefined();
      expect(errors?.notes).toBeDefined();
    });

    it('should handle whitespace-only name', () => {
      const data = { ...validData, name: '   ' };
      const errors = validateClientGroup(data);
      expect(errors).not.toBeNull();
      expect(errors?.name).toContain('required');
    });
  });
});
