# 🚀 Deployment Guide - Betinho Authentication System

## Prerequisites

- Vercel account
- GitHub repository connected to Vercel
- Access to repository settings

## Step 1: Generate JWT Secret

Generate a strong random secret for JWT token signing:

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Save this secret securely!** You'll need it for the next step.

## Step 2: Configure Vercel Environment Variables

### Via Vercel Dashboard:
1. Go to your project in Vercel
2. Navigate to **Settings** > **Environment Variables**
3. Add new variable:
   - **Name:** `JWT_SECRET`
   - **Value:** [paste your generated secret]
   - **Environments:** Production, Preview, Development (select all)
4. Click **Save**

### Via Vercel CLI:
```bash
vercel env add JWT_SECRET
# Paste your secret when prompted
# Select all environments when asked
```

## Step 3: Deploy to Vercel

### Automatic Deployment (Recommended):
```bash
git push origin main
# Vercel will automatically deploy
```

### Manual Deployment:
```bash
vercel --prod
```

## Step 4: First Login

1. **Access your deployed site:**
   ```
   https://your-project.vercel.app/login
   ```

2. **Use default credentials:**
   - Email: `robertokizirian@gmail.com`
   - Password: `Betinho@2026`

3. **You'll be redirected to the admin dashboard**

## Step 5: Change Default Password (CRITICAL!)

⚠️ **SECURITY NOTICE:** Change the default password immediately!

1. In the admin dashboard, click **"Alterar Senha"**
2. Enter current password: `Betinho@2026`
3. Enter and confirm new password (minimum 8 characters)
4. Click **"Alterar Senha"** to save

## Step 6: Test the System

### Test Login:
- Navigate to `/login`
- Try logging in with new password
- Verify successful login and redirect

### Test Protected Routes:
- Navigate to `/` (should require authentication)
- If not logged in, should redirect to `/login`
- If logged in, should show main page

### Test Logout:
- Click logout button in dashboard
- Verify redirect to login page
- Try accessing `/admin` - should redirect to login

### Test Rate Limiting:
- Try 6 failed login attempts
- Should see rate limit message
- Wait 15 minutes or restart Vercel function

## Common Issues & Solutions

### Issue: "JWT_SECRET environment variable must be set for security"
**Solution:** Environment variable not configured. Follow Step 2.

### Issue: Password changes don't persist
**Cause:** In-memory storage resets on cold starts.
**Solution:** Implement Vercel KV for production:
```bash
# Create Vercel KV store
vercel kv create betinho-auth-store

# Link to your project
vercel link
```

### Issue: CORS errors
**Solution:** Current implementation doesn't use wildcard CORS. Ensure all requests come from same domain.

### Issue: Can't access after logout
**Solution:** Clear browser cookies:
- Chrome: Settings > Privacy > Clear browsing data > Cookies
- Firefox: Options > Privacy > Clear Data > Cookies

## 🐛 Troubleshooting - Login Issues

### Issue: Cannot login with default credentials

**Symptoms:**
- "Invalid email or password" error
- Login fails even with correct credentials

**Solution:**

1. **Test credentials first:**
   ```
   https://your-project.vercel.app/test-credentials
   ```
   
2. **Check the response:**
   - If `verifyPasswordResult: false` → System issue
   - If `verifyPasswordResult: true` → Login should work

3. **Check Vercel Function Logs:**
   ```
   Vercel Dashboard → Deployments → Latest → Function Logs
   ```
   Look for messages starting with `[AUTH]` and `[STORAGE]`

4. **Force clean deploy:**
   ```bash
   # In Vercel dashboard
   Deployments → ... → Redeploy
   ```

5. **After successful login, change password immediately!**


## Production Recommendations

### 1. Enable Vercel KV for Persistent Storage

**Why:** Current implementation uses in-memory storage. Password changes won't survive cold starts.

**How:**
```bash
# Install Vercel KV SDK
npm install @vercel/kv

# Update storage.js to use KV
# See: https://vercel.com/docs/storage/vercel-kv/quickstart
```

### 2. Set Up Monitoring

Enable Vercel Analytics and Logs:
- **Analytics:** Track authentication patterns
- **Logs:** Monitor failed login attempts
- **Alerts:** Set up notifications for suspicious activity

### 3. Configure Custom Domain

```bash
vercel domains add yourdomain.com
```

### 4. Enable Security Headers

Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 5. Backup Strategy

Since using in-memory storage:
- Document password securely
- Consider multi-factor authentication
- Implement Vercel KV before production use

## Security Checklist

- [x] JWT_SECRET is strong and randomly generated
- [x] Default password changed immediately
- [x] HTTPS enabled (automatic on Vercel)
- [x] HttpOnly cookies configured
- [x] Rate limiting active (5 attempts / 15 min)
- [ ] Vercel KV or persistent storage configured
- [ ] Monitoring and alerts set up
- [ ] Security headers configured
- [ ] Custom domain with SSL configured
- [ ] Regular security audits scheduled

## Support & Troubleshooting

### Logs
View deployment logs in Vercel dashboard:
```
Project > Deployments > [Latest] > View Function Logs
```

### Test Endpoints
```bash
# Test auth endpoint
curl https://your-project.vercel.app/api/auth?action=verify-session

# Test login (from same domain)
curl -X POST https://your-project.vercel.app/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"robertokizirian@gmail.com","password":"your-password"}'
```

### Reset System
If you need to reset (password lost, etc.):
1. Redeploy the application (triggers cold start)
2. Default password `Betinho@2026` will be active again
3. Change password immediately after login

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Security Best Practices](https://vercel.com/docs/security/secure-your-vercel-applications)

---

## Quick Reference

| Item | Value |
|------|-------|
| Login URL | `/login` |
| Admin Dashboard | `/admin` |
| Main Page | `/` |
| Default Email | `robertokizirian@gmail.com` |
| Default Password | `Betinho@2026` |
| Environment Variable | `JWT_SECRET` |
| Token Expiry | 24 hours |
| Rate Limit | 5 attempts / 15 min |

---

**Last Updated:** 2026-02-12  
**Version:** 1.0.0
