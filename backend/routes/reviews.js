/**
 * Reviews Route — /api/reviews
 * Customer star-rating submissions and admin view
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const crypto = require('crypto');

// GET all reviews (admin)
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT r.*, c.name AS customer_name, s.name AS service_name, j.job_date
            FROM job_reviews r
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN jobs j ON r.job_id = j.id
            LEFT JOIN services s ON j.service_id = s.id
            ORDER BY r.created_at DESC LIMIT 200
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET summary stats
router.get('/summary', async (_req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                COUNT(*)           AS total_reviews,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star,
                COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star,
                COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star,
                COUNT(CASE WHEN rating <= 2 THEN 1 END) AS low_star
            FROM job_reviews
        `);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /submit/:token — public (no auth), customer submits rating
router.post('/submit/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Rating must be 1-5' });
        }

        const tokenRow = (await db.query(
            `SELECT * FROM review_tokens WHERE token = $1 AND used = 0 AND expires_at > NOW()`,
            [token]
        )).rows[0];

        if (!tokenRow) {
            return res.status(410).json({ success: false, error: 'This review link has expired or already been used.' });
        }

        // Check if review already exists for this job
        const existing = (await db.query(
            'SELECT id FROM job_reviews WHERE job_id = $1 AND customer_id = $2',
            [tokenRow.job_id, tokenRow.customer_id]
        )).rows[0];

        if (existing) {
            // Update existing review
            await db.query(
                'UPDATE job_reviews SET rating = $1, comment = $2 WHERE id = $3',
                [rating, comment || null, existing.id]
            );
        } else {
            await db.query(
                'INSERT INTO job_reviews (job_id, customer_id, rating, comment) VALUES ($1,$2,$3,$4)',
                [tokenRow.job_id, tokenRow.customer_id, rating, comment || null]
            );
        }

        // Mark token used
        await db.query('UPDATE review_tokens SET used = 1 WHERE id = $1', [tokenRow.id]);

        res.json({ success: true, message: 'Thank you for your review!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /rate/:token — return job info for review page
router.get('/rate/:token', async (req, res) => {
    try {
        const tokenRow = (await db.query(
            `SELECT rt.*, c.name AS customer_name, s.name AS service_name, j.job_date
             FROM review_tokens rt
             JOIN jobs j ON rt.job_id = j.id
             JOIN customers c ON rt.customer_id = c.id
             LEFT JOIN services s ON j.service_id = s.id
             WHERE rt.token = $1 AND rt.used = 0 AND rt.expires_at > NOW()`,
            [req.params.token]
        )).rows[0];

        if (!tokenRow) {
            return res.status(410).json({ success: false, error: 'Link expired or already used' });
        }
        res.json({ success: true, data: {
            customer_name: tokenRow.customer_name,
            service_name:  tokenRow.service_name,
            job_date:      tokenRow.job_date,
        }});
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Helper exported for scheduler use
async function createReviewToken(jobId, customerId) {
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.query(
        'INSERT INTO review_tokens (job_id, customer_id, token, expires_at) VALUES ($1,$2,$3,$4)',
        [jobId, customerId, token, expires]
    );
    return token;
}

module.exports = router;
module.exports.createReviewToken = createReviewToken;
