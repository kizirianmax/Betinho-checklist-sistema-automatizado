/**
 * Storage System for User Authentication
 * Handles user data persistence and password hashing
 * 
 * ⚠️ PRODUCTION WARNING:
 * This implementation uses in-memory storage which resets on serverless cold starts.
 * Password changes will NOT persist between function invocations.
 * 
 * For production use, implement one of:
 * - Vercel KV (recommended for Vercel deployments)
 * - Redis
 * - Database (PostgreSQL, MongoDB, etc.)
 * 
 * See: https://vercel.com/docs/storage/vercel-kv
 */

import crypto from 'crypto';

// In-memory storage (for serverless, consider using Vercel KV for production)
let userData = null;

/**
 * Initialize default owner account
 */
function initializeOwner() {
  const defaultPassword = 'Betinho@2026';
  
  // Fixed salt for default owner account
  // This ensures the password hash is always the same across cold starts
  // ⚠️ SECURITY NOTE: This is acceptable for the default account only.
  // When the user changes their password, a random salt will be generated.
  const salt = 'betinho2026fixedsaltfordefaultowner1234567890abcdef'; // 48 chars (hex format)
  
  const hash = crypto.pbkdf2Sync(defaultPassword, salt, 10000, 64, 'sha512').toString('hex');
  
  return {
    email: 'robertokizirian@gmail.com',
    passwordHash: hash,
    salt: salt,
    role: 'OWNER',
    createdAt: new Date().toISOString(),
    permissions: ['*'],
    lastLogin: null,
    passwordChangedAt: null
  };
}

/**
 * Get user data - initializes if not exists
 */
export function getUserData() {
  if (!userData) {
    console.log('🔐 [STORAGE] Initializing default owner account');
    userData = initializeOwner();
    console.log('✅ [STORAGE] Owner account initialized:', {
      email: userData.email,
      role: userData.role,
      hasPassword: !!userData.passwordHash,
      hasSalt: !!userData.salt
    });
  }
  return userData;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(email, password) {
  console.log('🔍 [STORAGE] Verifying password for:', email);
  
  const user = getUserData();
  
  if (user.email !== email) {
    console.log('❌ [STORAGE] Email does not match. Expected:', user.email);
    return false;
  }
  
  const hash = crypto.pbkdf2Sync(password, user.salt, 10000, 64, 'sha512').toString('hex');
  const isValid = hash === user.passwordHash;
  
  console.log(isValid ? '✅ [STORAGE] Password valid' : '❌ [STORAGE] Password invalid');
  
  return isValid;
}

/**
 * Change user password
 */
export function changePassword(email, currentPassword, newPassword) {
  const user = getUserData();
  
  if (user.email !== email) {
    throw new Error('User not found');
  }
  
  // Verify current password
  if (!verifyPassword(email, currentPassword)) {
    throw new Error('Current password is incorrect');
  }
  
  // Validate new password
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }
  
  // Generate new hash
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 64, 'sha512').toString('hex');
  
  // Update user data
  user.passwordHash = hash;
  user.salt = salt;
  user.passwordChangedAt = new Date().toISOString();
  
  return true;
}

/**
 * Update last login timestamp
 */
export function updateLastLogin(email) {
  const user = getUserData();
  if (user.email === email) {
    user.lastLogin = new Date().toISOString();
  }
}

/**
 * Get user by email (without password hash)
 */
export function getUserByEmail(email) {
  const user = getUserData();
  
  if (user.email !== email) {
    return null;
  }
  
  // Return user without sensitive data
  return {
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    passwordChangedAt: user.passwordChangedAt
  };
}
