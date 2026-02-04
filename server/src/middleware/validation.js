/**
 * Validation Middleware
 * Provides reusable validation functions for common input validation needs
 */

import { passwordValidator } from "../utils/password.js";

/**
 * Validates email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email must be a valid string' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
};

/**
 * Validates date format and returns Date object
 */
export const validateDate = (dateString, fieldName = 'date') => {
  if (!dateString) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date` };
  }
  
  return { valid: true, date };
};

/**
 * Validates date range (startDate < endDate)
 */
export const validateDateRange = (startDateString, endDateString) => {
  const startValidation = validateDate(startDateString, 'startDate');
  if (!startValidation.valid) {
    return startValidation;
  }
  
  const endValidation = validateDate(endDateString, 'endDate');
  if (!endValidation.valid) {
    return endValidation;
  }
  
  if (startValidation.date >= endValidation.date) {
    return { 
      valid: false, 
      error: 'startDate must be before endDate' 
    };
  }
  
  return { valid: true, startDate: startValidation.date, endDate: endValidation.date };
};

/**
 * Validates positive number
 */
export const validatePositiveNumber = (value, fieldName = 'number', options = {}) => {
  if (value == null) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (num <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }
  
  if (options.min !== undefined && num < options.min) {
    return { valid: false, error: `${fieldName} must be at least ${options.min}` };
  }
  
  if (options.max !== undefined && num > options.max) {
    return { valid: false, error: `${fieldName} must be at most ${options.max}` };
  }
  
  return { valid: true, number: num };
};

/**
 * Validates university code format (uppercase alphanumeric, no spaces)
 */
export const validateUniversityCode = (code) => {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'University code must be a valid string' };
  }
  
  const trimmedCode = code.trim().toUpperCase();
  
  // Allow uppercase letters, numbers, and underscores/hyphens
  const codeRegex = /^[A-Z0-9_-]+$/;
  if (!codeRegex.test(trimmedCode)) {
    return { 
      valid: false, 
      error: 'University code must contain only uppercase letters, numbers, hyphens, or underscores' 
    };
  }
  
  if (trimmedCode.length < 2 || trimmedCode.length > 50) {
    return { 
      valid: false, 
      error: 'University code must be between 2 and 50 characters' 
    };
  }
  
  return { valid: true, normalizedCode: trimmedCode };
};

/**
 * Validates role enum value
 */
export const validateRole = (role) => {
  const validRoles = ['STUDENT', 'EMPLOYER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return { 
      valid: false, 
      error: `Role must be one of: ${validRoles.join(', ')}` 
    };
  }
  return { valid: true };
};

/**
 * Validates required fields
 */
export const validateRequired = (fields, data) => {
  const missing = [];
  
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `Missing required fields: ${missing.join(', ')}` 
    };
  }
  
  return { valid: true };
};

/**
 * Express middleware to validate request body
 */
export const validate = (validations) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const validation of validations) {
      const { field, validator, options } = validation;
      const value = req.body[field];
      
      let result;
      if (typeof validator === 'function') {
        result = validator(value, field, options);
      } else {
        // Built-in validators
        switch (validator) {
          case 'email':
            result = validateEmail(value);
            break;
          case 'required':
            if (value === undefined || value === null || value === '') {
              result = { valid: false, error: `${field} is required` };
            } else {
              result = { valid: true };
            }
            break;
          case 'positiveNumber':
            result = validatePositiveNumber(value, field, options);
            break;
          case 'date':
            result = validateDate(value, field);
            break;
          case 'universityCode':
            result = validateUniversityCode(value);
            break;
          case 'role':
            result = validateRole(value);
            break;
          case 'password':
            result = passwordValidator(value, field);
            break;
          default:
            continue;
        }
      }
      
      if (!result.valid) {
        errors.push({ field, error: result.error });
      } else if (result.normalizedCode) {
        // Update the value with normalized code
        req.body[field] = result.normalizedCode;
      } else if (result.date) {
        // Update the value with parsed date
        req.body[field] = result.date;
      } else if (result.number !== undefined) {
        // Update the value with parsed number
        req.body[field] = result.number;
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          requestId: req.requestId || null,
          timestamp: new Date().toISOString(),
          details: errors
        }
      });
    }
    
    next();
  };
};

/**
 * Custom validator for date range
 */
export const validateDateRangeFields = (startField, endField) => {
  return (req, res, next) => {
    const startDate = req.body[startField];
    const endDate = req.body[endField];
    
    // Only validate if both dates are provided
    if (startDate && endDate) {
      const result = validateDateRange(startDate, endDate);
      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            requestId: req.requestId || null,
            timestamp: new Date().toISOString(),
            details: [{ field: `${startField}/${endField}`, error: result.error }]
          }
        });
      }
      
      // Update with parsed dates
      req.body[startField] = result.startDate;
      req.body[endField] = result.endDate;
    }
    
    next();
  };
};

