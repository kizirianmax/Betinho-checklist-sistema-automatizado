/**
 * User Registration API - Vercel Serverless Function
 * Handles new user registration
 * 
 * Endpoint:
 * - POST /api/register
 */

import { createUser, isUsernameTaken } from './lib/storage.js';
import { createToken } from './lib/auth-middleware.js';

/**
 * Validate email format
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate username format
 */
function isValidUsername(username) {
  // Alphanumeric, 3-20 characters
  const re = /^[a-zA-Z0-9_]{3,20}$/;
  return re.test(username);
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
  // At least 8 characters
  return password && password.length >= 8;
}

/**
 * Handle user registration
 */
async function handleRegister(request) {
  try {
    const body = await request.json();
    const { email, password, displayName, username } = body;
    
    // Validate required fields
    if (!email || !password || !displayName || !username) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'All fields are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email format'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate username format
    if (!isValidUsername(username)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate password strength
    if (!isValidPassword(password)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Password must be at least 8 characters'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check username availability
    const usernameTaken = await isUsernameTaken(username);
    if (usernameTaken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Username is already taken'
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create user
    try {
      const user = await createUser({
        email,
        password,
        displayName,
        username
      });
      
      // Create JWT token for auto-login
      const token = createToken({
        email: user.email,
        role: user.role,
        permissions: user.permissions
      });
      
      console.log('✅ [REGISTER] User registered successfully:', user.email);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account created successfully',
          user: {
            email: user.email,
            displayName: user.displayName,
            username: user.username,
            role: user.role
          },
          token
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`
          }
        }
      );
    } catch (error) {
      if (error.message === 'Email already registered') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Email is already registered'
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Check username availability
 */
async function handleCheckUsername(request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    
    if (!username) {
      return new Response(
        JSON.stringify({ available: false, error: 'Username is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!isValidUsername(username)) {
      return new Response(
        JSON.stringify({ available: false, error: 'Invalid username format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const taken = await isUsernameTaken(username);
    
    return new Response(
      JSON.stringify({ available: !taken }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[REGISTER] Error checking username:', error);
    return new Response(
      JSON.stringify({ available: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Main handler
 */
export default async function handler(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  const headers = {
    'Access-Control-Allow-Origin': url.origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
  
  // Route based on action
  if (action === 'check-username') {
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
    return handleCheckUsername(request);
  }
  
  // Default: registration
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
  
  return handleRegister(request);
}
