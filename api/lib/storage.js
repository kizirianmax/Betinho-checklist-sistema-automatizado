/**
 * Storage System for User Authentication with Firebase Firestore
 * Handles user data persistence and password hashing
 * 
 * Uses Firebase Firestore for persistent storage across serverless cold starts.
 * All user data (including password hashes and salts) are stored in Firestore.
 * 
 * Collection: 'users'
 * Document ID: user email
 * 
 * See: https://firebase.google.com/docs/firestore
 */

import crypto from 'crypto';
import { getFirestore } from './firebase.js';

// Firestore collection name
const USERS_COLLECTION = 'users';

/**
 * Initialize default owner account in Firestore
 * Creates the default owner if it doesn't exist
 */
async function initializeOwner() {
  const defaultEmail = 'robertokizirian@gmail.com';
  const defaultPassword = 'Betinho@2026';
  
  try {
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(defaultEmail);
    const userDoc = await userRef.get();
    
    // If user already exists, return existing data
    if (userDoc.exists) {
      console.log('🔐 [STORAGE] Owner account already exists in Firestore');
      return userDoc.data();
    }
    
    // Create new owner account
    console.log('🔐 [STORAGE] Creating default OWNER account in Firestore');
    
    // Generate random salt for new account
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(defaultPassword, salt, 10000, 64, 'sha512').toString('hex');
    
    const userData = {
      email: defaultEmail,
      passwordHash: hash,
      salt: salt,
      role: 'OWNER',
      createdAt: new Date().toISOString(),
      permissions: ['*'],
      lastLogin: null,
      passwordChangedAt: null
    };
    
    // Save to Firestore
    await userRef.set(userData);
    console.log('✅ [STORAGE] Owner account created successfully in Firestore');
    
    return userData;
  } catch (error) {
    console.error('❌ [STORAGE] Error initializing owner:', error);
    throw error;
  }
}

/**
 * Get user data from Firestore
 */
export async function getUserData(email = 'robertokizirian@gmail.com') {
  try {
    console.log('🔍 [STORAGE] Fetching user data from Firestore for:', email);
    
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(email);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // If owner doesn't exist, initialize it
      if (email === 'robertokizirian@gmail.com') {
        console.log('🔄 [STORAGE] Owner not found - initializing...');
        return await initializeOwner();
      }
      return null;
    }
    
    console.log('✅ [STORAGE] User data retrieved from Firestore');
    return userDoc.data();
  } catch (error) {
    console.error('❌ [STORAGE] Error getting user data:', error);
    throw error;
  }
}

/**
 * Verify password against stored hash in Firestore
 */
export async function verifyPassword(email, password) {
  try {
    console.log('🔍 [STORAGE] Verifying password for email:', email);
    console.log('🔥 [STORAGE] Fetching credentials from Firebase...');
    
    const user = await getUserData(email);
    
    if (!user) {
      console.log('❌ [STORAGE] User not found in Firestore');
      return false;
    }
    
    if (user.email !== email) {
      console.log('❌ [STORAGE] Email mismatch. Expected:', user.email, 'Got:', email);
      return false;
    }
    
    console.log('🔐 [STORAGE] Computing password hash with stored salt from Firestore...');
    const hash = crypto.pbkdf2Sync(password, user.salt, 10000, 64, 'sha512').toString('hex');
    const isValid = hash === user.passwordHash;
    
    if (isValid) {
      console.log('✅ [STORAGE] Password verification SUCCESSFUL via Firebase');
    } else {
      console.log('❌ [STORAGE] Password verification FAILED via Firebase - hash mismatch');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ [STORAGE] Error verifying password:', error);
    return false;
  }
}

/**
 * Change user password and update in Firestore
 */
export async function changePassword(email, currentPassword, newPassword) {
  try {
    const user = await getUserData(email);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isValid = await verifyPassword(email, currentPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    
    console.log('🔐 [STORAGE] Generating new password hash with random salt...');
    
    // Generate new random salt and hash
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 64, 'sha512').toString('hex');
    
    // Update in Firestore
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(email);
    
    await userRef.update({
      passwordHash: hash,
      salt: salt,
      passwordChangedAt: new Date().toISOString()
    });
    
    console.log('✅ [STORAGE] Password updated successfully in Firestore');
    console.log('🔑 [STORAGE] New random salt generated for security');
    
    return true;
  } catch (error) {
    console.error('❌ [STORAGE] Error changing password:', error);
    throw error;
  }
}

/**
 * Update last login timestamp in Firestore
 */
export async function updateLastLogin(email) {
  try {
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(email);
    
    await userRef.update({
      lastLogin: new Date().toISOString()
    });
    
    console.log('✅ [STORAGE] Last login updated in Firestore');
  } catch (error) {
    console.error('❌ [STORAGE] Error updating last login:', error);
    // Don't throw, just log - this is not critical
  }
}

/**
 * Get user by email (without password hash)
 */
export async function getUserByEmail(email) {
  try {
    const user = await getUserData(email);
    
    if (!user) {
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
  } catch (error) {
    console.error('❌ [STORAGE] Error getting user by email:', error);
    return null;
  }
}
