// ════════════════════════════════════════════════
// FEATURE 6 — CUSTOMER RATINGS / REVIEWS
// ════════════════════════════════════════════════

async function loadReviews() {
    const list = document.getElementById('reviews-list');
    if (list) list.innerHTML = '<div class="loading">Loading reviews...</div>';

    try {
        const [summaryData, reviewsData] = await Promise.all([
            featApiGet('/api/reviews/summary'),
            featApiGet('/api/reviews')
        ]);

        if (summaryData.success && summaryData.data) {
            const s = summaryData.data;
            const avg = parseFloat(s.avg_rating || 0);
            const stars = '⭐'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
            document.getElementById('avg-rating').textContent = avg ? `${avg} ${stars}` : '—';
            document.getElementById('total-reviews').textContent = s.total_reviews || 0;
            document.getElementById('five-star-count').textContent = s.five_star || 0;
            document.getElementById('low-star-count').textContent = s.low_star || 0;
        }

        if (!reviewsData.success || !reviewsData.data?.length) {
            if (list) list.innerHTML = '<p style="color:#64748b;padding:1.5rem;">No reviews yet. Reviews are sent automatically after completed jobs.</p>';
            return;
        }

        if (list) {
            list.innerHTML = reviewsData.data.map(r => {
                const stars = '⭐'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                const color = r.rating >= 4 ? '#d1fae5' : r.rating >= 3 ? '#fef3c7' : '#fee2e2';
                return `
                    <div class="customer-card" style="border-left:4px solid ${r.rating>=4?'#10b981':r.rating>=3?'#f59e0b':'#ef4444'};">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
                            <div>
                                <strong>${r.customer_name || 'Customer'}</strong>
                                <span style="color:#64748b;font-size:0.8rem;margin-left:0.5rem;">${r.service_name || ''} &bull; ${r.job_date || ''}</span>
                            </div>
                            <span style="font-size:1.1rem;">${stars}</span>
                        </div>
                        ${r.comment ? `<p style="color:#374151;font-size:0.875rem;font-style:italic;">"${r.comment}"</p>` : '<p style="color:#94a3b8;font-size:0.8rem;">No comment</p>'}
                        <p style="color:#94a3b8;font-size:0.75rem;margin-top:0.5rem;">${new Date(r.created_at).toLocaleString()}</p>
                    </div>
                `;
            }).join('');
        }
    } catch (e) {
        if (list) list.innerHTML = '<p style="color:#dc2626;">Failed to load reviews.</p>';
    }
}

// ════════════════════════════════════════════════
// FEATURE 8 — WAITING LIST
// ════════════════════════════════════════════════

async function loadWaitingList() {
    const el = document.getElementById('waiting-list-items');
    if (el) el.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const filter = document.getElementById('waiting-filter')?.value || 'all';
        const data = await featApiGet(`/api/waiting-list${filter !== 'all' ? `?status=${filter}` : ''}`);
        if (!data.success || !data.data?.length) {
            if (el) el.innerHTML = '<p style="color:#64748b;padding:1.5rem;">No entries in the waiting list. 🎉</p>';
            return;
        }
        if (el) {
            el.innerHTML = data.data.map(e => `
                <div class="customer-card" style="border-left:4px solid #f59e0b;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
                        <div>
                            <strong>${e.name}</strong>
                            <span style="color:#64748b;font-size:0.8rem;margin-left:0.5rem;">${e.phone}</span>
                            ${e.email ? `<span style="color:#64748b;font-size:0.8rem;margin-left:0.5rem;">${e.email}</span>` : ''}
                        </div>
                        <span class="status-badge status-${e.status}">${e.status}</span>
                    </div>
                    <p><strong>Service:</strong> ${e.service} &bull; <strong>Preferred:</strong> ${e.preferred_date || 'Flexible'} ${e.preferred_time || ''}</p>
                    ${e.notes ? `<p style="font-size:0.82rem;color:#64748b;">Notes: ${e.notes}</p>` : ''}
                    <p style="color:#94a3b8;font-size:0.75rem;">Added: ${new Date(e.created_at).toLocaleString()}</p>
                    <div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
                        <button class="btn-small" onclick="updateWaitingListStatus(${e.id},'contacted')">Mark Contacted</button>
                        <button class="btn-small" style="background:#d1fae5;color:#065f46;border-color:#6ee7b7;" onclick="updateWaitingListStatus(${e.id},'booked')">Mark Booked</button>
                        <button class="btn-small" style="background:#fee2e2;color:#dc2626;border-color:#fca5a5;" onclick="updateWaitingListStatus(${e.id},'removed')">Remove</button>
                        <button class="btn-small" style="background:#eff6ff;color:#2563eb;border-color:#bfdbfe;" onclick="callCustomerFromList('${e.phone}')">📞 Call</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        if (el) el.innerHTML = '<p style="color:#dc2626;">Failed to load waiting list.</p>';
    }
}

async function updateWaitingListStatus(id, status) {
    try {
        const res = await featApiPatch(`/api/waiting-list/${id}`, { status });
        if (res.success) {
            featNotify(`Status updated to ${status}`);
            loadWaitingList();
        } else {
            featNotify('Failed to update', 'error');
        }
    } catch (e) {
        featNotify('Network error', 'error');
    }
}

function callCustomerFromList(phone) {
    window.location.href = `tel:${phone}`;
}
