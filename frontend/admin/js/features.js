/**
 * features.js — All new features 1-14
 * Loaded after app-refactored.js and job-details-enhanced.js
 * Never modifies existing functions — only adds new ones.
 */

// ════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════

function featApiGet(path) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    return fetch(path, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());
}
function featApiPost(path, body) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    return fetch(path, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(r => r.json());
}
function featApiPatch(path, body) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    return fetch(path, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(r => r.json());
}
function featApiDelete(path) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    return fetch(path, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());
}
function featApiPut(path, body) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    return fetch(path, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(r => r.json());
}
function featNotify(msg, type = 'success') {
    if (window.ui?.notify) {
        if (type === 'success') ui.notify.success(msg);
        else if (type === 'error') ui.notify.error(msg);
        else ui.notify.info(msg);
    } else {
        console.log(`[${type}] ${msg}`);
    }
}
function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('active'); document.getElementById('modal-overlay')?.classList.add('active'); }
}
// ════════════════════════════════════════════════
// FEATURE 1 — NOTIFICATION SETTINGS
// ════════════════════════════════════════════════

const NOTIF_LABELS = {
    notif_new_booking:          { label: 'New Booking Alert', desc: 'Email admin when a customer books online' },
    notif_job_complete:         { label: 'Job Completion Alert', desc: 'Email admin when staff marks a job complete' },
    notif_daily_briefing:       { label: 'Daily Morning Briefing (7am)', desc: 'Daily summary email with all jobs + outstanding invoices' },
    notif_appt_reminder_24h:    { label: '24-Hour Appointment Reminder', desc: 'Email customer and staff the day before a job' },
    notif_appt_reminder_2h:     { label: '2-Hour Appointment Reminder', desc: 'Email customer 2 hours before their appointment' },
    notif_overdue_invoice:      { label: 'Overdue Invoice Chase', desc: 'Email customers about unpaid invoices' },
    notif_customer_rating:      { label: 'Customer Rating Request', desc: 'Email customers 24h after job to rate the service' },
    notif_reengagement:         { label: 'Re-engagement (30-day inactive)', desc: 'Email customers who haven\'t booked in 30+ days' },
    notif_waiting_list:         { label: 'Waiting List Alert', desc: 'Email admin when a customer is added to the waiting list' },
};

let _notifSettings = {};

async function loadNotifSettings() {
    try {
        const data = await featApiGet('/api/notifications/settings');
        if (data.success) {
            _notifSettings = data.data || {};
            renderNotifSettingsForm(document.getElementById('notif-settings-form'));
        }
    } catch (e) { console.warn('Could not load notif settings', e); }
}

async function loadNotifSettingsInline() {
    try {
        const data = await featApiGet('/api/notifications/settings');
        if (data.success) {
            _notifSettings = data.data || {};
            renderNotifSettingsForm(document.getElementById('notif-toggles-inline'));
        }
    } catch (e) {
        const el = document.getElementById('notif-toggles-inline');
        if (el) el.innerHTML = '<p style="color:#64748b;">Could not load notification settings.</p>';
    }
}

function renderNotifSettingsForm(container) {
    if (!container) return;
    const days = _notifSettings.notif_overdue_invoice_days || '7';
    container.innerHTML = Object.entries(NOTIF_LABELS).map(([key, info]) => {
        const checked = _notifSettings[key] !== 'false';
        return `
            <div class="module-toggle" style="margin-bottom:0.75rem;">
                <label class="toggle-switch">
                    <input type="checkbox" id="notif_${key}" ${checked ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <div>
                    <span style="font-weight:600;">${info.label}</span>
                    <p style="font-size:0.78rem;color:#64748b;margin:0;">${info.desc}</p>
                </div>
            </div>
        `;
    }).join('') + `
        <div class="form-group" style="margin-top:1rem;">
            <label for="overdue-days" style="font-size:0.875rem;font-weight:600;">Chase invoices after how many days?</label>
            <input type="number" id="overdue-days" value="${days}" min="1" max="90" style="width:80px;padding:0.4rem;border:1px solid #d1d5db;border-radius:4px;">
        </div>
    `;
}

async function saveNotifSettings() {
    const payload = {};
    Object.keys(NOTIF_LABELS).forEach(key => {
        const el = document.getElementById(`notif_${key}`);
        if (el) payload[key] = el.checked ? 'true' : 'false';
    });
    const daysEl = document.getElementById('overdue-days');
    if (daysEl) payload['notif_overdue_invoice_days'] = daysEl.value;

    try {
        const res = await featApiPut('/api/notifications/settings', payload);
        if (res.success) {
            featNotify('Notification settings saved ✅');
        } else {
            featNotify('Failed to save settings', 'error');
        }
    } catch (e) {
        featNotify('Network error', 'error');
    }
}

async function sendTestNotification() {
    try {
        const res = await featApiPost('/api/notifications/test', {});
        featNotify(res.success ? `✅ Test email sent to admin` : 'Failed to send test email', res.success ? 'success' : 'error');
    } catch (e) {
        featNotify('Network error', 'error');
    }
}

// ════════════════════════════════════════════════
// FEATURE 14 — NOTIFICATION LOG
// ════════════════════════════════════════════════

async function loadNotifLog() {
    const el = document.getElementById('notif-log-list');
    if (!el) return;
    el.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const data = await featApiGet('/api/notifications/log?limit=100');
        if (!data.success || !data.data?.length) {
            el.innerHTML = '<p style="color:#64748b;padding:1rem 0;">No notifications logged yet.</p>';
            return;
        }
        el.innerHTML = `
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:#f1f5f9;text-align:left;">
                        <th style="padding:0.5rem 0.75rem;">Time</th>
                        <th style="padding:0.5rem 0.75rem;">Type</th>
                        <th style="padding:0.5rem 0.75rem;">Recipient</th>
                        <th style="padding:0.5rem 0.75rem;">Subject</th>
                        <th style="padding:0.5rem 0.75rem;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.data.map(n => `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding:0.5rem 0.75rem;color:#64748b;">${new Date(n.created_at).toLocaleString()}</td>
                            <td style="padding:0.5rem 0.75rem;">${n.type}</td>
                            <td style="padding:0.5rem 0.75rem;">${n.recipient || '—'}</td>
                            <td style="padding:0.5rem 0.75rem;">${n.subject || '—'}</td>
                            <td style="padding:0.5rem 0.75rem;">
                                <span style="background:${n.status==='sent'?'#d1fae5':'#fee2e2'};color:${n.status==='sent'?'#065f46':'#dc2626'};padding:0.15rem 0.5rem;border-radius:4px;font-size:0.75rem;">
                                    ${n.status || '—'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        el.innerHTML = '<p style="color:#dc2626;">Failed to load notification log.</p>';
    }
}
