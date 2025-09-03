// Form validation utilities

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateField = (value: any, rules: ValidationRule): ValidationResult => {
  const errors: string[] = [];

  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    errors.push('This field is required');
  }

  // Skip other validations if field is empty and not required
  if (!value && !rules.required) {
    return { isValid: true, errors: [] };
  }

  // String length validation
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength} characters`);
    }
  }

  // Pattern validation
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    errors.push('Invalid format');
  }

  // Custom validation
  if (rules.custom) {
    const customResult = rules.custom(value);
    if (customResult !== true) {
      errors.push(typeof customResult === 'string' ? customResult : 'Invalid value');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateForm = (data: Record<string, any>, rules: Record<string, ValidationRule>): Record<string, string> => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach(field => {
    const result = validateField(data[field], rules[field]);
    if (!result.isValid) {
      errors[field] = result.errors[0]; // Take the first error
    }
  });

  return errors;
};

// Common validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, // At least 8 chars, 1 letter, 1 number
  username: /^[a-zA-Z0-9_-]{3,20}$/, // 3-20 chars, letters, numbers, underscore, hyphen
  domain: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  port: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
};

// Common validation rules
export const rules = {
  email: {
    required: true,
    pattern: patterns.email
  } as ValidationRule,

  password: {
    required: true,
    minLength: 8,
    pattern: patterns.password
  } as ValidationRule,

  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: patterns.username
  } as ValidationRule,

  certificateName: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-_])*[a-zA-Z0-9]$/
  } as ValidationRule,

  tokenName: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-_])*[a-zA-Z0-9]$/
  } as ValidationRule,

  distinguishedName: {
    required: true,
    pattern: /^(CN|cn)=.*$/,
    custom: (value: string) => {
      if (typeof value !== 'string') return 'Must be a string';
      if (!value.includes('CN=') && !value.includes('cn=')) {
        return 'Must include Common Name (CN=)';
      }
      return true;
    }
  } as ValidationRule
};

// Form validation hook for SolidJS
export const createFormValidator = (initialRules: Record<string, ValidationRule>) => {
  let formRules = { ...initialRules };
  
  return {
    validate: (data: Record<string, any>) => validateForm(data, formRules),
    
    validateField: (field: string, value: any) => {
      if (formRules[field]) {
        return validateField(value, formRules[field]);
      }
      return { isValid: true, errors: [] };
    },
    
    setRules: (newRules: Record<string, ValidationRule>) => {
      formRules = { ...formRules, ...newRules };
    },
    
    clearRules: () => {
      formRules = {};
    }
  };
};