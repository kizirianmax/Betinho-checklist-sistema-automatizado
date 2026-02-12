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
    
    // Generate random salt for new account (32 bytes = 64 hex characters)
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(defaultPassword, salt, 10000, 64, 'sha512').toString('hex');
    
    const userData = {
      email: defaultEmail,
      passwordHash: hash,
      salt: salt,
      role: 'OWNER',
      displayName: 'Roberto Kizirian Max',
      username: 'robertomax',
      photoURL: null,
      bio: '',
      followers: 0,
      following: 0,
      verified: true,
      active: true,
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
    
    // Generate new random salt and hash (32 bytes = 64 hex characters for better security)
    const salt = crypto.randomBytes(32).toString('hex');
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
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      verified: user.verified,
      active: user.active,
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

/**
 * Create a new user
 */
export async function createUser(userData) {
  try {
    const { email, password, displayName, username } = userData;
    
    // Validate required fields
    if (!email || !password || !displayName || !username) {
      throw new Error('Missing required fields');
    }
    
    // Check if email already exists
    const existingUser = await getUserData(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }
    
    // Check if username already exists
    const usernameExists = await isUsernameTaken(username);
    if (usernameExists) {
      throw new Error('Username already taken');
    }
    
    // Generate salt and hash password
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    const newUser = {
      email,
      passwordHash: hash,
      salt,
      role: 'user',
      displayName,
      username: username.toLowerCase(),
      photoURL: null,
      bio: '',
      followers: 0,
      following: 0,
      verified: false,
      active: true,
      createdAt: new Date().toISOString(),
      permissions: ['read', 'write'],
      lastLogin: null,
      passwordChangedAt: null
    };
    
    const db = getFirestore();
    await db.collection(USERS_COLLECTION).doc(email).set(newUser);
    
    console.log('✅ [STORAGE] New user created:', email);
    return getUserByEmail(email);
  } catch (error) {
    console.error('❌ [STORAGE] Error creating user:', error);
    throw error;
  }
}

/**
 * Check if username is taken
 */
export async function isUsernameTaken(username) {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(USERS_COLLECTION)
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('❌ [STORAGE] Error checking username:', error);
    return false;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username) {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(USERS_COLLECTION)
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const user = snapshot.docs[0].data();
    return getUserByEmail(user.email);
  } catch (error) {
    console.error('❌ [STORAGE] Error getting user by username:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(email, updates) {
  try {
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(email);
    
    // Only allow updating certain fields
    const allowedFields = ['displayName', 'bio', 'photoURL'];
    const filteredUpdates = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }
    
    await userRef.update(filteredUpdates);
    console.log('✅ [STORAGE] User profile updated:', email);
    
    return getUserByEmail(email);
  } catch (error) {
    console.error('❌ [STORAGE] Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get all users (for admin)
 */
export async function getAllUsers(limit = 100, startAfter = null) {
  try {
    const db = getFirestore();
    let query = db.collection(USERS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    const snapshot = await query.get();
    const users = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      users.push({
        email: data.email,
        role: data.role,
        displayName: data.displayName,
        username: data.username,
        photoURL: data.photoURL,
        bio: data.bio,
        followers: data.followers,
        following: data.following,
        verified: data.verified,
        active: data.active,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin
      });
    }
    
    return users;
  } catch (error) {
    console.error('❌ [STORAGE] Error getting all users:', error);
    throw error;
  }
}
