# 🚀 Deploy to Railway Using CLI

## Step 1: Install Railway CLI

### Windows (PowerShell):
```powershell
npm install -g @railway/cli
```

### Verify Installation:
```powershell
railway --version
```

---

## Step 2: Login to Railway

```powershell
railway login
```

This will:
- Open browser to railway.app
- Ask you to authorize
- Return to terminal automatically

---

## Step 3: Create Railway Project

```powershell
railway init
```

When prompted:
- **Project name:** `fieldops-core` (or your choice)
- **Select template:** Choose "Empty project"

---

## Step 4: Link to Repository (Optional but Recommended)

```powershell
railway link
```

This enables auto-deploy on git push.

---

## Step 5: Set Environment Variables

**IMPORTANT:** First, generate a strong JWT_SECRET:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output, you'll need it.

Then set all variables:

```powershell
# Core Configuration
railway variable add NODE_ENV production
railway variable add PORT 8080
railway variable add APP_URL https://your-railway-project.up.railway.app

# Security (use generated value)
railway variable add JWT_SECRET "your_generated_32_char_secret"

# Email Configuration
railway variable add EMAIL_USER "your_email@gmail.com"
railway variable add EMAIL_PASS "your_app_password"
railway variable add ADMIN_EMAIL "admin@example.com"
railway variable add ADMIN_PHONE "+1-555-0000"

# AI Configuration
railway variable add HUGGING_FACE_API_KEY "hf_your_api_key"
railway variable add HUGGING_FACE_MODEL "mistral-7b-instruct-v0.2"
```

**Where to get credentials:**
- **Email Password:** [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- **Hugging Face Key:** [Generate here](https://huggingface.co/settings/tokens)

---

## Step 6: Deploy

```powershell
railway up
```

The CLI will:
1. Build your app
2. Deploy to Railway
3. Show logs in real-time
4. Give you the live URL

**Wait for:** `✅ FieldOps Core running on port 8080`

---

## Step 7: Verify Deployment

Once deployed, test your endpoints:

```powershell
# Get your Railway URL from the output above, then:
curl https://your-railway-project.up.railway.app/api/booking/services

# Check admin dashboard loads:
https://your-railway-project.up.railway.app/admin
```

---

## Common Railway CLI Commands

```powershell
# View logs
railway logs

# View environment variables
railway variable list

# Add/update a variable
railway variable add VAR_NAME "value"

# Remove a variable
railway variable delete VAR_NAME

# View project status
railway status

# Redeploy current version
railway deploy

# Rollback to previous version
railway rollback

# Connect existing Railway project
railway link <project-id>

# Disconnect from Railway
railway unlink
```

---

## Troubleshooting

### "railway: command not found"
```powershell
npm install -g @railway/cli
```

### "Not authenticated"
```powershell
railway logout
railway login
```

### Deployment fails with build error
```powershell
# View detailed logs
railway logs --tail=100
```

### Database not initializing
The app auto-creates database on first start. Check logs for errors.

### Email not sending
- Verify Gmail App Password (not regular password)
- Check SPAM folder
- View logs for SMTP errors: `railway logs`

---

## Success Indicators ✅

Your app is deployed when you see:
- Green checkmark in Railway dashboard
- `✅ FieldOps Core running on port 8080` in logs
- Live URL provided
- API endpoints responding

---

## Auto-Deploy on Git Push (Optional)

If you ran `railway link`, pushes now auto-deploy:

```powershell
git add .
git commit -m "Production ready"
git push origin main
```

Railway automatically:
1. Detects push
2. Builds new version
3. Deploys (keeps old version as fallback)

---

## Next: Connect Your Domain (Optional)

After successful deployment, add custom domain in Railway dashboard:
- Settings → Domains
- Add your domain
- Follow DNS instructions

---

**Need help?** 
- Railway Docs: https://docs.railway.app
- Check logs: `railway logs`
- View files: `railway bash` (if available)
