const db = require('../config/database');

/**
 * Handle database errors with meaningful messages
 */
const handleDbError = (error, context = 'Database operation') => {
  const errorMsg = error?.message || String(error);
  
  // Check for specific constraint violations
  if (errorMsg.includes('UNIQUE constraint failed')) {
    const match = errorMsg.match(/UNIQUE constraint failed: (\w+)\.(\w+)/);
    if (match) {
      const [, table, column] = match;
      return {
        status: 400,
        error: `${column} already exists`,
        code: 'DUPLICATE_ENTRY',
        details: `A record with this ${column} already exists in ${table}`
      };
    }
    return {
      status: 400,
      error: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY'
    };
  }
  
  if (errorMsg.includes('FOREIGN KEY constraint failed')) {
    return {
      status: 400,
      error: 'Invalid reference',
      code: 'INVALID_REFERENCE',
      details: 'One or more referenced records do not exist'
    };
  }
  
  if (errorMsg.includes('NOT NULL constraint failed')) {
    const match = errorMsg.match(/NOT NULL constraint failed: (\w+)\.(\w+)/);
    if (match) {
      const [, , column] = match;
      return {
        status: 400,
        error: `${column} is required`,
        code: 'MISSING_REQUIRED_FIELD'
      };
    }
  }
  
  if (errorMsg.includes('no such table') || errorMsg.includes('no such column')) {
    return {
      status: 500,
      error: 'Database schema error',
      code: 'SCHEMA_ERROR',
      details: 'Database has not been properly initialized. Run: npm run db:setup'
    };
  }
  
  // Generic database error
  return {
    status: 500,
    error: context,
    code: 'DATABASE_ERROR',
    details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
  };
};

/**
 * Execute database operation with error handling
 */
const executeDb = (operation, context = 'Database operation') => {
  try {
    return {
      success: true,
      data: operation()
    };
  } catch (error) {
    const errorResponse = handleDbError(error, context);
    return {
      success: false,
      ...errorResponse
    };
  }
};

/**
 * Database transaction helper
 * Ensures all operations complete or all rollback
 */
const withTransaction = (callback) => {
  const transaction = db.transaction(callback);
  return transaction;
};

/**
 * Helper to execute transaction with error handling
 */
const executeTransaction = (callback, context = 'Transaction') => {
  try {
    const transaction = db.transaction(callback);
    transaction();
    return { success: true };
  } catch (error) {
    const errorResponse = handleDbError(error, context);
    return {
      success: false,
      ...errorResponse
    };
  }
};

/**
 * Paginate query results
 * Adds pagination metadata to response
 */
const paginate = (query, countQuery, page = 1, limit = 20) => {
  // Validate pagination parameters
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.max(1, Math.min(100, parseInt(limit) || 20)); // Max 100 per page
  
  try {
    // Get total count
    const countResult = db.prepare(countQuery).get();
    const total = countResult.count || 0;
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get paginated data
    const data = db.prepare(`${query} LIMIT ? OFFSET ?`).all(limit, offset);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    const errorResponse = handleDbError(error, 'Pagination query failed');
    return {
      success: false,
      ...errorResponse
    };
  }
};

/**
 * Get single record with error handling
 */
const getOne = (query, params, context = 'Record not found') => {
  try {
    const result = db.prepare(query).get(...params);
    if (!result) {
      return {
        success: false,
        status: 404,
        error: context,
        code: 'NOT_FOUND'
      };
    }
    return { success: true, data: result };
  } catch (error) {
    const errorResponse = handleDbError(error, 'Query failed');
    return { success: false, ...errorResponse };
  }
};

/**
 * Get multiple records with error handling
 */
const getMany = (query, params = []) => {
  try {
    const result = db.prepare(query).all(...params);
    return { success: true, data: result };
  } catch (error) {
    const errorResponse = handleDbError(error, 'Query failed');
    return { success: false, ...errorResponse };
  }
};

/**
 * Create record with error handling
 */
const create = (query, params, context = 'Record created') => {
  try {
    const result = db.prepare(query).run(...params);
    return {
      success: true,
      id: result.lastInsertRowid,
      changes: result.changes,
      message: context
    };
  } catch (error) {
    const errorResponse = handleDbError(error, 'Create failed');
    return { success: false, ...errorResponse };
  }
};

/**
 * Update record with error handling and change tracking
 */
const update = (query, params, context = 'Record updated') => {
  try {
    const result = db.prepare(query).run(...params);
    
    if (result.changes === 0) {
      return {
        success: false,
        status: 404,
        error: 'Not found',
        code: 'NOT_FOUND'
      };
    }
    
    return {
      success: true,
      changes: result.changes,
      message: context
    };
  } catch (error) {
    const errorResponse = handleDbError(error, 'Update failed');
    return { success: false, ...errorResponse };
  }
};

/**
 * Delete record (soft delete - sets deleted_at)
 */
const softDelete = (table, id, context = 'Record deleted') => {
  try {
    const result = db.prepare(
      `UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ?`
    ).run(id);
    
    if (result.changes === 0) {
      return {
        success: false,
        status: 404,
        error: 'Not found',
        code: 'NOT_FOUND'
      };
    }
    
    return {
      success: true,
      message: context
    };
  } catch (error) {
    const errorResponse = handleDbError(error, 'Delete failed');
    return { success: false, ...errorResponse };
  }
};

module.exports = {
  db,
  handleDbError,
  executeDb,
  withTransaction,
  executeTransaction,
  paginate,
  getOne,
  getMany,
  create,
  update,
  softDelete
};
