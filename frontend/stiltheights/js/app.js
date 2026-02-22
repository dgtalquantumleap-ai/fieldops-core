/* ============================================================
   STILT HEIGHTS — Main Website JS
   Calgary's Premier Professional Cleaning Service
   stiltheights@gmail.com | 825-994-6606
   ============================================================ */

const API_URL = '/api';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initHeaderScroll();
    initFAQ();
    initStatCounters();
    initSmoothScroll();
    loadServices();
    loadTestimonials();
    loadPricingPlans();
    loadServicesIntoQuoteForm();
    setupQuoteForm();
    initStickyCTA();
});

// ============================================================
// MOBILE NAV DRAWER
// ============================================================
function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const drawer    = document.getElementById('mobile-nav-drawer');
    const overlay   = document.getElementById('mobile-nav-overlay');
    const closeBtn  = document.getElementById('mobile-close');

    if (!hamburger) return;

    function openNav() {
        hamburger.classList.add('open');
        drawer.classList.add('active');
        overlay.classList.add('active');
        hamburger.setAttribute('aria-expanded', 'true');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        hamburger.classList.remove('open');
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
        const isOpen = drawer.classList.contains('active');
        isOpen ? closeNav() : openNav();
    });

    if (closeBtn)  closeBtn.addEventListener('click', closeNav);
    if (overlay)   overlay.addEventListener('click', closeNav);

    // Close on nav link click
    drawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeNav);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('active')) closeNav();
    });
}

// ============================================================
// HEADER SCROLL SHADOW
// ============================================================
function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
}

// ============================================================
// FAQ ACCORDION
// ============================================================
function initFAQ() {
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const isOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));

            // Open clicked (unless it was already open)
            if (!isOpen) item.classList.add('open');
        });
    });
}

// ============================================================
// STAT COUNTERS (Intersection Observer)
// ============================================================
function initStatCounters() {
    const counters = document.querySelectorAll('.counter[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1600;
    const start    = performance.now();

    function tick(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
    }
    requestAnimationFrame(tick);
}

// ============================================================
// SMOOTH SCROLL (for anchor links outside the drawer)
// ============================================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href').slice(1);
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ============================================================
// STICKY CTA — show after scrolling past hero
// ============================================================
function initStickyCTA() {
    const bar  = document.getElementById('sticky-cta');
    const hero = document.getElementById('home');
    if (!bar || !hero) return;

    // On mobile the sticky bar is always visible (CSS grid display:none → grid)
    // We only need to show it after user scrolls past hero on desktop — but CSS
    // already handles display via media query, so nothing extra needed here.
}

// ============================================================
// LOAD SERVICES FROM API
// ============================================================
async function loadServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    try {
        const res     = await fetch(`${API_URL}/booking/services`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result  = await res.json();
        const services = result.data || result;

        if (!Array.isArray(services) || services.length === 0) {
            renderStaticServices();
            return;
        }

        grid.innerHTML = services.map(s => `
            <div class="service-card">
                <div class="service-icon">${serviceIcon(s.name)}</div>
                <h3>${escHtml(s.name)}</h3>
                <p>${escHtml(s.description || 'Professional cleaning service tailored to your needs')}</p>
                <div class="service-price">${s.price ? '$' + s.price : 'Get a quote'}</div>
                <a href="/booking.html?service=${encodeURIComponent(s.name)}" class="btn-book-link">Book Now</a>
            </div>
        `).join('');
    } catch {
        renderStaticServices();
    }
}

function renderStaticServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    grid.innerHTML = [
        { icon: '🏠', name: 'Regular Housekeeping',    desc: 'Consistent weekly or bi-weekly home cleaning tailored to your routine.',            price: '$200/mo' },
        { icon: '🧼', name: 'One-time Deep Clean',      desc: 'A thorough top-to-bottom deep clean for any occasion or time of year.',             price: '$80/hr'  },
        { icon: '🏢', name: 'Commercial Cleaning',      desc: 'Professional office and commercial space cleaning for a healthy workplace.',         price: '$120/hr' },
        { icon: '📦', name: 'Move In / Out Cleaning',   desc: 'Leave your old place spotless or start fresh in your new one — we handle it all.',  price: 'Custom'  },
        { icon: '🪟', name: 'Window Cleaning',          desc: 'Crystal-clear interior and exterior window cleaning for homes and businesses.',      price: 'Custom'  },
        { icon: '🟦', name: 'Carpet Cleaning',          desc: 'Deep carpet extraction cleaning to remove stains, allergens, and odours.',           price: 'Custom'  },
    ].map(s => `
        <div class="service-card">
            <div class="service-icon">${s.icon}</div>
            <h3>${s.name}</h3>
            <p>${s.desc}</p>
            <div class="service-price">${s.price}</div>
            <a href="/booking.html?service=${encodeURIComponent(s.name)}" class="btn-book-link">Book Now</a>
        </div>
    `).join('');
}

