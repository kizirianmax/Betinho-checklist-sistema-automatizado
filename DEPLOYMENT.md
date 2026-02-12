# 🚀 Deployment Guide - Betinho Authentication System with Firebase

## Prerequisites

- Vercel account
- GitHub repository connected to Vercel
- Firebase project (free tier is sufficient)
- Access to repository settings

## Step 1: Configure Firebase Project

### Create Firebase Project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** or select existing project
3. Follow the setup wizard (Analytics is optional)
4. Once created, go to **Project Settings** (gear icon)

### Generate Service Account Key:

1. In Project Settings, go to **Service Accounts** tab
2. Click **Generate New Private Key**
3. Download the JSON file
4. **Keep this file secure!** It contains sensitive credentials

The JSON file will look like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com",
  ...
}
```

### Enable Firestore Database:

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **Production mode** (you can set rules later)
4. Select a location (choose one close to your users)
5. Click **Enable**

## Step 2: Generate JWT Secret

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

## Step 3: Configure Vercel Environment Variables

### Via Vercel Dashboard:

1. Go to your project in Vercel
2. Navigate to **Settings** > **Environment Variables**
3. Add these variables (one by one):

   **JWT_SECRET**
   - **Value:** [paste your generated JWT secret]
   - **Environments:** Production, Preview, Development (select all)

   **FIREBASE_PROJECT_ID**
   - **Value:** [from Firebase JSON: `project_id`]
   - **Environments:** Production, Preview, Development (select all)

   **FIREBASE_PRIVATE_KEY**
   - **Value:** [from Firebase JSON: `private_key`]
   - **Important:** Copy the entire private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - **Environments:** Production, Preview, Development (select all)

   **FIREBASE_CLIENT_EMAIL**
   - **Value:** [from Firebase JSON: `client_email`]
   - **Environments:** Production, Preview, Development (select all)

4. Click **Save** for each variable

### Via Vercel CLI:

```bash
# JWT Secret
vercel env add JWT_SECRET
# Paste your generated secret when prompted

# Firebase Project ID
vercel env add FIREBASE_PROJECT_ID
# Paste your Firebase project ID

# Firebase Private Key
vercel env add FIREBASE_PRIVATE_KEY
# Paste the entire private key (with \n preserved)

# Firebase Client Email
vercel env add FIREBASE_CLIENT_EMAIL
# Paste the service account email
```

## Step 4: Deploy to Vercel

### Automatic Deployment (Recommended):
```bash
git push origin main
# Vercel will automatically deploy
```

### Manual Deployment:
```bash
vercel --prod
```

## Step 5: First Login

1. **Access your deployed site:**
   ```
   https://your-project.vercel.app/login
   ```

2. **Use default credentials:**
   - Email: `robertokizirian@gmail.com`
   - Password: `Betinho@2026`

3. **You'll be redirected to the admin dashboard**

4. **Check Firestore:**
   - Go to Firebase Console > Firestore Database
   - You should see a `users` collection with the owner's document
   - The document contains the hashed password and salt

## Step 6: Change Default Password (CRITICAL!)

⚠️ **SECURITY NOTICE:** Change the default password immediately!

1. In the admin dashboard, click **"Alterar Senha"**
2. Enter current password: `Betinho@2026`
3. Enter and confirm new password (minimum 8 characters)
4. Click **"Alterar Senha"** to save
5. **Verify in Firestore:** The password hash and salt should be updated

## Step 7: Test the System

### Test Login:
- Navigate to `/login`
- Try logging in with new password
- Verify successful login and redirect

### Test Cold Start Persistence:
- Wait 5-10 minutes (Vercel function cold start)
- Try logging in again with your **new** password
- **Should work!** Password is persisted in Firebase

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

### Issue: "Missing Firebase credentials"
**Solution:** Firebase environment variables not configured. Follow Step 3.

### Issue: "Failed to initialize Firebase"
**Solution:** 
1. Check that `FIREBASE_PRIVATE_KEY` includes the full key with `-----BEGIN/END PRIVATE KEY-----`
2. Ensure the private key has `\n` characters preserved (not actual newlines)
3. Verify all three Firebase variables are set in Vercel

### Issue: "JWT_SECRET environment variable must be set for security"
**Solution:** JWT_SECRET not configured. Follow Step 3.

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
   - If `verifyPasswordResult: false` → Check Firebase logs
   - If `verifyPasswordResult: true` → Login should work

3. **Check Vercel Function Logs:**
   ```
   Vercel Dashboard → Deployments → Latest → Function Logs
   ```
   Look for messages starting with `[AUTH]`, `[STORAGE]`, and `[FIREBASE]`

4. **Check Firebase Console:**
   - Verify Firestore Database is enabled
   - Check if `users` collection exists
   - Verify the owner document exists

5. **Force clean deploy:**
   ```bash
   # In Vercel dashboard
   Deployments → ... → Redeploy
   ```

6. **After successful login, change password immediately!**


## Production Recommendations

### 1. Configure Firestore Security Rules

Protect your data with proper security rules:

```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - authenticated users can only read their own data
    match /users/{email} {
      allow read: if request.auth != null && request.auth.token.email == email;
      allow write: if false; // Write operations handled by server-side only
    }
  }
}
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
