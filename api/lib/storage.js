/**
 * Storage System for User Authentication
 * Handles user data persistence and password hashing
 * For Vercel serverless deployment - uses in-memory storage with file fallback
 */

import crypto from 'crypto';

// In-memory storage (for serverless, consider using Vercel KV for production)
let userData = null;

/**
 * Initialize default owner account
 */
function initializeOwner() {
  const defaultPassword = 'Betinho@2026';
  const salt = crypto.randomBytes(16).toString('hex');
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
    userData = initializeOwner();
  }
  return userData;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(email, password) {
  const user = getUserData();
  
  if (user.email !== email) {
    return false;
  }
  
  const hash = crypto.pbkdf2Sync(password, user.salt, 10000, 64, 'sha512').toString('hex');
  return hash === user.passwordHash;
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