// ============================================================
// LOAD TESTIMONIALS
// ============================================================
async function loadTestimonials() {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;

    // Try the API first (WordPress or local endpoint)
    try {
        const res = await fetch(`${API_URL}/wp/testimonials`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error();

        grid.innerHTML = data.map(t => `
            <div class="testimonial-card">
                <div class="testimonial-header">
                    <div class="testimonial-avatar">${initials(t.customer_name)}</div>
                    <div class="t-rating">${'★'.repeat(Math.round(t.rating || 5))}</div>
                </div>
                <div class="testimonial-content">
                    <p>${escHtml(t.content)}</p>
                </div>
                <div class="testimonial-footer">
                    <div class="t-author">
                        <strong>${escHtml(t.customer_name)}</strong>
                        <span>${escHtml(t.service || '')}</span>
                    </div>
                    <div class="t-date">${formatDate(t.date)}</div>
                </div>
            </div>
        `).join('');
    } catch {
        renderStaticTestimonials();
    }
}

function renderStaticTestimonials() {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;
    const reviews = [
        {
            initials: 'SJ',
            name: 'Sarah Johnson',
            service: 'Regular Housekeeping',
            rating: 5,
            text: 'Stilt Heights completely transformed our home! Their attention to detail and professionalism is outstanding. I trust them with my house every single week — absolutely worth every penny.',
            date: 'Jan 2025',
        },
        {
            initials: 'MC',
            name: 'Michael Chen',
            service: 'Commercial Cleaning',
            rating: 5,
            text: 'As a business owner, I needed a cleaning service I could count on. Stilt Heights delivers consistent, high-quality results every visit. Our office has genuinely never looked better.',
            date: 'Dec 2024',
        },
        {
            initials: 'ER',
            name: 'Emily Rodriguez',
            service: 'Move In & Out Cleaning',
            rating: 5,
            text: 'The move-out cleaning was exceptional — the landlord was amazed. They got my full deposit back for me! Fast, thorough, and incredibly professional from start to finish.',
            date: 'Nov 2024',
        },
    ];
    grid.innerHTML = reviews.map(r => `
        <div class="testimonial-card">
            <div class="testimonial-header">
                <div class="testimonial-avatar">${r.initials}</div>
                <div class="t-rating">${'★'.repeat(r.rating)}</div>
            </div>
            <div class="testimonial-content">
                <p>${r.text}</p>
            </div>
            <div class="testimonial-footer">
                <div class="t-author">
                    <strong>${r.name}</strong>
                    <span>${r.service}</span>
                </div>
                <div class="t-date">${r.date}</div>
            </div>
        </div>
    `).join('');
}

// ============================================================
// LOAD PRICING PLANS
// ============================================================
function loadPricingPlans() {
    const grid = document.getElementById('pricing-grid');
    if (!grid) return;

    const plans = [
        {
            name: 'Regular Housekeeping',
            price: '200',
            per: '/mo',
            featured: false,
            service: 'Regular Housekeeping',
            feats: ['Weekly or bi-weekly visits', 'Kitchen & bathrooms', 'All living areas', 'Dusting & vacuuming', 'Trash removal', 'Dedicated cleaner'],
        },
        {
            name: 'One-time Deep Clean',
            price: '80',
            per: '/hr',
            featured: true,
            badge: 'Most Popular',
            service: 'One-time Cleaning',
            feats: ['Full top-to-bottom clean', 'All rooms included', 'Inside cabinets & appliances', 'Windows & mirrors', 'Baseboards & vents', '100% satisfaction guarantee'],
        },
        {
            name: 'Commercial Cleaning',
            price: '120',
            per: '/hr',
            featured: false,
            service: 'Commercial Cleaning',
            feats: ['Office & retail spaces', 'Restrooms & kitchens', 'Common areas', 'Trash removal', 'Flexible scheduling', 'Fully insured team'],
        },
    ];

    grid.innerHTML = plans.map(p => `
        <div class="pricing-card${p.featured ? ' featured' : ''}">
            ${p.badge ? `<div class="pricing-badge">${p.badge}</div>` : ''}
            <div class="pricing-head">
                <h3>${p.name}</h3>
                <div class="price-row">
                    <span class="price-dollar">$</span>
                    <span class="price-amount">${p.price}</span>
                    <span class="price-per">${p.per}</span>
                </div>
            </div>
            <div class="pricing-feats">
                ${p.feats.map(f => `<p>${f}</p>`).join('')}
            </div>
            <a href="/booking.html?service=${encodeURIComponent(p.service)}" class="${p.featured ? 'btn-gold' : 'btn-teal'}">
                ${p.featured ? 'Book Now' : 'Get Started'}
            </a>
        </div>
    `).join('');
}

// ============================================================
// QUICK QUOTE FORM
// ============================================================
async function loadServicesIntoQuoteForm() {
    const sel = document.getElementById('quick-service');
    if (!sel) return;

    try {
        const res    = await fetch(`${API_URL}/booking/services`);
        if (!res.ok) throw new Error();
        const result = await res.json();
        const list   = result.data || result;
        if (!Array.isArray(list) || list.length === 0) throw new Error();

        sel.innerHTML = '<option value="">Select a service...</option>' +
            list.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
    } catch {
        // Static fallback
        const defaults = [
            'Regular Housekeeping', 'One-time Deep Clean', 'Commercial Cleaning',
            'Move In / Out Cleaning', 'Carpet Cleaning', 'Window Cleaning', 'Event Cleanup',
        ];
        sel.innerHTML = '<option value="">Select a service...</option>' +
            defaults.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
    }
}

function setupQuoteForm() {
    const form = document.getElementById('quick-quote-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const service = document.getElementById('quick-service').value;
        // Redirect to booking page with service pre-selected
        window.location.href = `/booking.html${service ? '?service=' + encodeURIComponent(service) : ''}`;
    });
}

