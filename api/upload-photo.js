/**
 * Photo Upload API - Vercel Serverless Function
 * Handles user profile photo uploads to Firebase Storage
 * 
 * Features:
 * - Accept image uploads (JPEG, PNG, WebP)
 * - Resize to 400x400 (profile) and 150x150 (thumbnail)
 * - Store in Firebase Storage
 * - Update Firestore user document
 * - Compress images
 * 
 * Endpoint:
 * - POST /api/upload-photo
 */

import { verifyToken, extractToken } from './lib/auth-middleware.js';
import { updateUserProfile } from './lib/storage.js';
import { getStorage } from './lib/firebase.js';
import Busboy from 'busboy';
import sharp from 'sharp';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Parse multipart form data
 */
function parseMultipartForm(request) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: Object.fromEntries(request.headers) });
    
    let fileData = null;
    let fileInfo = null;
    
    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      
      // Validate file type
      if (!ALLOWED_TYPES.includes(mimeType)) {
        file.resume();
        reject(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        return;
      }
      
      fileInfo = { filename, encoding, mimeType };
      const chunks = [];
      
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        fileData = Buffer.concat(chunks);
        
        // Check file size
        if (fileData.length > MAX_FILE_SIZE) {
          reject(new Error('File size exceeds 10MB limit'));
          return;
        }
      });
    });
    
    busboy.on('finish', () => {
      if (!fileData) {
        reject(new Error('No file uploaded'));
        return;
      }
      resolve({ fileData, fileInfo });
    });
    
    busboy.on('error', (error) => {
      reject(error);
    });
    
    // Pipe request to busboy
    const reader = request.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      }
    });
    
    (async () => {
      const nodeStream = require('stream');
      const webToNode = new nodeStream.Readable();
      webToNode._read = () => {};
      
      const webReader = stream.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await webReader.read();
            if (done) {
              webToNode.push(null);
              break;
            }
            webToNode.push(Buffer.from(value));
          }
        } catch (err) {
          webToNode.destroy(err);
        }
      })();
      
      webToNode.pipe(busboy);
    })();
  });
}

/**
 * Resize and compress image
 */
async function processImage(buffer, size) {
  try {
    return await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toBuffer();
  } catch (error) {
    console.error('[UPLOAD] Error processing image:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Upload to Firebase Storage
 */
async function uploadToStorage(userId, buffer, filename) {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    
    const file = bucket.file(`users/${userId}/${filename}`);
    
    await file.save(buffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
      public: true
    });
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    
    return publicUrl;
  } catch (error) {
    console.error('[UPLOAD] Error uploading to storage:', error);
    throw new Error('Failed to upload to storage');
  }
}

/**
 * Handle photo upload
 */
async function handlePhotoUpload(request) {
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
    
    // Parse multipart form
    const { fileData, fileInfo } = await parseMultipartForm(request);
    
    console.log('[UPLOAD] Processing image upload for:', payload.email);
    console.log('[UPLOAD] File size:', fileData.length, 'bytes');
    
    // Generate user ID (sanitized email)
    const userId = payload.email.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Process images
    const profileImage = await processImage(fileData, 400);
    const thumbnailImage = await processImage(fileData, 150);
    
    console.log('[UPLOAD] Images processed. Profile:', profileImage.length, 'bytes');
    console.log('[UPLOAD] Thumbnail:', thumbnailImage.length, 'bytes');
    
    // Upload to Firebase Storage
    const profileUrl = await uploadToStorage(userId, profileImage, 'profile.jpg');
    const thumbnailUrl = await uploadToStorage(userId, thumbnailImage, 'thumbnail.jpg');
    
    console.log('[UPLOAD] Uploaded to storage:', profileUrl);
    
    // Update user profile in Firestore
    const user = await updateUserProfile(payload.email, {
      photoURL: profileUrl
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Photo uploaded successfully',
        photoURL: profileUrl,
        thumbnailURL: thumbnailUrl,
        user
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to upload photo'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Main handler
 */
export default async function handler(request) {
  const url = new URL(request.url);
  
  const headers = {
    'Access-Control-Allow-Origin': url.origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
  
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
  
  return handlePhotoUpload(request);
}
