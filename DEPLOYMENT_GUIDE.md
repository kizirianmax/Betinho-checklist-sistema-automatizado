# 🚀 Production Deployment Guide

## Overview
This guide will help you deploy the Betinho social network to production on Vercel with Firebase backend.

## Prerequisites

- Node.js 18+ installed
- Vercel account (free tier works)
- Firebase project set up
- Firebase Service Account credentials

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Firestore Database**
4. Enable **Firebase Storage**
5. Enable **Firebase Authentication** (optional, for future features)

### 1.2 Generate Service Account Key
1. Go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file securely (never commit to git!)

### 1.3 Deploy Security Rules

#### Firestore Rules
1. Go to Firestore → Rules
2. Copy content from `firestore.rules` in this repository
3. Click "Publish"

#### Storage Rules
1. Go to Storage → Rules
2. Copy content from `storage.rules` in this repository
3. Click "Publish"

### 1.4 Create Storage Bucket
1. Go to Storage in Firebase Console
2. Click "Get Started"
3. Choose production mode
4. Select a location close to your users
5. Bucket will be created as `your-project-id.appspot.com`

## Step 2: Environment Variables

### 2.1 Extract Firebase Credentials
From your service account JSON file, you need:
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY`
- `client_email` → `FIREBASE_CLIENT_EMAIL`

### 2.2 Set Variables in Vercel
1. Go to your Vercel project → Settings → Environment Variables
2. Add the following:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your key...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Important:** 
- The private key must include `\n` for newlines
- Keep quotes around the private key
- Never commit these to version control

## Step 3: Deploy to Vercel

### 3.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 3.2 Login to Vercel
```bash
vercel login
```

### 3.3 Deploy
```bash
# Production deployment
vercel --prod
```

The deployment will:
1. Install dependencies (firebase-admin, sharp, busboy)
2. Build serverless functions
3. Deploy static files
4. Configure routes from vercel.json

## Step 4: Initial Setup

### 4.1 First Login
1. Visit your deployed URL
2. Login with default OWNER credentials:
   - Email: `robertokizirian@gmail.com`
   - Password: `Betinho@2026`

### 4.2 Change Default Password
1. Go to Admin Dashboard
2. Click "Change Password"
3. Set a secure new password

### 4.3 Update Owner Profile
1. Go to your profile
2. Upload a profile photo
3. Update your bio
4. Verify all information is correct

## Step 5: Post-Deployment Checklist

- [ ] Verify authentication works (login/logout)
- [ ] Test user registration (/signup)
- [ ] Upload profile photo (test Firebase Storage)
- [ ] Create test user and test follow/unfollow
- [ ] Access admin panel (/admin-panel)
- [ ] Check analytics dashboard
- [ ] Test on mobile device
- [ ] Verify all routes work
- [ ] Check console for errors
- [ ] Test error states (network offline, etc.)

## Step 6: Firebase Indexes (If Needed)

If you see Firestore index errors in logs:
1. Click the error link in Firebase Console
2. It will auto-generate the required index
3. Wait 1-2 minutes for index to build
4. Try the operation again

Common indexes you might need:
- `follows` collection: composite index on `followerId` and `createdAt`
- `follows` collection: composite index on `followingId` and `createdAt`
- `users` collection: composite index on `username` and `createdAt`

## Step 7: Domain Setup (Optional)

### 7.1 Add Custom Domain
1. Go to Vercel Project → Settings → Domains
2. Add your domain
3. Update DNS records as instructed by Vercel
4. Wait for SSL certificate provisioning (automatic)

### 7.2 Update Firebase Authorized Domains
1. Go to Firebase Console → Authentication → Settings
2. Add your custom domain to "Authorized domains"

## Monitoring & Maintenance

### Check Logs
```bash
# Vercel logs
vercel logs your-project-name --follow

# Firebase logs
# View in Firebase Console → Firestore → Usage tab
```

### Monitor Usage
1. **Vercel:** Settings → Usage (functions, bandwidth, builds)
2. **Firebase:** Console home → Usage metrics (reads, writes, storage)

### Backup Firestore Data
```bash
# Using Firebase CLI
firebase firestore:export gs://your-bucket/backups/$(date +%Y-%m-%d)
```

## Troubleshooting

### Issue: "Firebase not initialized"
- **Solution:** Check environment variables in Vercel are set correctly
- Redeploy after updating environment variables

### Issue: "Photo upload fails"
- **Solution:** 
  1. Verify Firebase Storage is enabled
  2. Check storage.rules are deployed
  3. Verify bucket exists in Firebase Console
  4. Check file size < 10MB

### Issue: "Permission denied" in Firestore
- **Solution:**
  1. Verify firestore.rules are deployed
  2. Check user is authenticated
  3. Verify user role is correct

### Issue: "Cold start slow"
- **Expected:** First request after idle may take 2-3 seconds
- Vercel free tier has cold starts
- Consider Vercel Pro for instant warm starts

### Issue: "Rate limit exceeded"
- **Solution:** Implement caching or upgrade Firebase plan
- Free tier: 50k reads/day, 20k writes/day

## Security Best Practices

1. **Never commit credentials** to git
2. **Use environment variables** for all secrets
3. **Enable 2FA** on Vercel and Firebase accounts
4. **Monitor logs** for suspicious activity
5. **Keep dependencies updated** regularly
6. **Review Firebase rules** periodically
7. **Backup data** regularly
8. **Use HTTPS** always (Vercel provides this)

## Performance Optimization

1. **Enable caching** in Firestore queries
2. **Use pagination** for large lists
3. **Optimize images** before upload (done automatically)
4. **Minimize API calls** with data caching
5. **Use Firestore indexes** for complex queries

## Scaling Considerations

### When to upgrade Firebase plan:
- More than 50k document reads/day
- More than 20k document writes/day
- More than 5GB storage
- Need more bandwidth

### When to upgrade Vercel plan:
- Need faster cold starts
- More than 100GB bandwidth/month
- Need analytics features
- Need more build minutes

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Pricing](https://firebase.google.com/pricing)
- [Vercel Pricing](https://vercel.com/pricing)

## Success Criteria

Your deployment is successful when:
- ✅ OWNER can login and access admin panel
- ✅ New users can register via /signup
- ✅ Users can upload profile photos
- ✅ Follow/unfollow functionality works
- ✅ Analytics dashboard shows real data
- ✅ All pages are mobile-responsive
- ✅ No console errors on any page
- ✅ HTTPS works correctly
- ✅ Firebase rules are active

## Next Steps After Deployment

1. Invite beta users to test
2. Monitor analytics for user behavior
3. Gather feedback and iterate
4. Plan additional features
5. Set up monitoring alerts
6. Create backup schedule
7. Document any custom configurations
8. Prepare for Play Store submission (if mobile app)

---

**Need help?** Check the repository README.md for API documentation and feature details.
