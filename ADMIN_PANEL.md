# Admin Panel Documentation

## Overview

The Admin Panel is a comprehensive management dashboard exclusively for users with the **OWNER** role. It provides complete control over the platform with user management, analytics, follow relationships, and system configuration.

## Access

- **URL:** `/admin-panel.html`
- **Required Role:** OWNER
- **Authentication:** JWT token (auto-redirects if not authenticated or not OWNER)

## Features

### 1. User Management Tab

Complete user management capabilities:

- **User List:** View all registered users with comprehensive information
  - Display name, email, username
  - Role and status badges
  - Followers/following counts
  - Creation date
  - Last login information

- **Search & Filter:** Real-time search by name, email, or username

- **User Actions:**
  - 👁️ **View Details:** See complete user profile with activity
  - 🔑 **Reset Password:** Generate new password for user
  - 🚫 **Ban/Unban:** Temporarily disable user accounts
  - 🗑️ **Delete:** Permanently remove user account (with double confirmation)

- **Protections:**
  - Cannot delete or ban the OWNER account (self-protection)
  - Confirmation dialogs for all destructive actions

### 2. Analytics Dashboard Tab

Real-time platform statistics and insights:

- **KPI Cards:**
  - Total Users: All registered accounts
  - Active Users: Users who logged in within last 7 days
  - New Users This Week: Registrations in last 7 days
  - Total Follows: All follow relationships

- **Top Users:** List of 10 most followed users

- **Recent Registrations:** Last 10 users who joined the platform

- **Growth Metrics:** Platform expansion tracking

### 3. Follow Management Tab

Manage follow relationships:

- **Follow List:** View all follow relationships
  - Follower → Following display
  - Creation date
  - Quick delete action

- **Search:** Filter by follower or following email

- **Delete Follow:** Remove follow relationships with confirmation

- **Statistics:** Total follows, average per user

### 4. System Configuration Tab

Platform settings and information:

- **Settings Form:**
  - Platform name
  - Platform description
  - Max upload size (MB)
  - Maintenance mode toggle

- **System Information:**
  - API version
  - Database type (Firebase Firestore)
  - Hosting provider (Vercel)
  - Authentication method (JWT)

## API Endpoints

All admin endpoints require OWNER role authentication:

### GET /api/admin?action=users
Returns list of all users with statistics.

**Response:**
```json
{
  "success": true,
  "users": [...],
  "count": 123
}
```

### POST /api/admin?action=delete-user
Delete a user account.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Protections:**
- Cannot delete own account
- Permanent deletion (no undo)

### POST /api/admin?action=ban-user
Ban or unban a user.

**Request:**
```json
{
  "email": "user@example.com",
  "active": false
}
```

**Protections:**
- Cannot ban own account
- Reversible action (can unban)

### POST /api/admin?action=reset-password
Reset a user's password.

**Request:**
```json
{
  "email": "user@example.com",
  "newPassword": "NewPassword123"
}
```

**Requirements:**
- Minimum 8 characters
- Generates new salt automatically

### GET /api/admin?action=analytics
Get platform analytics and statistics.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalUsers": 123,
    "activeUsers": 45,
    "newUsersThisWeek": 12,
    "totalFollows": 234,
    "topUsers": [...],
    "recentUsers": [...]
  }
}
```

### GET /api/admin?action=follows
Get all follow relationships.

**Response:**
```json
{
  "success": true,
  "follows": [...],
  "count": 234
}
```

### POST /api/admin?action=delete-follow
Delete a follow relationship.

**Request:**
```json
{
  "followerId": "follower@example.com",
  "followingId": "following@example.com"
}
```

**Effects:**
- Removes follow relationship
- Decrements follower/following counts
- Atomic operation

## Security Features

1. **Role-Based Access:**
   - Frontend checks user role before rendering
   - Backend verifies OWNER role on every request
   - Auto-redirect to login if not authenticated

2. **Self-Protection:**
   - OWNER cannot delete own account
   - OWNER cannot ban own account
   - Prevents accidental lockout

3. **Confirmation Dialogs:**
   - Double confirmation for user deletion
   - Single confirmation for ban/unban
   - Clear warning messages

4. **Audit Logging:**
   - All admin actions logged to console
   - Includes actor email and timestamp
   - Useful for security review

## UI Features

- **Responsive Design:** Works on desktop, tablet, and mobile
- **Loading States:** Visual feedback during API calls
- **Toast Notifications:** Success/error messages
- **Empty States:** Helpful messages when no data
- **Search/Filter:** Real-time filtering without API calls
- **Modal Dialogs:** Clean user detail views
- **Consistent Theme:** Matches site-wide purple gradient

## Usage Tips

1. **Regular Monitoring:**
   - Check analytics daily for unusual activity
   - Review new users weekly
   - Monitor top users for engagement

2. **User Management:**
   - Use ban instead of delete for temporary issues
   - Document reason for bans (external system)
   - Reset passwords only when requested

3. **Follow Management:**
   - Clean up fake follow relationships
   - Monitor for bot activity
   - Check for unusual follow patterns

4. **System Configuration:**
   - Keep platform description updated
   - Adjust upload limits based on usage
   - Use maintenance mode for updates

## Troubleshooting

**Cannot access admin panel:**
- Verify you're logged in
- Check your role is OWNER
- Clear browser cookies and re-login

**403 Forbidden errors:**
- Only OWNER role can access
- Check JWT token is valid
- Verify token includes role claim

**Users not loading:**
- Check Firebase Firestore connection
- Verify environment variables
- Check browser console for errors

**Actions not working:**
- Check network tab for API errors
- Verify request format
- Check server logs

## Future Enhancements

Potential improvements for future versions:

- [ ] Bulk user operations
- [ ] Export data to CSV
- [ ] Advanced analytics charts
- [ ] Email notification system
- [ ] Activity audit trail
- [ ] Role management (add more roles)
- [ ] Settings persistence to Firestore
- [ ] User impersonation for support
- [ ] Scheduled maintenance mode
- [ ] Real-time updates with websockets

## Support

For issues or questions:
1. Check server logs in Vercel dashboard
2. Review Firebase Firestore data
3. Check browser console for errors
4. Contact system administrator

---

**Last Updated:** February 2026  
**Version:** 1.0.0  
**Author:** Roberto Kizirian
