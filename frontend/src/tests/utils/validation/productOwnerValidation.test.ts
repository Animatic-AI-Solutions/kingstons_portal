import { validateProductOwner } from '../../../utils/validation/productOwnerValidation';
import { ProductOwnerFormData, AddressFormData } from '../../../types/clientGroupForm';

describe('validateProductOwner', () => {
  const validData: ProductOwnerFormData = {
    status: 'active',
    firstname: 'John',
    surname: 'Smith',
    known_as: '',
    title: '',
    middle_names: '',
    relationship_status: '',
    gender: '',
    previous_names: '',
    dob: '1980-01-01',
    place_of_birth: '',
    email_1: 'john@example.com',
    email_2: '',
    phone_1: '+44 7700 900123',
    phone_2: '',
    moved_in_date: '',
    address_id: null,
    three_words: '',
    share_data_with: '',
    employment_status: '',
    occupation: '',
    passport_expiry_date: '',
    ni_number: '',
    aml_result: '',
    aml_date: '',
  };

  const emptyAddress: AddressFormData = {
    line_1: '',
    line_2: '',
    line_3: '',
    line_4: '',
    line_5: '',
  };

  describe('required fields', () => {
    it('should return error when firstname is empty', () => {
      const data = { ...validData, firstname: '' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.firstname).toContain('required');
    });

    it('should return error when surname is empty', () => {
      const data = { ...validData, surname: '' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.surname).toContain('required');
    });

    it('should return error when dob is empty', () => {
      const data = { ...validData, dob: '' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.dob).toContain('required');
    });

    it('should return error when dob is invalid date', () => {
      const data = { ...validData, dob: 'invalid-date' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.dob).toContain('valid');
    });

    it('should return error when dob is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const data = { ...validData, dob: futureDate.toISOString().split('T')[0] };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.dob).toContain('future');
    });

    it('should return error when dob is more than 120 years ago', () => {
      const data = { ...validData, dob: '1900-01-01' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.dob).toContain('120');
    });

    it('should return error when neither email_1 nor email_2 is provided', () => {
      const data = { ...validData, email_1: '', email_2: '' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.email_1).toContain('required');
    });

    it('should return null when only email_1 is provided', () => {
      const data = { ...validData, email_1: 'john@example.com', email_2: '' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).toBeNull();
    });

    it('should return null when only email_2 is provided', () => {
      const data = { ...validData, email_1: '', email_2: 'john@example.com' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).toBeNull();
    });

    it('should return error when neither phone_1 nor phone_2 is provided', () => {
      const data = { ...validData, phone_1: '', phone_2: '' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.phone_1).toContain('required');
    });

    it('should return null when only phone_1 is provided', () => {
      const data = { ...validData, phone_1: '+44 7700 900123', phone_2: '' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).toBeNull();
    });

    it('should return null when only phone_2 is provided', () => {
      const data = { ...validData, phone_1: '', phone_2: '+44 7700 900123' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).toBeNull();
    });
  });

  describe('optional field validation', () => {
    it('should return error when title is not in TITLE_OPTIONS', () => {
      const data = { ...validData, title: 'InvalidTitle' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.title).toContain('valid');
    });

    it('should return null for valid title options', () => {
      const titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof', 'Rev', 'Sir', 'Dame', 'Lord', 'Lady', 'Other'];
      titles.forEach(title => {
        const data = { ...validData, title };
        expect(validateProductOwner(data, emptyAddress)).toBeNull();
      });
    });

    it('should return error when middle_names exceeds 100 characters', () => {
      const data = { ...validData, middle_names: 'a'.repeat(101) };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.middle_names).toContain('100');
    });

    it('should return error when relationship_status is not in RELATIONSHIP_STATUS_OPTIONS', () => {
      const data = { ...validData, relationship_status: 'InvalidStatus' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.relationship_status).toContain('valid');
    });

    it('should return null for valid relationship status options', () => {
      const statuses = ['Single', 'Married', 'Divorced', 'Widowed', 'Civil Partnership', 'Separated', 'Cohabiting'];
      statuses.forEach(relationship_status => {
        const data = { ...validData, relationship_status };
        expect(validateProductOwner(data, emptyAddress)).toBeNull();
      });
    });

    it('should return error when gender is not in GENDER_OPTIONS', () => {
      const data = { ...validData, gender: 'InvalidGender' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.gender).toContain('valid');
    });

    it('should return null for valid gender options', () => {
      const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
      genders.forEach(gender => {
        const data = { ...validData, gender };
        expect(validateProductOwner(data, emptyAddress)).toBeNull();
      });
    });
  });

  describe('email validation', () => {
    it('should return error when email_1 is invalid format', () => {
      const data = { ...validData, email_1: 'invalid-email' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.email_1).toContain('valid');
    });

    it('should return error when email_2 is invalid format', () => {
      const data = { ...validData, email_2: 'invalid-email' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.email_2).toContain('valid');
    });

    it('should return null when both emails are valid', () => {
      const data = { ...validData, email_1: 'john@example.com', email_2: 'john.smith@example.co.uk' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });
  });

  describe('phone validation', () => {
    it('should return error when phone_1 is invalid format', () => {
      const data = { ...validData, phone_1: '123' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.phone_1).toContain('valid');
    });

    it('should return error when phone_2 is invalid format', () => {
      const data = { ...validData, phone_2: 'abc' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.phone_2).toContain('valid');
    });

    it('should return null when both phones are valid', () => {
      const data = { ...validData, phone_1: '07700900123', phone_2: '020 7946 0958' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });
  });

  describe('NI number validation', () => {
    it('should return error when ni_number is invalid format', () => {
      const data = { ...validData, ni_number: 'invalid' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.ni_number).toContain('valid');
    });

    it('should return null when ni_number is valid', () => {
      const data = { ...validData, ni_number: 'AB123456C' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });
  });

  describe('date field validation', () => {
    it('should return error when passport_expiry_date is invalid', () => {
      const data = { ...validData, passport_expiry_date: 'invalid-date' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.passport_expiry_date).toContain('valid');
    });

    it('should return null when passport_expiry_date is valid', () => {
      const data = { ...validData, passport_expiry_date: '2030-01-01' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });

    it('should return error when aml_date is invalid', () => {
      const data = { ...validData, aml_date: 'invalid-date' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.aml_date).toContain('valid');
    });

    it('should return null when aml_date is valid', () => {
      const data = { ...validData, aml_date: '2024-01-01' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });

    it('should return error when moved_in_date is invalid', () => {
      const data = { ...validData, moved_in_date: 'invalid-date' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.moved_in_date).toContain('valid');
    });

    it('should return error when moved_in_date is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const data = { ...validData, moved_in_date: futureDate.toISOString().split('T')[0] };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.moved_in_date).toContain('future');
    });

    it('should return null when moved_in_date is valid past date', () => {
      const data = { ...validData, moved_in_date: '2020-01-01' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });
  });

  describe('employment status validation', () => {
    it('should return error when employment_status is not in EMPLOYMENT_STATUS_OPTIONS', () => {
      const data = { ...validData, employment_status: 'InvalidStatus' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.employment_status).toContain('valid');
    });

    it('should return null for valid employment status options', () => {
      const statuses = ['Employed', 'Self-Employed', 'Retired', 'Unemployed', 'Student', 'Other'];
      statuses.forEach(employment_status => {
        const data = { ...validData, employment_status };
        expect(validateProductOwner(data, emptyAddress)).toBeNull();
      });
    });
  });

  describe('AML result validation', () => {
    it('should return error when aml_result is not in AML_RESULT_OPTIONS', () => {
      const data = { ...validData, aml_result: 'InvalidResult' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.aml_result).toContain('valid');
    });

    it('should return null for valid aml_result options', () => {
      const results = ['Pass', 'Fail', 'Pending'];
      results.forEach(aml_result => {
        const data = { ...validData, aml_result };
        expect(validateProductOwner(data, emptyAddress)).toBeNull();
      });
    });
  });

  describe('status validation', () => {
    it('should return error when status is not active or inactive', () => {
      const data = { ...validData, status: 'pending' as any };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.status).toContain('active');
    });

    it('should return null for active status', () => {
      const data = { ...validData, status: 'active' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });

    it('should return null for inactive status', () => {
      const data = { ...validData, status: 'inactive' };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });
  });

  describe('address validation', () => {
    it('should return error when address line_1 is missing but line_2 is provided', () => {
      const address: AddressFormData = {
        line_1: '',
        line_2: 'Apartment 4B',
        line_3: '',
        line_4: '',
        line_5: '',
      };
      const errors = validateProductOwner(validData, address);
      expect(errors).not.toBeNull();
      expect(errors?.['address.line_1']).toContain('required');
    });

    it('should return error when address line exceeds 100 characters', () => {
      const address: AddressFormData = {
        line_1: 'a'.repeat(101),
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: '',
      };
      const errors = validateProductOwner(validData, address);
      expect(errors).not.toBeNull();
      expect(errors?.['address.line_1']).toContain('100');
    });

    it('should return null when address is valid', () => {
      const address: AddressFormData = {
        line_1: '123 Main Street',
        line_2: 'Apartment 4B',
        line_3: 'Westminster',
        line_4: 'London',
        line_5: 'SW1A 1AA',
      };
      expect(validateProductOwner(validData, address)).toBeNull();
    });

    it('should return null when address is completely empty', () => {
      expect(validateProductOwner(validData, emptyAddress)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for valid minimal data', () => {
      const data: ProductOwnerFormData = {
        status: 'active',
        firstname: 'J',
        surname: 'S',
        known_as: '',
        title: '',
        middle_names: '',
        relationship_status: '',
        gender: '',
        previous_names: '',
        dob: '1980-01-01',
        place_of_birth: '',
        email_1: 'j@s.co',
        email_2: '',
        phone_1: '07700900123',
        phone_2: '',
        moved_in_date: '',
        address_id: null,
        three_words: '',
        share_data_with: '',
        employment_status: '',
        occupation: '',
        passport_expiry_date: '',
        ni_number: '',
        aml_result: '',
        aml_date: '',
      };
      expect(validateProductOwner(data, emptyAddress)).toBeNull();
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const data: ProductOwnerFormData = {
        status: 'pending' as any,
        firstname: '',
        surname: '',
        known_as: '',
        title: 'InvalidTitle',
        middle_names: '',
        relationship_status: '',
        gender: '',
        previous_names: '',
        dob: '',
        place_of_birth: '',
        email_1: '',
        email_2: '',
        phone_1: '',
        phone_2: '',
        moved_in_date: '',
        address_id: null,
        three_words: '',
        share_data_with: '',
        employment_status: '',
        occupation: '',
        passport_expiry_date: '',
        ni_number: '',
        aml_result: '',
        aml_date: '',
      };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.status).toBeDefined();
      expect(errors?.firstname).toBeDefined();
      expect(errors?.surname).toBeDefined();
      expect(errors?.dob).toBeDefined();
      expect(errors?.email_1).toBeDefined();
      expect(errors?.phone_1).toBeDefined();
    });

    it('should handle whitespace-only firstname', () => {
      const data = { ...validData, firstname: '   ' };
      const errors = validateProductOwner(data, emptyAddress);
      expect(errors).not.toBeNull();
      expect(errors?.firstname).toContain('required');
    });
  });
});
