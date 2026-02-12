/**
 * Test Credentials Endpoint - FOR DEBUGGING ONLY
 * 
 * This endpoint tests if the default credentials are working with Firebase
 * ⚠️ DELETE THIS FILE AFTER TESTING IN PRODUCTION!
 * 
 * Usage: GET /api/test-credentials
 */

import { getUserData, verifyPassword } from './lib/storage.js';
import crypto from 'crypto';

export default async function handler(request) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('🧪 [TEST] Running credentials test with Firebase...');
    
    // Get user data from Firebase
    const user = await getUserData('robertokizirian@gmail.com');
    
    // Test credentials
    const testEmail = 'robertokizirian@gmail.com';
    const testPassword = 'Betinho@2026';
    
    console.log('🧪 [TEST] Testing email:', testEmail);
    console.log('🧪 [TEST] Testing password:', testPassword);
    
    // Verify using the actual verification function
    const isValid = await verifyPassword(testEmail, testPassword);
    
    // Generate test hash for comparison
    const testHash = crypto.pbkdf2Sync(testPassword, user.salt, 10000, 64, 'sha512').toString('hex');
    const hashMatches = testHash === user.passwordHash;
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      storage: 'Firebase Firestore',
      credentials: {
        expectedEmail: testEmail,
        expectedPassword: testPassword
      },
      userInfo: {
        email: user.email,
        role: user.role,
        emailMatches: user.email === testEmail,
        lastLogin: user.lastLogin,
        passwordChangedAt: user.passwordChangedAt
      },
      verification: {
        verifyPasswordResult: isValid,
        hashComputedCorrectly: hashMatches,
        saltLength: user.salt.length,
        saltPreview: user.salt.substring(0, 30) + '...'
      },
      status: isValid 
        ? '✅ CREDENTIALS WORKING - Login should succeed via Firebase!' 
        : '❌ CREDENTIALS NOT WORKING - Check Firebase logs for details'
    };
    
    console.log('🧪 [TEST] Result:', result.status);
    
    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
  } catch (error) {
    console.error('🧪 [TEST] Error during test:', error);
    console.error('🧪 [TEST] Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hint: 'Check if Firebase environment variables are set correctly',
        status: '❌ TEST FAILED - See server logs for details'
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