// ============================================================
// HELPER UTILITIES
// ============================================================
function escHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str || '').replace(/[&<>"']/g, m => map[m]);
}

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatDate(str) {
    if (!str) return '';
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}

function serviceIcon(name) {
    const icons = {
        'Regular Housekeeping':    '🏠',
        'One-time Cleaning':       '🧼',
        'One-time Deep Clean':     '🧼',
        'Commercial Cleaning':     '🏢',
        'Event Cleanup':           '🎉',
        'Dish Washing':            '🍽️',
        'Carpet Cleaning':         '🟦',
        'Window Cleaning':         '🪟',
        'Move In & Out Cleaning':  '📦',
        'Move In / Out Cleaning':  '📦',
        'Laundry Services':        '👕',
        'Trash Removal':           '🗑️',
        'Outdoor Furniture':       '🪑',
        'Dry Cleaning':            '👔',
        'Appliance Deep Clean':    '🔌',
        'Post-Construction':       '🏗️',
    };
    return icons[name] || '🧹';
}

// ============================================================
// BOOKING SHORTCUT (called from outside if needed)
// ============================================================
function bookService(name) {
    window.location.href = name
        ? `/booking.html?service=${encodeURIComponent(name)}`
        : '/booking.html';
}

// ============================================================
// TOAST NOTIFICATIONS (success / error)
// ============================================================
function showToast(type, title, message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const icon = type === 'success' ? '✅' : '❌';
    const div  = document.createElement('div');
    div.className = `toast${type === 'error' ? ' error' : ''}`;
    div.innerHTML = `
        <div class="toast-body">
            <div class="toast-icon">${icon}</div>
            <h3>${escHtml(title)}</h3>
            <p>${escHtml(message)}</p>
            <button class="btn-teal" onclick="this.closest('.toast').remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(div);

    setTimeout(() => { if (div.parentNode) div.remove(); }, 8000);
}
