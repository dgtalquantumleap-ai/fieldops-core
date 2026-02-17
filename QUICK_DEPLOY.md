# ⚡ GitHub Auto-Deploy Quick Reference

## 🚀 5-Minute Setup

### 1️⃣ Generate JWT_SECRET (PowerShell)
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
📋 Copy the output (64 characters)

---

### 2️⃣ Get Gmail App Password
1. Go: https://myaccount.google.com/security
2. Click: App passwords
3. Select: Mail + Windows Computer
4. Copy: 16-char password

---

### 3️⃣ Connect GitHub to Railway
1. Go: https://railway.app
2. Sign in with GitHub
3. Click: + New Project
4. Select: Deploy from GitHub repo
5. Choose: FieldOps-Core
6. Click: Deploy ✅

---

### 4️⃣ Set Environment Variables
While building, add these in Railway → Variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `APP_URL` | `https://YOUR-RAILWAY-URL.up.railway.app` |
| `JWT_SECRET` | Paste from step 1 |
| `EMAIL_USER` | Your Gmail |
| `EMAIL_PASS` | Paste from step 2 |
| `ADMIN_EMAIL` | Your email |
| `ADMIN_PHONE` | `+1-555-0000` |
| `HUGGING_FACE_API_KEY` | Your API key |
| `HUGGING_FACE_MODEL` | `mistral-7b-instruct-v0.2` |

---

### 5️⃣ Wait for Build ✅
Watch Railway → Deployments tab

Look for: `✅ FieldOps Core running on port 8080`

---

### 6️⃣ Test Live
- **API:** `https://your-project.up.railway.app/api/booking/services`
- **Admin:** `https://your-project.up.railway.app/admin`
- **Booking:** `https://your-project.up.railway.app/booking.html`

---

### 7️⃣ Enable Auto-Deploy (Optional)
Railway → Settings → Toggle "Auto Deploy" = ON

Now: `git push` = Auto redeploy! 🎉

---

## 🔗 Your Live Links
Once deployed, save these:

```
https://YOUR-PROJECT-ID.up.railway.app/admin
https://YOUR-PROJECT-ID.up.railway.app/booking.html
https://YOUR-PROJECT-ID.up.railway.app/staff
```

---

## ❌ Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Check Railway logs > Deployment |
| Database error | Wait 30s, click Redeploy |
| Email not working | Verify App Password (not regular password) |
| Not loading | Verify APP_URL variable matches Railway URL |
| 404 errors | Clear cache & check logs |

---

## 📚 Full Guides
- **Detailed Guide:** DEPLOY_GITHUB_AUTO.md
- **Deployment Info:** RAILWAY_DEPLOYMENT.md
- **Readiness Report:** DEPLOYMENT_READINESS.md

---

**⏱️ Total time: 5-10 minutes**

Good luck! 🚀
