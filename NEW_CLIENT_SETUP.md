# FieldOps Core — New Client Setup Guide

> Complete this checklist to deploy a fully branded instance for a new client.
> Estimated time: **45–60 minutes** for a fresh deployment.

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/dgtalquantumleap-ai/fieldops-core.git client-name-fieldops
cd client-name-fieldops
npm install
```

---

## Step 2 — Create `.env` from the template

```bash
cp .env.example .env
```

Then fill in **all values** in `.env`:

### Business Branding (this is what gets injected into every email, page, and notification)

| Variable | Example |
|---|---|
| `BUSINESS_NAME` | `Green Leaf Cleaning` |
| `BUSINESS_PHONE` | `+1-403-555-1234` |
| `BUSINESS_EMAIL` | `info@greenleafcleaning.ca` |
| `BUSINESS_CITY` | `Edmonton, Alberta` |
| `BUSINESS_WEBSITE` | `www.greenleafcleaning.ca` |
| `BUSINESS_TAGLINE` | `Calgary's Greenest Clean` |
| `BUSINESS_INDUSTRY` | `Cleaning Services` |
| `BUSINESS_OWNER_NAME` | `Maria Santos` |
| `BUSINESS_OWNER_INITIALS` | `MS` |
| `BUSINESS_FOUNDED_YEAR` | `2019` |
| `BUSINESS_SERVICE_AREA` | `Edmonton & surrounding area` |

### Server

| Variable | Value |
|---|---|
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://your-railway-app.up.railway.app` |
| `ALLOWED_ORIGINS` | Same as APP_URL |

### Database

| Variable | Value |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string from Railway |

### Auth

| Variable | Notes |
|---|---|
| `JWT_SECRET` | Random 64+ character string |
| `SETUP_SECRET` | Random string — used once to create first admin |
| `ADMIN_EMAIL` | Client's admin email |
| `ADMIN_PASSWORD` | Strong password — change after first login |
| `ADMIN_PHONE` | Client's phone |

### Email (Gmail)

| Variable | Notes |
|---|---|
| `EMAIL_USER` | Gmail address to send from |
| `EMAIL_PASS` | Gmail App Password (not their real password) |

> **How to get a Gmail App Password:**
> Google Account → Security → 2-Step Verification → App Passwords → Generate

---

## Step 3 — Deploy to Railway

1. Create a new Railway project at railway.app
2. Add a **PostgreSQL** database (click + New → Database → PostgreSQL)
3. Copy the `DATABASE_URL` from the Postgres variables into your `.env`
4. Connect GitHub repo to Railway (or use Railway CLI: `railway up`)
5. Add all `.env` values into Railway → Project → Variables
6. Railway will auto-deploy on every push to `main`

---

## Step 4 — Create the first admin account

After deployment, hit this endpoint **once**:

```bash
curl -X POST https://your-app.up.railway.app/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "client@email.com",
    "password": "StrongPassword123!",
    "setup_secret": "YOUR_SETUP_SECRET"
  }'
```

Then **remove or rotate `SETUP_SECRET`** in Railway variables — this endpoint should only be used once.

---

## Step 5 — Add services

Log into the admin dashboard at `/admin`. Go to **Settings → Services** and add the client's specific services with prices. These appear on the booking page and in emails automatically.

---

## Step 6 — Customise the website (optional)

The customer-facing website is at `/website`. For a deeper rebrand:

- **Logo:** Replace the `<span class="logo-text">` in `frontend/website/index.html` with an `<img>` tag pointing to the client's logo
- **Colors:** Edit `frontend/website/css/styles.css` — look for `:root` CSS variables at the top
- **About section:** The about section has the owner's story — personalise `frontend/website/index.html` lines in the `#about` section
- **Hero text:** The "A Spotless Home Starts Here" headline can be updated per client in the same file

---

## Step 7 — Hand over to the client

Give the client:

- Admin dashboard URL: `https://their-app.up.railway.app/admin`
- Admin login email and password (they should change on first login)
- Staff app URL: `https://their-app.up.railway.app/staff`
- Customer booking page: `https://their-app.up.railway.app/booking.html`
- Customer website: `https://their-app.up.railway.app/website`

---

## What automatically rebrands when you set `.env`

| Feature | What changes |
|---|---|
| All emails (booking confirmation, invoices, reminders) | Business name, phone, email in footer |
| Booking confirmation page | Business name, phone |
| Customer website (`/website`) | Name, phone, email, city everywhere on the page |
| Admin dashboard | Business name in header |
| Notifications & scheduler emails | Business name in subject lines |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Emails not sending | Check `EMAIL_USER` and `EMAIL_PASS` in Railway Variables |
| Database errors on startup | Check `DATABASE_URL` is correct PostgreSQL connection string |
| Can't log in | Re-run Step 4 (create-admin endpoint) |
| Branding not showing | Verify all `BUSINESS_*` vars are set in Railway Variables |
| Schedulers not running | Check Railway logs — `npm install node-cron` if missing |

---

*FieldOps Core — Built for field service businesses. White-label ready.*
