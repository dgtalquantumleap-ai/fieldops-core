/**
 * features-staff.js — Staff app enhancements
 * Feature 10: GPS check-in on job start
 * Feature 11: Customer notes visible in staff job detail
 * Feature 13: Staff expense logging
 *
 * These functions are called from job-details-enhanced.js
 * We PATCH in after that file loads using the same global scope.
 */

// ════════════════════════════════════════════════
// FEATURE 10 — GPS CHECK-IN ON JOB START
// ════════════════════════════════════════════════

// Patch startJob after DOM loads (staff app uses jobDetailsManager class)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof jobDetailsManager !== 'undefined' && jobDetailsManager.startJob) {
            const _origStart = jobDetailsManager.startJob.bind(jobDetailsManager);
            jobDetailsManager.startJob = async function() {
                const job = this.currentJob;
                if (job && job.id && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                            try {
                                const token = localStorage.getItem('staffToken') || '';
                                await fetch(`/api/jobs/${job.id}/checkin`, {
                                    method: 'PATCH',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                                });
                                console.log('📍 GPS check-in recorded for job', job.id);
                            } catch (e) { console.warn('GPS check-in failed:', e); }
                        },
                        (err) => console.warn('GPS not available:', err.message),
                        { timeout: 5000 }
                    );
                }
                return _origStart();
            };
            console.log('✅ GPS check-in patch applied to startJob');
        }
    }, 800);
});

// ════════════════════════════════════════════════
// FEATURE 11 — CUSTOMER NOTES VISIBLE IN JOB MODAL
// ════════════════════════════════════════════════

// Patch the job detail rendering to show notes prominently
(function patchJobDetailNotes() {
    const _origOpenModal = window.openJobDetail || window.showJobDetail;

    // Hook into the job detail modal after it opens
    const observer = new MutationObserver(() => {
        const notesSection = document.getElementById('job-notes-section');
        const notesEl = document.getElementById('modal-job-notes');
        if (notesSection && notesEl && notesEl.textContent && notesEl.textContent !== 'No additional notes') {
            notesSection.classList.remove('hidden-notes');
        }
    });

    const modal = document.getElementById('job-detail-modal');
    if (modal) {
        observer.observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
    }
})();

// ════════════════════════════════════════════════
// FEATURE 13 — STAFF EXPENSE LOGGING IN JOB MODAL
// ════════════════════════════════════════════════

function showExpenseForm(jobId) {
    const existing = document.getElementById('staff-expense-section');
    if (existing) existing.remove();

    const section = document.createElement('div');
    section.id = 'staff-expense-section';
    section.className = 'job-details-card-enhanced';
    section.style.marginTop = '1rem';
    section.innerHTML = `
        <h4>💸 Log Job Expense</h4>
        <div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:0.75rem;">
            <input type="text" id="expense-desc" placeholder="What was purchased? (e.g. Cleaning spray)" style="padding:0.6rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;">
            <input type="number" id="expense-amt" placeholder="Amount ($)" min="0" step="0.01" style="padding:0.6rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;">
            <select id="expense-cat" style="padding:0.6rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;">
                <option value="Supplies">Supplies</option>
                <option value="Equipment">Equipment</option>
                <option value="Fuel">Fuel / Transport</option>
                <option value="Other">Other</option>
            </select>
            <button onclick="submitJobExpense(${jobId})" style="background:#2563eb;color:#fff;border:none;padding:0.7rem 1.25rem;border-radius:6px;font-size:0.9rem;font-weight:600;cursor:pointer;">Submit Expense</button>
        </div>
        <div id="expense-list-staff" style="margin-top:1rem;"></div>
    `;

    const actionsCard = document.querySelector('.job-actions-card-enhanced');
    if (actionsCard) {
        actionsCard.parentNode.insertBefore(section, actionsCard);
    } else {
        const modalBody = document.querySelector('.modal-body-enhanced');
        if (modalBody) modalBody.appendChild(section);
    }

    loadJobExpenses(jobId);
}

async function loadJobExpenses(jobId) {
    const listEl = document.getElementById('expense-list-staff');
    if (!listEl) return;
    try {
        const token = localStorage.getItem('staffToken') || '';
        const res = await fetch(`/api/job-expenses?job_id=${jobId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success || !data.data?.length) {
            listEl.innerHTML = '<p style="color:#94a3b8;font-size:0.8rem;">No expenses logged yet.</p>';
            return;
        }
        listEl.innerHTML = `
            <p style="font-weight:600;font-size:0.85rem;margin-bottom:0.4rem;">Logged expenses (Total: $${data.total})</p>
            ${data.data.map(e => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.35rem 0;border-bottom:1px solid #e2e8f0;font-size:0.82rem;">
                    <span>${e.description} <em style="color:#64748b;">(${e.category})</em></span>
                    <span style="font-weight:700;">$${parseFloat(e.amount).toFixed(2)}</span>
                </div>
            `).join('')}
        `;
    } catch (_) {}
}

async function submitJobExpense(jobId) {
    const desc = document.getElementById('expense-desc')?.value?.trim();
    const amt  = parseFloat(document.getElementById('expense-amt')?.value);
    const cat  = document.getElementById('expense-cat')?.value;

    if (!desc || isNaN(amt) || amt <= 0) {
        alert('Please enter a description and valid amount.');
        return;
    }

    try {
        const token = localStorage.getItem('staffToken') || '';
        const res = await fetch('/api/job-expenses', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: jobId, description: desc, amount: amt, category: cat })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('expense-desc').value = '';
            document.getElementById('expense-amt').value = '';
            loadJobExpenses(jobId);
            if (window.showNotification) showNotification('Expense logged ✅', 'success');
        } else {
            alert('Failed to log expense: ' + (data.error || 'Unknown error'));
        }
    } catch (e) {
        alert('Network error');
    }
}

// Patch the job detail enhanced openJobDetail to inject expense button
document.addEventListener('DOMContentLoaded', () => {
    // Hook into the Report Issue button area to add Expense button
    setTimeout(() => {
        const jobDetailModal = document.getElementById('job-detail-modal');
        if (!jobDetailModal) return;

        // Watch for when the modal becomes visible
        const obs = new MutationObserver(() => {
            if (jobDetailModal.classList.contains('active') || jobDetailModal.style.display === 'flex') {
                injectExpenseButton();
            }
        });
        obs.observe(jobDetailModal, { attributes: true, attributeFilter: ['class', 'style'] });
    }, 1000);
});

function injectExpenseButton() {
    if (document.getElementById('btn-log-expense')) return; // already injected
    const actionsDiv = document.querySelector('.action-buttons-enhanced');
    if (!actionsDiv) return;

    const btn = document.createElement('button');
    btn.id = 'btn-log-expense';
    btn.className = 'action-btn-large secondary';
    btn.innerHTML = '<i class="fas fa-receipt"></i><span>Log Expense</span>';
    btn.onclick = () => {
        const jobId = (typeof jobDetailsManager !== 'undefined' && jobDetailsManager.currentJob?.id)
            ? jobDetailsManager.currentJob.id
            : window._currentJobId || window.currentJobId;
        if (jobId) showExpenseForm(jobId);
    };
    actionsDiv.appendChild(btn);
}
