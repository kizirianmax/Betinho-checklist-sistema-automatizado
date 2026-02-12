/**
 * Authentication Middleware
 * Verifies JWT tokens and session validity
 */

import crypto from 'crypto';

// Secret for JWT signing - MUST be set in production via environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set for security');
}
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a JWT token
 */
export function createToken(payload) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Date.now();
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from request headers or cookies
 */
export function extractToken(request) {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }
  
  return null;
}

/**
 * Middleware to verify authentication
 */
export function requireAuth(request) {
  const token = extractToken(request);
  
  if (!token) {
    return {
      authenticated: false,
      error: 'No authentication token provided'
    };
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return {
      authenticated: false,
      error: 'Invalid or expired token'
    };
  }
  
  return {
    authenticated: true,
    user: payload
  };
}

/**
 * Middleware to require OWNER role
 */
export function requireOwner(request) {
  const authResult = requireAuth(request);
  
  if (!authResult.authenticated) {
    return authResult;
  }
  
  if (authResult.user.role !== 'OWNER') {
    return {
      authenticated: false,
      error: 'Owner privileges required'
    };
  }
  
  return authResult;
}
