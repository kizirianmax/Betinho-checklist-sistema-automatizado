/**
 * Follow/Unfollow API - Vercel Serverless Function
 * Handles follow relationships between users
 * 
 * Endpoints:
 * - POST /api/follow?action=follow
 * - POST /api/follow?action=unfollow
 * - GET /api/follow?action=followers&userId=...
 * - GET /api/follow?action=following&userId=...
 * - GET /api/follow?action=check&userId=...
 */

import { verifyToken, extractToken } from './lib/auth-middleware.js';
import { getUserByEmail } from './lib/storage.js';
import { getFirestore } from './lib/firebase.js';

const FOLLOWS_COLLECTION = 'follows';
const USERS_COLLECTION = 'users';

/**
 * Follow a user
 */
async function handleFollow(request) {
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
    
    const body = await request.json();
    const { targetEmail } = body;
    
    if (!targetEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Target user email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Prevent self-following
    if (payload.email === targetEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot follow yourself' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if target user exists
    const targetUser = await getUserByEmail(targetEmail);
    if (!targetUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const db = getFirestore();
    
    // Check if already following
    const followId = `${payload.email}_${targetEmail}`;
    const followRef = db.collection(FOLLOWS_COLLECTION).doc(followId);
    const followDoc = await followRef.get();
    
    if (followDoc.exists) {
      return new Response(
        JSON.stringify({ success: false, error: 'Already following this user' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create follow relationship
    const batch = db.batch();
    
    batch.set(followRef, {
      followerId: payload.email,
      followingId: targetEmail,
      createdAt: new Date().toISOString()
    });
    
    // Update follower count (atomic)
    const followerRef = db.collection(USERS_COLLECTION).doc(payload.email);
    batch.update(followerRef, {
      following: db.FieldValue.increment(1)
    });
    
    const followingRef = db.collection(USERS_COLLECTION).doc(targetEmail);
    batch.update(followingRef, {
      followers: db.FieldValue.increment(1)
    });
    
    await batch.commit();
    
    console.log('[FOLLOW] User', payload.email, 'followed', targetEmail);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully followed user'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FOLLOW] Error following user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Unfollow a user
 */
async function handleUnfollow(request) {
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
    
    const body = await request.json();
    const { targetEmail } = body;
    
    if (!targetEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Target user email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const db = getFirestore();
    
    // Check if follow relationship exists
    const followId = `${payload.email}_${targetEmail}`;
    const followRef = db.collection(FOLLOWS_COLLECTION).doc(followId);
    const followDoc = await followRef.get();
    
    if (!followDoc.exists) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not following this user' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Delete follow relationship
    const batch = db.batch();
    
    batch.delete(followRef);
    
    // Update follower count (atomic)
    const followerRef = db.collection(USERS_COLLECTION).doc(payload.email);
    batch.update(followerRef, {
      following: db.FieldValue.increment(-1)
    });
    
    const followingRef = db.collection(USERS_COLLECTION).doc(targetEmail);
    batch.update(followingRef, {
      followers: db.FieldValue.increment(-1)
    });
    
    await batch.commit();
    
    console.log('[FOLLOW] User', payload.email, 'unfollowed', targetEmail);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully unfollowed user'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FOLLOW] Error unfollowing user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get followers list
 * Note: userId parameter expects an email address (email is used as userId throughout the system)
 */
async function handleGetFollowers(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId'); // userId = email address
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID (email) is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const db = getFirestore();
    
    // Get all follows where followingId = userId
    const snapshot = await db.collection(FOLLOWS_COLLECTION)
      .where('followingId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const followers = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const follower = await getUserByEmail(data.followerId);
      if (follower) {
        followers.push(follower);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        followers,
        count: followers.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FOLLOW] Error getting followers:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get following list
 * Note: userId parameter expects an email address (email is used as userId throughout the system)
 */
async function handleGetFollowing(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId'); // userId = email address
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID (email) is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const db = getFirestore();
    
    // Get all follows where followerId = userId
    const snapshot = await db.collection(FOLLOWS_COLLECTION)
      .where('followerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const following = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const user = await getUserByEmail(data.followingId);
      if (user) {
        following.push(user);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        following,
        count: following.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FOLLOW] Error getting following:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Check if following a user
 * Note: userId parameter expects an email address (email is used as userId throughout the system)
 */
async function handleCheckFollow(request) {
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
    
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId'); // userId = email address
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID (email) is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const db = getFirestore();
    const followId = `${payload.email}_${userId}`;
    const followRef = db.collection(FOLLOWS_COLLECTION).doc(followId);
    const followDoc = await followRef.get();
    
    return new Response(
      JSON.stringify({
        success: true,
        isFollowing: followDoc.exists
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FOLLOW] Error checking follow:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
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
    case 'follow':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleFollow(request);
      
    case 'unfollow':
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleUnfollow(request);
      
    case 'followers':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleGetFollowers(request);
      
    case 'following':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleGetFollowing(request);
      
    case 'check':
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      return handleCheckFollow(request);
      
    default:
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
  }
}
