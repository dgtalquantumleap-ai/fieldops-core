# Railway Deployment Guide

## ✅ Pre-Deployment Checklist

### 🔴 CRITICAL - MUST DO BEFORE DEPLOYING

#### 1. **Remove Committed .env File** (SECURITY ISSUE)
The `.env` file is currently committed with exposed API keys. You MUST:

```bash
# Remove the .env file from git history
git rm --cached .env
git commit -m "Remove sensitive .env file from repository"

# Verify it's removed
git log --all --full-history -- .env
```

**NEVER commit .env files with credentials.**

#### 2. **Generate Strong JWT_SECRET**
Your current JWT_SECRET is weak. Generate a strong one:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

Update in Railway secrets: `JWT_SECRET=<your_generated_secret>`

---

### 📋 Railway Environment Variables (Set in Dashboard)

Add these in Railway project settings → Variables:

```
NODE_ENV=production
PORT=8080
APP_URL=https://your-railway-app.up.railway.app  # Replace with your actual Railway URL
JWT_SECRET=<strong_random_secret>
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=admin_email@gmail.com
ADMIN_PHONE=+1-555-0000
HUGGING_FACE_API_KEY=hf_xxxxxxxxxxxxxxxx
HUGGING_FACE_MODEL=mistral-7b-instruct-v0.2
```

⚠️ **Never set these values in .env file or commit them to git.**

---

### 🚀 Deployment Steps

#### 1. **Connect Repository to Railway**
- Go to [railway.app](https://railway.app)
- Create new project → Connect GitHub repo
- Select `FieldOps-Core` repository

#### 2. **Configure Build & Deploy**
- Railway → Project Settings → Build Command: (leave blank, uses `npm install`)
- Start Command: `npm start`
- Node Version: 18.x or 20.x (auto-detected from package.json)

#### 3. **Configure Environment Variables**
- Go to Railway Project → Variables
- Add all variables from section above
- Enable  "Auto Deploy on Push" (optional but recommended)

#### 4. **Deploy**
```bash
git push  # Triggers auto-deploy if enabled
# OR manually deploy through Railway dashboard
```

#### 5. **Verify Deployment**
- Check Railway logs: `Deployment → Logs`
- Look for: `✅ FieldOps Core running on port 8080`
- Test endpoint: `https://your-railway-app.up.railway.app/api/booking/services`

---

### 🔧 Database Configuration

**Good News:** SQLite is pre-configured and will work automatically.

The app uses SQLite with the path:
- **Production (Railway):** `/app/fieldops.db`
- **Local Development:** `./fieldops.db`

Database is initialized automatically on first `npm start`.

**⚠️ Important:** 
- SQLite database persists in Railway ephemeral storage
- Data survives redeploys but may be lost if Railway container crashes
- For mission-critical data, consider migrating to PostgreSQL later

---

### 📧 Email Configuration

**Gmail Setup (Recommended):**
1. Enable "Less secure app access" OR use App Password
2. Generate App Password (recommended):
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Create "App password" for Gmail
   - Use this password in `EMAIL_PASS`

3. Set in Railway Variables:
   ```
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```

---

### 🌐 Custom Domain Setup

After successful deployment:

1. **Get Railway URL:**
   - Railway → Project → Deployments → Copy URL
   - Format: `https://fieldops-core-xxxxxx.up.railway.app`

2. **Update APP_URL:**
   - Railway → Variables → Update `APP_URL` to your domain

3. **Custom Domain (Optional):**
   - Railway → Settings → Custom Domain
   - Point your domain DNS to Railway nameservers

---

### 🔐 Security Best Practices

- ✅ Use strong JWT_SECRET (32+ random characters)
- ✅ Set NODE_ENV=production
- ✅ Never commit .env file
- ✅ Use environment variables for all secrets
- ✅ Enable CORS with specific origins (in production)
- ✅ Rotate API keys monthly
- ✅ Monitor Railway logs for errors

---

### 📊 Monitoring & Troubleshooting

**View Logs:**
```
Railway Dashboard → Project → Logs
```

**Common Issues:**

1. **"PORT is not configured"**
   - Solution: Add `PORT=8080` to Variables

2. **"JWT_SECRET not long enough"**
   - Solution: Use `openssl rand -hex 32` for strong secret

3. **Database locked errors**
   - Solution: Restart deployment (Railway → Redeploy)

4. **Email not sending**
   - Check Gmail credentials
   - Verify App Password (not regular password)
   - Check SPAM folder

5. **CORS errors in browser**
   - Add your domain/URL to `allowedOrigins` in server.js

---

### ✅ Post-Deployment Verification

1. **Check Server Status:**
   ```
   curl https://your-railway-app.up.railway.app/api/booking/services
   ```

2. **Test Admin Login:**
   - Go to: `https://your-railway-app.up.railway.app/admin`
   - Use credentials created during setup

3. **Test Booking:**
   - Go to: `https://your-railway-app.up.railway.app/booking.html`
   - Submit test booking

4. **Check Logs:**
   - Verify no error messages in Railway logs
   - Should see: "✅ FieldOps Core running on port 8080"

---

### 🔄 Rolling Back

If deployment fails:

```
Railway Dashboard → Deployments → Select previous version → Redeploy
```

### 📝 Documentation

- [Railway Docs](https://docs.railway.app)
- [Express.js Production Guide](https://expressjs.com/en/advanced/best-practice-performance.html)
- [SQLite in Production](https://www.sqlite.org/appfile.html)

---

**Still having issues?** Check Railway logs → Project → Logs for detailed error messages.
