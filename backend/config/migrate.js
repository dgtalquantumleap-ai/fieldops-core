/**
 * migrate.js — Safe runtime migrations
 * Adds missing tables and columns without touching existing data.
 * Called from server.js on every startup (idempotent).
 */
const pool = require('./database');

async function runMigrations() {
    console.log('🔄 Running database migrations...');
    const client = await pool.connect();
    try {
        // ── waiting_list ─────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS waiting_list (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                address TEXT,
                service TEXT NOT NULL,
                preferred_date TEXT,
                preferred_time TEXT,
                notes TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ── notification_log ──────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS notification_log (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL,
                recipient TEXT,
                subject TEXT,
                status TEXT DEFAULT 'sent',
                error TEXT,
                job_id INTEGER,
                customer_id INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ── review_tokens ─────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS review_tokens (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES jobs(id),
                customer_id INTEGER REFERENCES customers(id),
                token TEXT UNIQUE NOT NULL,
                used INTEGER DEFAULT 0,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ── job_expenses ──────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_expenses (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES jobs(id),
                staff_id INTEGER REFERENCES users(id),
                description TEXT NOT NULL,
                amount REAL NOT NULL CHECK (amount >= 0),
                category TEXT DEFAULT 'Supplies',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ── jobs: new columns ─────────────────────────────────────
        const jobCols = [
            ['recurrence_rule',    'TEXT'],
            ['parent_job_id',      'INTEGER'],
            ['recurrence_end_date','TEXT'],
            ['rating_request_sent','INTEGER DEFAULT 0'],
            ['checkin_lat',        'REAL'],
            ['checkin_lng',        'REAL'],
            ['checkin_time',       'TIMESTAMP'],
            ['reminder_2h_sent',   'INTEGER DEFAULT 0'],
        ];
        for (const [col, type] of jobCols) {
            await client.query(
                `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ${col} ${type}`
            ).catch(() => {}); // ignore if already exists
        }

        // ── invoices: new columns ─────────────────────────────────
        await client.query(
            `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_sent_3day INTEGER DEFAULT 0`
        ).catch(() => {});
        await client.query(
            `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link TEXT`
        ).catch(() => {});

        // ── job_reviews table (if not exists) ─────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_reviews (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES jobs(id),
                customer_id INTEGER REFERENCES customers(id),
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {});
        await client.query(`CREATE INDEX IF NOT EXISTS idx_job_reviews_job ON job_reviews(job_id)`).catch(() => {});

        // ── customers: re-engagement column ──────────────────────
        await client.query(
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_engagement_sent TIMESTAMP`
        ).catch(() => {});

        // ── indexes ───────────────────────────────────────────────
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_waiting_list_status ON waiting_list(status)',
            'CREATE INDEX IF NOT EXISTS idx_notif_log_created ON notification_log(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_review_tokens_token ON review_tokens(token)',
            'CREATE INDEX IF NOT EXISTS idx_job_expenses_job ON job_expenses(job_id)',
            'CREATE INDEX IF NOT EXISTS idx_jobs_recurrence ON jobs(recurrence_rule)',
            'CREATE INDEX IF NOT EXISTS idx_jobs_parent ON jobs(parent_job_id)',
        ];
        for (const idx of indexes) {
            await client.query(idx).catch(() => {});
        }

        // ── services: upsert canonical pricing ───────────────────
        // Uses name as the business key. Updates price + description each deploy.
        const serviceUpserts = [
            { name: 'Carpet Cleaning',                  price: 150,  desc: 'Professional carpet cleaning – from $150 to $200' },
            { name: 'Routine Clean',                    price: 300,  desc: 'Complete routine home cleaning service' },
            { name: 'Deep Cleaning (2 Bedroom)',        price: 350,  desc: 'Thorough deep cleaning for 2 bedroom homes' },
            { name: 'Deep Cleaning (3 Bedroom)',        price: 400,  desc: 'Thorough deep cleaning for 3 bedroom homes' },
            { name: 'Move In/Move Out – House',         price: 550,  desc: 'Full house move-in/move-out cleaning – from $550 to $600' },
            { name: 'Move In/Move Out – Condo (2-3 Bed)', price: 470, desc: 'Condo move-out cleaning (2-3 bedroom) – from $470 to $500' },
            { name: 'Window Cleaning',                  price: 100,  desc: 'Interior and exterior window cleaning' },
        ];

        for (const svc of serviceUpserts) {
            // Try update first; if no rows affected, insert
            const upd = await client.query(
                `UPDATE services SET price = $1, description = $2, is_active = 1
                 WHERE name = $3`,
                [svc.price, svc.desc, svc.name]
            );
            if (upd.rowCount === 0) {
                await client.query(
                    `INSERT INTO services (name, price, description, is_active)
                     VALUES ($1, $2, $3, 1)
                     ON CONFLICT DO NOTHING`,
                    [svc.name, svc.price, svc.desc]
                ).catch(() => {});
            }
        }

        // Deactivate old service names that have been replaced
        const legacyNames = ['Standard Cleaning', 'Deep Cleaning', 'Move-in/Move-out', 'Move In & Out Cleaning', 'Deep Clean'];
        for (const name of legacyNames) {
            await client.query(
                `UPDATE services SET is_active = 0 WHERE name = $1`,
                [name]
            ).catch(() => {});
        }

        console.log('✅ Migrations complete');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
    } finally {
        client.release();
    }
}

module.exports = { runMigrations };
