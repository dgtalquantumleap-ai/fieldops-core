const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      requestId: req.id
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token',
      code,
      requestId: req.id
    });
  }
};

const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    // Normalize role to lowercase for consistent comparison
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
        requestId: req.id
      });
    }
    next();
  });
};

/**
 * Flexible role-based access control
 * Usage: router.use(requireRole(['admin', 'staff']))
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const userRole = req.user.role ? req.user.role.toLowerCase() : '';
      const normalizedAllowedRoles = Array.isArray(allowedRoles) 
        ? allowedRoles.map(role => role.toLowerCase())
        : [allowedRoles.toLowerCase()];
      
      if (!normalizedAllowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: normalizedAllowedRoles,
          current: userRole,
          requestId: req.id
        });
      }
      next();
    });
  };
};

/**
 * Check if user account is active
 */
const requireActiveUser = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.is_active === 0 || req.user.is_active === false) {
      return res.status(403).json({ 
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
        requestId: req.id
      });
    }
    next();
  });
};

module.exports = { 
  requireAuth, 
  requireAdmin, 
  requireRole,
  requireActiveUser
};
