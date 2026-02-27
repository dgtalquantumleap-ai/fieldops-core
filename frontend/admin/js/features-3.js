// ════════════════════════════════════════════════
// FEATURE 7 — STAFF CALENDAR VIEW
// ════════════════════════════════════════════════

let _calendarDate = new Date();

async function loadCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading calendar...</div>';

    try {
        const [jobsRes, staffRes] = await Promise.all([
            featApiGet('/api/jobs?limit=500'),
            featApiGet('/api/staff')
        ]);

        const jobs = (jobsRes.success ? (jobsRes.data || jobsRes.data?.items) : []) || [];
        const staff = (staffRes.success ? (staffRes.data || staffRes.data?.items) : []) || [];

        renderCalendar(container, jobs, staff);
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Failed to load calendar.</p>';
    }
}

function calendarPrev() {
    _calendarDate.setDate(_calendarDate.getDate() - 7);
    loadCalendar();
}
function calendarNext() {
    _calendarDate.setDate(_calendarDate.getDate() + 7);
    loadCalendar();
}

function renderCalendar(container, jobs, staff) {
    // Build 7-day week starting from _calendarDate (aligned to Monday)
    const startDate = new Date(_calendarDate);
    const day = startDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startDate.setDate(startDate.getDate() + diff);

    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d;
    });

    const titleEl = document.getElementById('calendar-title');
    if (titleEl) {
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        titleEl.textContent = `${fmt(days[0])} – ${fmt(days[6])} ${days[0].getFullYear()}`;
    }

    const today = new Date().toISOString().split('T')[0];

    // Group jobs by date and staff
    const jobsByDateStaff = {};
    jobs.forEach(j => {
        if (!j.job_date || j.status === 'Cancelled') return;
        const key = `${j.job_date}__${j.assigned_to || 'unassigned'}`;
        if (!jobsByDateStaff[key]) jobsByDateStaff[key] = [];
        jobsByDateStaff[key].push(j);
    });

    const statusColors = {
        'Scheduled': '#dbeafe',
        'In Progress': '#fef3c7',
        'Completed': '#d1fae5',
    };

    const staffRows = [{ id: 'unassigned', name: '⚠️ Unassigned' }, ...staff];

    container.innerHTML = `
        <table style="min-width:900px;width:100%;border-collapse:collapse;font-size:0.82rem;">
            <thead>
                <tr>
                    <th style="padding:0.6rem 0.75rem;background:#1e40af;color:#fff;text-align:left;min-width:120px;">Staff</th>
                    ${days.map(d => {
                        const dateStr = d.toISOString().split('T')[0];
                        const isToday = dateStr === today;
                        return `<th style="padding:0.6rem 0.5rem;background:${isToday ? '#2563eb' : '#1e40af'};color:#fff;text-align:center;min-width:120px;">
                            ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            ${isToday ? '<br><span style="font-size:0.7rem;opacity:0.85;">Today</span>' : ''}
                        </th>`;
                    }).join('')}
                </tr>
            </thead>
            <tbody>
                ${staffRows.map((s, si) => `
                    <tr style="background:${si % 2 === 0 ? '#fff' : '#f8fafc'};">
                        <td style="padding:0.5rem 0.75rem;font-weight:600;border-right:2px solid #e2e8f0;vertical-align:top;">${s.name}</td>
                        ${days.map(d => {
                            const dateStr = d.toISOString().split('T')[0];
                            const key = `${dateStr}__${s.id === 'unassigned' ? 'unassigned' : s.id}`;
                            const cellJobs = jobsByDateStaff[key] || [];
                            const isToday = dateStr === today;
                            return `<td style="padding:0.4rem 0.5rem;vertical-align:top;border-right:1px solid #e2e8f0;background:${isToday ? '#eff6ff' : 'transparent'};">
                                ${cellJobs.length === 0 ? '<span style="color:#cbd5e1;font-size:0.7rem;">—</span>' :
                                    cellJobs.map(j => `
                                        <div style="background:${statusColors[j.status] || '#f1f5f9'};border-radius:4px;padding:0.25rem 0.4rem;margin-bottom:0.25rem;cursor:pointer;" onclick="viewJobDetails(${j.id})" title="${j.customer_name} — ${j.service_name}">
                                            <div style="font-weight:600;font-size:0.78rem;">${j.service_name || 'Job'}</div>
                                            <div style="color:#374151;font-size:0.72rem;">${j.customer_name || ''}</div>
                                            <div style="color:#64748b;font-size:0.7rem;">${j.job_time || 'TBD'}</div>
                                        </div>
                                    `).join('')}
                            </td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p style="color:#94a3b8;font-size:0.75rem;margin-top:0.75rem;padding:0 0.25rem;">Click any job to view details. Colors: 🔵 Scheduled &nbsp; 🟡 In Progress &nbsp; 🟢 Completed</p>
    `;
}

// ════════════════════════════════════════════════
// FEATURE 12 — REBOOK CUSTOMER
// ════════════════════════════════════════════════

async function rebookCustomer(customerId) {
    try {
        const [custRes, jobsRes] = await Promise.all([
            featApiGet(`/api/customers/${customerId}`),
            featApiGet(`/api/jobs?limit=500`)
        ]);

        if (!custRes.success) { featNotify('Could not load customer', 'error'); return; }
        const c = custRes.data;
        const allJobs = (jobsRes.success ? (jobsRes.data || []) : []);
        const custJobs = allJobs.filter(j => j.customer_id == customerId && j.status === 'Completed');
        const lastJob = custJobs.sort((a, b) => new Date(b.job_date) - new Date(a.job_date))[0];

        // Open create job modal with customer pre-selected
        await showCreateJobModal();

        setTimeout(() => {
            const custSelect = document.getElementById('job-customer');
            if (custSelect) custSelect.value = customerId;

            if (lastJob) {
                const svcSelect = document.getElementById('job-service');
                if (svcSelect && lastJob.service_id) svcSelect.value = lastJob.service_id;

                const locInput = document.getElementById('job-location');
                if (locInput && lastJob.location) locInput.value = lastJob.location;
            }

            // Set date to tomorrow
            const dateInput = document.getElementById('job-date');
            if (dateInput) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                dateInput.value = tomorrow.toISOString().split('T')[0];
            }
        }, 400);

        featNotify(`Rebooking for ${c.name} — please set the date and time`);
    } catch (e) {
        featNotify('Could not open rebook form', 'error');
    }
}
