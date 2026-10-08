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
 * Validates academic year format (e.g., "2025/26", "26/27")
 * Accepts formats: YYYY/YY or YY/YY
 */
export const validateAcademicYear = (academicYear) => {
  if (!academicYear || typeof academicYear !== 'string') {
    return { valid: false, error: 'Academic year is required and must be a string' };
  }
  
  const trimmed = academicYear.trim();
  
  // Match formats: YYYY/YY (e.g., "2025/26") or YY/YY (e.g., "25/26")
  const academicYearRegex = /^(\d{2,4})\/(\d{2})$/;
  const match = trimmed.match(academicYearRegex);
  
  if (!match) {
    return { valid: false, error: 'Academic year must be in format YYYY/YY or YY/YY (e.g., "2025/26" or "25/26")' };
  }
  
  const startYear = parseInt(match[1]);
  const endYear = parseInt(match[2]);
  
  // Validate year logic: end year should be start year + 1 (last 2 digits)
  // For YYYY/YY format: 2025/26 means 2025-2026
  // For YY/YY format: 25/26 means 2025-2026
  let expectedEndYear;
  if (startYear >= 100) {
    // Full year format (e.g., 2025)
    expectedEndYear = (startYear + 1) % 100;
  } else {
    // Short year format (e.g., 25)
    expectedEndYear = (startYear + 1) % 100;
  }
  
  if (endYear !== expectedEndYear) {
    return { valid: false, error: `Academic year end year (${endYear}) should be ${expectedEndYear} (start year + 1)` };
  }
  
  return { valid: true, academicYear: trimmed };
};

/**
 * Validates that term dates fall within the academic year range
 * Academic year typically runs from September YYYY to August YYYY+1
 * @param {string} academicYear - Academic year in format YYYY/YY (e.g., "2024/25")
 * @param {Date} startDate - Term start date
 * @param {Date} endDate - Term end date
 * @returns {Object} Validation result with valid flag and optional error message
 */
export const validateTermDatesAgainstAcademicYear = (academicYear, startDate, endDate) => {
  if (!academicYear || !startDate || !endDate) {
    return { valid: false, error: 'Academic year, start date, and end date are required' };
  }

  // Parse academic year (e.g., "2024/25" -> startYear = 2024, endYear = 2025)
  const academicYearRegex = /^(\d{2,4})\/(\d{2})$/;
  const match = academicYear.trim().match(academicYearRegex);
  
  if (!match) {
    return { valid: false, error: 'Invalid academic year format' };
  }

  let startYear = parseInt(match[1]);
  const endYearShort = parseInt(match[2]);
  
  // Convert short year format to full year if needed
  if (startYear < 100) {
    // Assume 20XX for years 00-99
    startYear = 2000 + startYear;
  }
  
  // Calculate full end year
  let endYear = startYear + 1;
  
  // Academic year typically runs from September 1st of start year to August 31st of end year
  const academicYearStart = new Date(startYear, 8, 1); // September 1st (month 8 = September)
  const academicYearEnd = new Date(endYear, 8, 0, 23, 59, 59, 999); // August 31st 23:59:59.999
  
  const termStart = new Date(startDate);
  const termEnd = new Date(endDate);
  
  // Validate that term dates fall within academic year
  if (termStart < academicYearStart) {
    return { 
      valid: false, 
      error: `Term start date (${termStart.toLocaleDateString('en-GB')}) is before the academic year start (${academicYearStart.toLocaleDateString('en-GB')}). Academic year ${academicYear} runs from September ${startYear} to August ${endYear}.` 
    };
  }
  
  if (termEnd > academicYearEnd) {
    return { 
      valid: false, 
      error: `Term end date (${termEnd.toLocaleDateString('en-GB')}) is after the academic year end (${academicYearEnd.toLocaleDateString('en-GB')}). Academic year ${academicYear} runs from September ${startYear} to August ${endYear}.` 
    };
  }
  
  return { valid: true };
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
 * Validates the role someone picks when signing up.
 * ADMIN is deliberately not allowed: admin accounts can see and delete every
 * student, so they must be created directly in the database, never via sign-up.
 */
export const validateRole = (role) => {
  const validRoles = ['STUDENT', 'EMPLOYER'];
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

