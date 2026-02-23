const pool = require('../config/database');

/**
 * Handle database errors with meaningful messages
 */
const handleDbError = (error, context = 'Database operation') => {
    const errorMsg = error?.message || String(error);

    if (errorMsg.includes('unique constraint') || errorMsg.includes('duplicate key')) {
        const match = errorMsg.match(/Key \((\w+)\)/i) || errorMsg.match(/unique_(\w+)/i);
        const column = match ? match[1] : 'field';
        return { status: 400, error: `${column} already exists`, code: 'DUPLICATE_ENTRY' };
    }

    if (errorMsg.includes('foreign key') || errorMsg.includes('violates foreign key')) {
        return { status: 400, error: 'Invalid reference', code: 'INVALID_REFERENCE',
            details: 'One or more referenced records do not exist' };
    }

    if (errorMsg.includes('not null') || errorMsg.includes('null value')) {
        const match = errorMsg.match(/column "(\w+)"/i);
        const column = match ? match[1] : 'field';
        return { status: 400, error: `${column} is required`, code: 'MISSING_REQUIRED_FIELD' };
    }

    if (errorMsg.includes('does not exist')) {
        return { status: 500, error: 'Database schema error', code: 'SCHEMA_ERROR',
            details: 'Database has not been properly initialized. Run: npm run db:setup' };
    }

    return {
        status: 500, error: context, code: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
    };
};

/**
 * Paginate query results (async)
 * @param {string} query      - base SQL without LIMIT/OFFSET
 * @param {string} countQuery - COUNT query
 * @param {number} page
 * @param {number} limit
 * @param {Array}  params     - query params shared by both queries (no LIMIT/OFFSET)
 */
const paginate = async (query, countQuery, page = 1, limit = 20, params = []) => {
    page  = Math.max(1, parseInt(page)  || 1);
    limit = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (page - 1) * limit;

    try {
        const base = params.length;
        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(`${query} LIMIT $${base + 1} OFFSET $${base + 2}`, [...params, limit, offset]),
        ]);

        const total = parseInt(countResult.rows[0].count || 0);
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: dataResult.rows,
            pagination: {
                page, limit, total, totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    } catch (error) {
        const errorResponse = handleDbError(error, 'Pagination query failed');
        return { success: false, ...errorResponse };
    }
};

/**
 * Get single record with error handling (async)
 */
const getOne = async (query, params = [], context = 'Record not found') => {
    try {
        const result = await pool.query(query, params);
        if (!result.rows[0]) {
            return { success: false, status: 404, error: context, code: 'NOT_FOUND' };
        }
        return { success: true, data: result.rows[0] };
    } catch (error) {
        return { success: false, ...handleDbError(error, 'Query failed') };
    }
};

/**
 * Get multiple records with error handling (async)
 */
const getMany = async (query, params = []) => {
    try {
        const result = await pool.query(query, params);
        return { success: true, data: result.rows };
    } catch (error) {
        return { success: false, ...handleDbError(error, 'Query failed') };
    }
};

/**
 * Create record with error handling (async)
 * Query must include RETURNING id
 */
const create = async (query, params = [], context = 'Record created') => {
    try {
        const result = await pool.query(query, params);
        return {
            success: true,
            id: result.rows[0]?.id,
            changes: result.rowCount,
            message: context
        };
    } catch (error) {
        return { success: false, ...handleDbError(error, 'Create failed') };
    }
};

/**
 * Update record with error handling (async)
 */
const update = async (query, params = [], context = 'Record updated') => {
    try {
        const result = await pool.query(query, params);
        if (result.rowCount === 0) {
            return { success: false, status: 404, error: 'Not found', code: 'NOT_FOUND' };
        }
        return { success: true, changes: result.rowCount, message: context };
    } catch (error) {
        return { success: false, ...handleDbError(error, 'Update failed') };
    }
};

/**
 * Soft delete a record (async)
 */
const softDelete = async (table, id, context = 'Record deleted') => {
    try {
        const result = await pool.query(
            `UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (result.rowCount === 0) {
            return { success: false, status: 404, error: 'Not found', code: 'NOT_FOUND' };
        }
        return { success: true, message: context };
    } catch (error) {
        return { success: false, ...handleDbError(error, 'Delete failed') };
    }
};

/**
 * Run a query inside a transaction (async)
 * callback receives a pg client and should return a value
 */
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return { success: true, data: result };
    } catch (error) {
        await client.query('ROLLBACK');
        return { success: false, ...handleDbError(error, 'Transaction failed') };
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    handleDbError,
    paginate,
    getOne,
    getMany,
    create,
    update,
    softDelete,
    withTransaction,
};
