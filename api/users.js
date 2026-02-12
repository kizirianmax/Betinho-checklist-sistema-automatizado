/**
 * User Profile API - Vercel Serverless Function
 * Handles user profile operations
 * 
 * Endpoints:
 * - GET /api/users?action=get&email=...
 * - GET /api/users?action=get&username=...
 * - GET /api/users?action=list
 * - POST /api/users?action=update
 */

import { getUserByEmail, getUserByUsername, updateUserProfile, getAllUsers } from './lib/storage.js';
import { verifyToken, extractToken } from './lib/auth-middleware.js';

/**
 * Get user profile
 */
async function handleGetUser(request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const username = url.searchParams.get('username');
    
    let user = null;
    
    if (email) {
      user = await getUserByEmail(email);
    } else if (username) {
      user = await getUserByUsername(username);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Email or username required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, user }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[USERS] Error getting user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * List all users
 */
async function handleListUsers(request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    const users = await getAllUsers(limit);
    
    return new Response(
      JSON.stringify({ success: true, users, count: users.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[USERS] Error listing users:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Update user profile
 */
async function handleUpdateUser(request) {
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
    const { displayName, bio, photoURL } = body;
    
    // Update profile
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (photoURL !== undefined) updates.photoURL = photoURL;
    
    const user = await updateUserProfile(payload.email, updates);
    
    return new Response(
      JSON.stringify({ success: true, user }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[USERS] Error updating user:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
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
  switch (action) {
    case 'get':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleGetUser(request);
      
    case 'list':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleListUsers(request);
      
    case 'update':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleUpdateUser(request);
      
    default:
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
  }
}
