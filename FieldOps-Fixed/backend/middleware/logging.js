const { v4: uuidv4 } = require('uuid');

/**
 * Request tracking middleware
 * Adds X-Request-ID header and request context for logging
 */
const requestTracking = (req, res, next) => {
  // Generate unique request ID
  req.id = req.headers['x-request-id'] || uuidv4();
  
  // Add to response headers
  res.setHeader('X-Request-ID', req.id);
  
  // Add context object for logging
  req.context = {
    requestId: req.id,
    timestamp: new Date(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id
  };

  // Log request
  console.log(`[${req.id}] ${req.method} ${req.path}`);

  // Override res.json to add requestId
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (data && typeof data === 'object') {
      data.requestId = req.id;
    }
    return originalJson(data);
  };

  next();
};

/**
 * Structured logging helper
 */
const log = {
  info: (requestId, message, data = {}) => {
    console.log(`[${requestId}] ℹ️  ${message}`, data);
  },
  warn: (requestId, message, data = {}) => {
    console.warn(`[${requestId}] ⚠️  ${message}`, data);
  },
  error: (requestId, message, error) => {
    const errorData = {
      message: error?.message || error,
      code: error?.code,
      stack: error?.stack
    };
    console.error(`[${requestId}] ❌ ${message}`, errorData);
  },
  success: (requestId, message, data = {}) => {
    console.log(`[${requestId}] ✅ ${message}`, data);
  }
};

module.exports = { requestTracking, log };
