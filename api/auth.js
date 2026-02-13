/**
 * Authentication API - Vercel Serverless Function
 * Handles login, logout, password change, and session verification
 * 
 * Endpoints:
 * - POST /api/auth?action=login
 * - POST /api/auth?action=logout
 * - POST /api/auth?action=change-password
 * - GET /api/auth?action=verify-session
 */

import { verifyPassword, changePassword, updateLastLogin, getUserByEmail, getUserByUsername } from './lib/storage.js';
import { createToken, verifyToken, extractToken } from './lib/auth-middleware.js';

// Rate limiting storage
// ⚠️ PRODUCTION WARNING: In-memory storage resets on cold starts.
// For production, use Vercel KV, Redis, or similar persistent storage.
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Check rate limiting for login attempts
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }
  
  // Remove old attempts
  const recentAttempts = attempts.filter(time => now - time < LOCKOUT_TIME);
  loginAttempts.set(ip, recentAttempts);
  
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    const oldestAttempt = Math.min(...recentAttempts);
    const timeRemaining = Math.ceil((LOCKOUT_TIME - (now - oldestAttempt)) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: timeRemaining
    };
  }
  
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - recentAttempts.length
  };
}

/**
 * Record login attempt
 */
function recordLoginAttempt(ip) {
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(Date.now());
  loginAttempts.set(ip, attempts);
}

/**
 * Clear login attempts on successful login
 */
function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * Handle login request
 */
async function handleLogin(request, ip) {
  console.log('🚪 [AUTH] ========== LOGIN ATTEMPT ==========');
  console.log('🌐 [AUTH] IP Address:', ip);
  console.log('⏰ [AUTH] Timestamp:', new Date().toISOString());
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log('📧 [AUTH] Email/Username provided:', email);
    
    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email/Username and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimit.retryAfter.toString()
          }
        }
      );
    }
    
    // Determine if input is email or username
    let actualEmail = email;
    if (!email.includes('@')) {
      // It's a username, look up the email
      console.log('🔍 [AUTH] Looking up username:', email);
      const userByUsername = await getUserByUsername(email);
      if (userByUsername) {
        actualEmail = userByUsername.email;
        console.log('✅ [AUTH] Found email for username:', actualEmail);
      } else {
        console.log('❌ [AUTH] Username not found');
        recordLoginAttempt(ip);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid email/username or password',
            attemptsRemaining: checkRateLimit(ip).remaining
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Verify credentials
    console.log('🔐 [AUTH] Starting credential verification via Firebase...');
    const isValid = await verifyPassword(actualEmail, password);
    console.log('🎯 [AUTH] Verification result:', isValid);
    
    if (!isValid) {
      console.log('❌ [AUTH] Invalid credentials from Firebase');
      recordLoginAttempt(ip);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email/username or password',
          attemptsRemaining: checkRateLimit(ip).remaining
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user data
    const user = await getUserByEmail(actualEmail);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user is banned
    if (user.active === false) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account has been suspended' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Clear failed attempts
    clearLoginAttempts(ip);
    
    // Update last login
    await updateLastLogin(actualEmail);
    
    console.log('✅ [AUTH] Login SUCCESSFUL for:', user.email);
    console.log('🎫 [AUTH] Generating JWT token...');
    console.log('🔥 [AUTH] All data persisted in Firebase');
    
    // Create JWT token
    const token = createToken({
      email: user.email,
      role: user.role,
      permissions: user.permissions
    });
    
    // Set cookie and return response
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin
        },
        token
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`
        }
      }
    );
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    console.error('[AUTH] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle logout request
 */
async function handleLogout(request) {
  return new Response(
    JSON.stringify({ success: true, message: 'Logged out successfully' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
      }
    }
  );
}

/**
 * Handle password change request
 */
async function handleChangePassword(request) {
  try {
    // Verify authentication
    const token = extractToken(request);
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Current and new password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Change password
    try {
      await changePassword(payload.email, currentPassword, newPassword);
      
      console.log('✅ [AUTH] Password changed successfully and persisted to Firebase');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password changed successfully'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('❌ [AUTH] Password change failed:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Change password error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle session verification request
 */
async function handleVerifySession(request) {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, authenticated: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      return new Response(
        JSON.stringify({ success: false, authenticated: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get fresh user data
    const user = await getUserByEmail(payload.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        authenticated: true,
        user: {
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
          passwordChangedAt: user.passwordChangedAt
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify session error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Main handler for Vercel serverless function
 */
export default async function handler(request) {
  // Set CORS headers with origin validation
  const requestOrigin = request.headers.get('origin');
  const url = new URL(request.url);
  const isSameOrigin = requestOrigin && new URL(requestOrigin).origin === url.origin;
  
  const headers = {
    'Access-Control-Allow-Origin': isSameOrigin ? requestOrigin : url.origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
  
  // Get action from query parameter
  const action = url.searchParams.get('action');
  
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  // Route to appropriate handler
  switch (action) {
    case 'login':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleLogin(request, ip);
      
    case 'logout':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleLogout(request);
      
    case 'change-password':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleChangePassword(request);
      
    case 'verify-session':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleVerifySession(request);
      
    default:
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action parameter' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
  }
}
