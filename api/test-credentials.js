/**
 * Test Credentials Endpoint
 * For debugging authentication issues
 * 
 * ⚠️ SECURITY: This endpoint is DISABLED in production environments.
 * Only available when NODE_ENV !== 'production'
 * 
 * Usage: GET /api/test-credentials
 */

import { getUserData, verifyPassword } from './lib/storage.js';
import crypto from 'crypto';

export default async function handler(request) {
  // Disable endpoint in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'This endpoint is disabled in production for security reasons'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get user data
    const user = getUserData();
    
    // Test password verification
    const testEmail = 'robertokizirian@gmail.com';
    const testPassword = 'Betinho@2026';
    const isValid = verifyPassword(testEmail, testPassword);
    
    // Generate hash for comparison
    const testHash = crypto.pbkdf2Sync(testPassword, user.salt, 10000, 64, 'sha512').toString('hex');
    
    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          userEmail: user.email,
          saltLength: user.salt.length,
          saltPreview: user.salt.substring(0, 20) + '...',
          passwordHashMatches: testHash === user.passwordHash,
          verifyPasswordResult: isValid,
          expectedEmail: testEmail,
          expectedPassword: '***' // Don't expose password in response
        },
        message: isValid 
          ? '✅ Credentials are working correctly!' 
          : '❌ Credentials verification failed - check logs'
      }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
