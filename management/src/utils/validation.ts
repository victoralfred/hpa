import { ValidationRule, ValidationErrors } from '../types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation regex patterns
const PASSWORD_PATTERNS = {
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[^A-Za-z0-9]/,
};

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    required: true,
    message,
    validator: (value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return message;
      }
      return null;
    },
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    pattern: EMAIL_REGEX,
    message,
    validator: (value) => {
      if (value && !EMAIL_REGEX.test(value)) {
        return message;
      }
      return null;
    },
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `Must be at least ${min} characters long`,
    validator: (value) => {
      if (value && value.length < min) {
        return message || `Must be at least ${min} characters long`;
      }
      return null;
    },
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `Must be no more than ${max} characters long`,
    validator: (value) => {
      if (value && value.length > max) {
        return message || `Must be no more than ${max} characters long`;
      }
      return null;
    },
  }),

  passwordStrength: (message = 'Password must contain at least 8 characters, uppercase, lowercase, numbers, and special characters'): ValidationRule => ({
    minLength: 8,
    message,
    validator: (value) => {
      if (!value) return null;

      const issues: string[] = [];

      if (value.length < 8) {
        issues.push('at least 8 characters');
      }
      if (!PASSWORD_PATTERNS.hasUppercase.test(value)) {
        issues.push('uppercase letters');
      }
      if (!PASSWORD_PATTERNS.hasLowercase.test(value)) {
        issues.push('lowercase letters');
      }
      if (!PASSWORD_PATTERNS.hasNumber.test(value)) {
        issues.push('numbers');
      }
      if (!PASSWORD_PATTERNS.hasSpecialChar.test(value)) {
        issues.push('special characters');
      }

      if (issues.length > 0) {
        return `Password must include: ${issues.join(', ')}`;
      }

      return null;
    },
  }),

  confirmPassword: (passwordField = 'password', message = 'Passwords do not match'): ValidationRule => ({
    message,
    validator: (value, formData) => {
      if (!value) return null;
      
      const password = formData?.[passwordField];
      if (password && value !== password) {
        return message;
      }
      return null;
    },
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    pattern: regex,
    message,
    validator: (value) => {
      if (value && !regex.test(value)) {
        return message;
      }
      return null;
    },
  }),

  custom: (validator: (value: any, formData?: any) => string | null): ValidationRule => ({
    validator,
  }),
};

// Validate a single field
export const validateField = (
  value: any,
  rules: ValidationRule[] = [],
  formData?: Record<string, any>
): string | null => {
  for (const rule of rules) {
    if (rule.validator) {
      const error = rule.validator(value, formData);
      if (error) {
        return error;
      }
    }
  }
  return null;
};

// Validate an entire form
export const validateForm = (
  formData: Record<string, any>,
  fieldRules: Record<string, ValidationRule[]>
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.entries(fieldRules).forEach(([fieldName, rules]) => {
    const value = formData[fieldName];
    const error = validateField(value, rules, formData);
    errors[fieldName] = error;
  });

  return errors;
};

// Check if form has any errors
export const hasFormErrors = (errors: ValidationErrors): boolean => {
  return Object.values(errors).some(error => error !== null && error !== undefined);
};

// Get first error message from form errors
export const getFirstError = (errors: ValidationErrors): string | null => {
  const errorValues = Object.values(errors).filter(error => error !== null && error !== undefined);
  return errorValues.length > 0 ? errorValues[0] : null;
};

// Debounce function for real-time validation
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Form field validation schemas
export const authValidationSchemas = {
  login: {
    email: [validationRules.required(), validationRules.email()],
    password: [validationRules.required()],
  },

  register: {
    firstName: [
      validationRules.required('First name is required'),
      validationRules.minLength(2),
      validationRules.maxLength(50),
    ],
    lastName: [
      validationRules.required('Last name is required'),
      validationRules.minLength(2),
      validationRules.maxLength(50),
    ],
    email: [validationRules.required(), validationRules.email()],
    password: [validationRules.required(), validationRules.passwordStrength()],
    confirmPassword: [validationRules.required(), validationRules.confirmPassword()],
    termsAccepted: [
      validationRules.custom((value) => {
        if (!value) {
          return 'You must accept the terms and conditions';
        }
        return null;
      }),
    ],
  },

  resetPassword: {
    email: [validationRules.required(), validationRules.email()],
  },

  updatePassword: {
    password: [validationRules.required(), validationRules.passwordStrength()],
    confirmPassword: [validationRules.required(), validationRules.confirmPassword()],
  },
};

export default {
  validationRules,
  validateField,
  validateForm,
  hasFormErrors,
  getFirstError,
  debounce,
  authValidationSchemas,
};