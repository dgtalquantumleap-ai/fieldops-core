# GitHub Setup for Railway Deployment

## Step 1: Create GitHub Repository

1. Go to <https://github.com>
2. Click "New repository"
3. Repository name: `fieldops-core` (or your preferred name)
4. Description: `FieldOps Core - Professional Operations Management for Stilt Heights`
5. Make it **Public** (not private)
6. Click "Create repository"

## Step 2: Connect Local Git to GitHub

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fieldops-core.git

# Push to GitHub
git push -u origin master
```

## Step 3: Deploy to Railway

1. Go to <https://railway.app>
2. Click "New Project"
3. Connect your GitHub account
4. Select `fieldops-core` repository
5. Add environment variables:

   ```bash
   PORT=3000
   JWT_SECRET=your_super_secret_jwt_key_change_this_to_something_random
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   BASE_URL=https://your-project-name.up.railway.app
   ```

6. Click "Deploy"

## Railway URLs After Deployment

- **Admin**: <https://your-project-name.up.railway.app/admin>
- **Staff**: <https://your-project-name.up.railway.app/staff>
- **Booking**: <https://your-project-name.up.railway.app/booking.html>

## Notes

- Railway will automatically detect it's a Node.js project
- Free tier: 16 hours/day (perfect for business hours)
- Custom domain: Can add yourdomain.com later
