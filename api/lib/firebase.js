/**
 * Firebase Admin SDK Initialization
 * 
 * Initializes Firebase Admin for Firestore access
 * Uses service account credentials from environment variables
 */

import admin from 'firebase-admin';

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Returns the initialized app instance
 */
export function initializeFirebase() {
  // Return existing instance if already initialized
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Get credentials from environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Validate required environment variables
    if (!projectId || !privateKey || !clientEmail) {
      throw new Error(
        'Missing Firebase credentials. Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL'
      );
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });

    console.log('🔥 [FIREBASE] Firebase Admin SDK initialized successfully');
    console.log('🔥 [FIREBASE] Project ID:', projectId);

    return firebaseApp;
  } catch (error) {
    console.error('🔥 [FIREBASE] Failed to initialize Firebase:', error.message);
    throw error;
  }
}

/**
 * Get Firestore instance
 */
export function getFirestore() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

/**
 * Get Firebase Auth instance
 */
export function getAuth() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}
