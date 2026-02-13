/**
 * Admin API - Vercel Serverless Function
 * Comprehensive admin panel endpoints for OWNER role only
 * 
 * Endpoints:
 * - GET /api/admin?action=users (list all users with stats)
 * - POST /api/admin?action=delete-user (delete user account)
 * - POST /api/admin?action=ban-user (ban/unban user)
 * - POST /api/admin?action=reset-password (reset user password)
 * - GET /api/admin?action=analytics (get platform analytics)
 * - GET /api/admin?action=follows (get all follow relationships)
 * - POST /api/admin?action=delete-follow (delete follow relationship)
 */

import { verifyToken, extractToken } from './lib/auth-middleware.js';
import {
  getAllUsers,
  deleteUser,
  updateUserStatus,
  resetUserPassword,
  getAnalytics,
  getAllFollows,
  deleteFollow
} from './lib/storage.js';

/**
 * Verify OWNER role
 */
function requireOwner(request) {
  const token = extractToken(request);
  
  if (!token) {
    return {
      authorized: false,
      error: 'Not authenticated'
    };
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return {
      authorized: false,
      error: 'Invalid or expired session'
    };
  }
  
  if (payload.role !== 'OWNER') {
    return {
      authorized: false,
      error: 'Access denied. OWNER role required.'
    };
  }
  
  return {
    authorized: true,
    user: payload
  };
}

/**
 * Handle GET users list
 */
async function handleGetUsers(request) {
  try {
    const authResult = requireOwner(request);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error === 'Not authenticated' ? 401 : 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const users = await getAllUsers(1000); // Get up to 1000 users
    
    console.log('[ADMIN] Users list retrieved by:', authResult.user.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        users,
        count: users.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN] Error getting users:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle DELETE user
 */
async function handleDeleteUser(request) {
  try {
    const authResult = requireOwner(request);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error === 'Not authenticated' ? 401 : 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Prevent deleting the owner account
    if (email === authResult.user.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    await deleteUser(email);
    
    console.log('[ADMIN] User deleted:', email, 'by:', authResult.user.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN] Error deleting user:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle BAN/UNBAN user
 */
async function handleBanUser(request) {
  try {
    const authResult = requireOwner(request);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error === 'Not authenticated' ? 401 : 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await request.json();
    const { email, active } = body;
    
    if (!email || active === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and active status are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Prevent banning the owner account
    if (email === authResult.user.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot ban your own account' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    await updateUserStatus(email, active);
    
    console.log('[ADMIN] User status updated:', email, 'active:', active, 'by:', authResult.user.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: active ? 'User unbanned successfully' : 'User banned successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN] Error banning user:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle RESET password
 */
async function handleResetPassword(request) {
  try {
    const authResult = requireOwner(request);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error === 'Not authenticated' ? 401 : 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await request.json();
    const { email, newPassword } = body;
    
    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and new password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    await resetUserPassword(email, newPassword);
    
    console.log('[ADMIN] Password reset for:', email, 'by:', authResult.user.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN] Error resetting password:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle GET analytics
 */
async function handleGetAnalytics(request) {
  try {
    const authResult = requireOwner(request);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error === 'Not authenticated' ? 401 : 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const analytics = await getAnalytics();
    
    console.log('[ADMIN] Analytics retrieved by:', authResult.user.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        analytics
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN] Error getting analytics:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle GET follows
 */
async function handleGetFollows(request) {
  try {
    const authResult = requireOwner(request);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error === 'Not authenticated' ? 401 : 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const follows = await getAllFollows();
    
    console.log('[ADMIN] Follows list retrieved by:', authResult.user.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        follows,
        count: follows.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN] Error getting follows:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle DELETE follow
 */
async function handleDeleteFollow(request) {
  try {
    const authResult = requireOwner(request);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error === 'Not authenticated' ? 401 : 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await request.json();
    const { followerId, followingId } = body;
    
    if (!followerId || !followingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Follower ID and following ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    await deleteFollow(followerId, followingId);
    
    console.log('[ADMIN] Follow deleted:', followerId, '->', followingId, 'by:', authResult.user.email);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Follow relationship deleted successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN] Error deleting follow:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Main handler for Vercel serverless function
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
    case 'users':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleGetUsers(request);
      
    case 'delete-user':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleDeleteUser(request);
      
    case 'ban-user':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleBanUser(request);
      
    case 'reset-password':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleResetPassword(request);
      
    case 'analytics':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleGetAnalytics(request);
      
    case 'follows':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleGetFollows(request);
      
    case 'delete-follow':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleDeleteFollow(request);
      
    default:
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
  }
}
