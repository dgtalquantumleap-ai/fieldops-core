const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

const validateBooking = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('phone')
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format')
    .custom(value => {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        throw new Error('Phone number must be between 10 and 15 digits');
      }
      return true;
    }),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
    
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
    
  body('service')
    .trim()
    .notEmpty()
    .withMessage('Service is required')
    .isLength({ max: 100 })
    .withMessage('Service name too long'),
    
  body('date')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom(value => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        throw new Error('Booking date must be today or in the future');
      }
      
      // Don't allow bookings more than 1 year in advance
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (bookingDate > maxDate) {
        throw new Error('Booking date cannot be more than 1 year in advance');
      }
      
      return true;
    }),
    
  body('time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .escape(),
    
  handleValidationErrors
];

const validateJob = [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
    
  body('service_id')
    .isInt({ min: 1 })
    .withMessage('Valid service ID is required'),
    
  body('job_date')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom(value => {
      const jobDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (jobDate < today) {
        throw new Error('Job date must be today or in the future');
      }
      return true;
    }),
    
  body('job_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),
    
  body('location')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Location must be between 5 and 200 characters'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .escape(),
    
  handleValidationErrors
];

const validateCustomer = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('phone')
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format')
    .custom(value => {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        throw new Error('Phone number must be between 10 and 15 digits');
      }
      return true;
    }),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
    
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .escape(),
    
  handleValidationErrors
];

const validateInvoice = [
  body('job_id')
    .isInt({ min: 1 })
    .withMessage('Valid job ID is required'),
    
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
    
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .escape(),
    
  handleValidationErrors
];

module.exports = { 
  validateBooking, 
  validateJob, 
  validateCustomer,
  validateInvoice,
  handleValidationErrors
};
