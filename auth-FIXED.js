const jwt = require('jsonwebtoken');

/**
 * ============================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================
 * Validates JWT tokens and enforces role-based access control
 * PRODUCTION-READY VERSION WITH FULL DEFENSIVE CHECKS
 */

/**
 * Verify JWT token and attach user to request
 * Usage: router.use(requireAuth)
 */
const requireAuth = (req, res, next) => {
  // Generate requestId if not already present (from logging middleware)
  if (!req.id) {
    req.id = 'req-' + Math.random().toString(36).substr(2, 9);
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`⚠️  Unauthorized access attempt to ${req.method} ${req.path}`);
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      message: 'Please provide a valid token',
      requestId: req.id
    });
  }
  
  const token = authHeader.replace('Bearer ', '').trim();
  
  if (!token || token.length === 0) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      message: 'Token is empty',
      requestId: req.id
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Defensive checks on decoded token
    if (!decoded || typeof decoded !== 'object') {
      console.warn(`⚠️  Invalid token structure`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        message: 'Token structure is invalid',
        requestId: req.id
      });
    }
    
    // Attach user to request with defensive structure
    req.user = {
      id: decoded.id || null,
      email: decoded.email || null,
      role: decoded.role || 'user',
      is_active: decoded.is_active === undefined ? true : Boolean(decoded.is_active)
    };
    
    // Verify user is active if field exists
    if (decoded.hasOwnProperty('is_active') && !decoded.is_active) {
      console.warn(`⚠️  Inactive user access attempt: ${decoded.email}`);
      return res.status(403).json({ 
        success: false,
        error: 'User account is inactive',
        code: 'USER_INACTIVE',
        message: 'Your account has been deactivated',
        requestId: req.id
      });
    }
    
    console.log(`✅ User authenticated: ${decoded.email || 'Unknown'} (${req.id})`);
    next();
    
  } catch (err) {
    let code = 'INVALID_TOKEN';
    let statusCode = 401;
    
    if (err.name === 'TokenExpiredError') {
      code = 'TOKEN_EXPIRED';
      console.warn(`⚠️  Expired token used: ${new Date(err.expiredAt).toISOString()}`);
    } else if (err.name === 'JsonWebTokenError') {
      code = 'INVALID_TOKEN';
      console.warn(`⚠️  JWT verification failed: ${err.message}`);
    } else {
      code = 'AUTH_ERROR';
      console.error(`❌ Authentication error: ${err.message}`);
    }
    
    return res.status(statusCode).json({ 
      success: false,
      error: 'Invalid or expired token',
      code: code,
      message: code === 'TOKEN_EXPIRED' ? 'Your session has expired. Please login again.' : 'Your token is invalid',
      requestId: req.id
    });
  }
};

/**
 * Verify JWT and require admin role
 * Usage: router.use(requireAdmin)
 */
const requireAdmin = (req, res, next) => {
  // First apply authentication
  requireAuth(req, res, () => {
    // Then check for admin role
    if (!req.user) {
      console.warn(`⚠️  Admin access denied: User not found in request`);
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'INSUFFICIENT_ROLE',
        message: 'Admin access required',
        requestId: req.id
      });
    }
    
    const role = req.user.role || '';
    
    if (role !== 'admin' && role !== 'owner') {
      console.warn(`⚠️  Admin access denied to user with role: ${role}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'INSUFFICIENT_ROLE',
        message: 'You do not have permission to access this resource',
        requestId: req.id
      });
    }
    
    console.log(`✅ Admin access granted to: ${req.user.email || 'Unknown'} (${req.id})`);
    next();
  });
};

/**
 * Verify JWT and require staff role or higher
 * Usage: router.use(requireStaff)
 */
const requireStaff = (req, res, next) => {
  // First apply authentication
  requireAuth(req, res, () => {
    // Then check for staff role or higher
    if (!req.user) {
      console.warn(`⚠️  Staff access denied: User not found in request`);
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'INSUFFICIENT_ROLE',
        message: 'Staff access required',
        requestId: req.id
      });
    }
    
    const role = req.user.role || '';
    const allowedRoles = ['staff', 'admin', 'owner'];
    
    if (!allowedRoles.includes(role)) {
      console.warn(`⚠️  Staff access denied to user with role: ${role}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'INSUFFICIENT_ROLE',
        message: 'You do not have permission to access this resource',
        requestId: req.id
      });
    }
    
    console.log(`✅ Staff access granted to: ${req.user.email || 'Unknown'} (${req.id})`);
    next();
  });
};

/**
 * Optional authentication - doesn't fail if no token, just doesn't attach user
 * Usage: router.use(optionalAuth)
 */
const optionalAuth = (req, res, next) => {
  // Generate requestId if not already present
  if (!req.id) {
    req.id = 'req-' + Math.random().toString(36).substr(2, 9);
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token - continue without auth
    req.user = null;
    return next();
  }
  
  const token = authHeader.replace('Bearer ', '').trim();
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded && typeof decoded === 'object') {
      req.user = {
        id: decoded.id || null,
        email: decoded.email || null,
        role: decoded.role || 'user',
        is_active: decoded.is_active === undefined ? true : Boolean(decoded.is_active)
      };
      
      console.log(`✅ Optional user authenticated: ${decoded.email || 'Unknown'}`);
    }
  } catch (err) {
    console.warn(`⚠️  Optional auth token invalid: ${err.message}`);
    // Don't fail - just continue without user
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireStaff,
  optionalAuth
};
