# 🚀 Deploy to Railway via GitHub Auto-Deploy

**Fastest Method** - Deploy in 5 minutes with automatic redeploys on every git push.

---

## 📋 Pre-Deployment Checklist

Before starting, make sure you have:

- ✅ Railway account (create at https://railway.app)
- ✅ GitHub account with FieldOps-Core repo
- ✅ A strong JWT_SECRET ready (will generate below)
- ✅ Gmail App Password ready (see below)
- ✅ Hugging Face API key ready

**⚠️ IMPORTANT:** Ensure your `.env` file is NOT committed to GitHub!

```bash
# Check if .env is tracked
git ls-files | grep .env

# If shows .env, remove it:
git rm --cached .env
git commit -m "Remove .env from tracking"
git push origin main
```

---

## Step 1: Generate Strong Secrets

Run these commands in PowerShell:

### Generate JWT_SECRET (32 random characters)
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - you'll paste it into Railway in Step 3.

Example output:
```
a7f2c8e1b9d4f3a2c1e5b8d9f2a3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

---

## Step 2: Get Gmail App Password

Gmail requires an app-specific password (not your regular password):

1. Go to: **https://myaccount.google.com/security**
2. In left menu → **App passwords**
3. Select: **Mail** and **Windows Computer**
4. Click **Generate**
5. Copy the 16-character password (with spaces)

Example: `xxxx xxxx xxxx xxxx`

---

## Step 3: Connect GitHub to Railway

### 3a. Create Railway Project

1. Go to **https://railway.app**
2. Sign in with GitHub (fastest option)
3. Click **+ New Project**
4. Select **Deploy from GitHub repo**

### 3b. Select Your Repository

1. Click **Configure GitHub App** (if first time)
2. Authorize Railway to access your repos
3. Select **FieldOps-Core**
4. Click **Deploy**

Railway will now:
- Detect your `package.json`
- See the `Procfile` we created
- Start building your app

---

## Step 4: Set Environment Variables

While Railway builds, add your secrets:

1. Railway Dashboard → Your Project
2. Click the **Variables** tab
3. Add each variable below:

### Copy-Paste These (one by one)

```
NODE_ENV = production
```

```
PORT = 8080
```

```
APP_URL = https://YOUR-PROJECT-ID.up.railway.app
```
*(Check Railway URL in top right - looks like: `https://fieldops-core-prod.up.railway.app`)*

```
JWT_SECRET = [PASTE YOUR 64-CHAR SECRET FROM STEP 1]
```

```
EMAIL_USER = your_email@gmail.com
```

```
EMAIL_PASS = [PASTE 16-CHAR APP PASSWORD FROM STEP 2]
```

```
ADMIN_EMAIL = your_email@gmail.com
```

```
ADMIN_PHONE = +1-555-0000
```

```
HUGGING_FACE_API_KEY = [YOUR API KEY FROM https://huggingface.co/settings/tokens]
```

```
HUGGING_FACE_MODEL = mistral-7b-instruct-v0.2
```

---

## Step 5: Wait for Deployment

1. Go to **Deployments** tab
2. Watch the build progress
3. Logs will show real-time output

**Success looks like:**
```
✅ FieldOps Core running on port 8080
🌐 Server URL: https://your-railway-project.up.railway.app
📊 Admin Dashboard: https://your-railway-project.up.railway.app/admin
⚡ Real-time updates enabled
```

---

## Step 6: Test Your Deployment

Once you see the success message:

### Test the API
```powershell
# Replace with your actual Railway URL
Invoke-WebRequest -Uri "https://your-project.up.railway.app/api/booking/services" -UseBasicParsing
```

Should return list of services (JSON).

### Test Admin Dashboard
```
https://your-project.up.railway.app/admin
```

Should load the login page.

### Test Booking Form
```
https://your-project.up.railway.app/booking.html
```

Should load the booking form.

---

## Step 7: Enable Auto-Deploy (Optional but Recommended)

Now every `git push` automatically redeploys:

1. Railway Dashboard → Project Settings
2. Find **GitHub** section
3. Toggle **"Auto Deploy"** = ON
4. Select branch: `main`

Done! Future pushes auto-deploy.

Test it:
```bash
git add .
git commit -m "Test auto-deploy"
git push origin main
```

Railway will automatically redeploy in ~2-3 minutes.

---

## 🎉 You're Live!

Your app is now running at: `https://your-railway-project.up.railway.app`

### Share these links:
- **Admin Dashboard:** `https://your-project.up.railway.app/admin`
- **Customer Booking:** `https://your-project.up.railway.app/booking.html`
- **Staff App:** `https://your-project.up.railway.app/staff`

---

## Monitoring & Troubleshooting

### View Logs
Railway Dashboard → Logs tab → See all activity

### Common Issues

**"Database locked"**
- Solution: Wait a few seconds and refresh
- Click Redeploy in Railway dashboard

**"Email not sending"**
- Verify Gmail App Password is correct
- Check SPAM folder
- View logs for SMTP errors

**"API returning 404"**
- Verify APP_URL variable is set correctly
- Check that app shows "running on port 8080" in logs

**"CSS/JS not loading"**
- Clear browser cache (Ctrl+Shift+Del)
- Check that static files exist in `/frontend`

---

## 🔄 Update Your App

To deploy new changes:

```bash
# Make your changes
git add .
git commit -m "Update feature"
git push origin main

# Railway auto-deploys in 1-2 minutes
# Watch logs: Railway Dashboard → Logs
```

That's it! No manual deploy commands needed.

---

## 🔐 Security Checklist

After deployment, verify:

- ✅ .env NOT in git history
- ✅ Secrets stored in Railway (not in code)
- ✅ JWT_SECRET is 32+ characters
- ✅ Email credentials are app-specific passwords
- ✅ NODE_ENV = production
- ✅ No hardcoded URLs in code

---

## Next Steps

1. Test all user flows (booking, admin, staff)
2. Monitor Railway logs for 24 hours
3. Set up custom domain (if needed)
4. Enable error notifications in Railway settings

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Deployment Guide:** See RAILWAY_DEPLOYMENT.md
- **Readiness Report:** See DEPLOYMENT_READINESS.md

---

**Deployment time: ~5-10 minutes total** ⚡
