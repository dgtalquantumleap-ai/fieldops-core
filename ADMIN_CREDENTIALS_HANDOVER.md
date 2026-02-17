# Admin Credentials Management - Client Handover Guide

## 🎯 Overview
This document explains how to change FieldOps admin credentials for client handover.

## 📋 Current Credentials
- **Email:** dgtalquantumleap@gmail.com
- **Password:** admin123
- **Login URL:** http://localhost:3000/admin

## 🔧 Method 1: Command Line (Recommended for Clients)

### When to Use
- Initial client handover
- Regular password changes
- Email address changes
- Emergency credential updates

### Steps for Client

1. **Open Command Prompt/Terminal**
2. **Navigate to Project Directory**
   ```bash
   cd FieldOps-Core
   ```

3. **Run Update Script**
   ```bash
   node update-admin.js <new-email> <new-password>
   ```

### Examples

**Change Both Email and Password:**
```bash
node update-admin.js client@company.com newSecurePassword123
```

**Change Only Password (keep current email):**
```bash
node update-admin.js dgtalquantumleap@gmail.com newSecurePassword123
```

**Change Only Email (keep current password):**
```bash
node update-admin.js newemail@company.com admin123
```

### Expected Output
```
✅ Admin credentials updated successfully!
📧 New Email: client@company.com
🔑 New Password: newSecurePassword123

🌐 You can now login with these new credentials at:
   http://localhost:3000/admin
```

## 🌐 Method 2: Admin Dashboard

### When to Use
- Day-to-day password changes
- When client prefers web interface

### Steps
1. Go to: http://localhost:3000/admin
2. Login with current credentials
3. Navigate to Profile/Account Settings
4. Change email and/or password
5. Save changes

## 🔒 Security Best Practices

### For Client
- Use strong passwords (minimum 12 characters)
- Include numbers, symbols, and mixed case
- Change passwords every 90 days
- Don't share credentials
- Use password manager if possible

### For Development Team
- Never store passwords in plain text
- Use environment variables in production
- Enable audit logging if available
- Consider 2FA implementation

## 🚨 Emergency Procedures

### If Client Loses Access
1. Use command line method to reset
2. Verify new credentials work
3. Update documentation
4. Communicate changes to all team members

### If Script Fails
1. Check Node.js is installed: `node --version`
2. Check you're in correct directory: `pwd`
3. Check database exists: `dir fieldops.db`
4. Contact support with error message

## 📞 Support Information

### Technical Support
- Check the update-admin.js script for detailed error messages
- Review server logs for authentication issues
- Verify database permissions if needed

### Common Issues
- **"command not found"** - Ensure Node.js is installed and in PATH
- **"database locked"** - Stop the server before running script
- **"permission denied"** - Run as administrator if needed

## 🔄 Ongoing Maintenance

### Regular Tasks
- Monthly password reviews
- Quarterly access audits
- Update contact information
- Backup credentials securely

### Documentation Updates
- Keep this file updated with current credentials
- Note all changes with dates
- Maintain change log for compliance

---

**Last Updated:** $(date)
**Project:** FieldOps Core
**Version:** 1.0.0
