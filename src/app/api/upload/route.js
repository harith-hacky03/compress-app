import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': origin || 'https://compress-app.vercel.app',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
});

export async function OPTIONS(request) {
  const origin = request.headers.get('origin') || 'https://compress-app.vercel.app';
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(origin),
  });
}

export async function POST(request) {
  const origin = request.headers.get('origin') || 'https://compress-app.vercel.app';
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Connect to MongoDB and get the database instance
    const conn = await connectToDatabase();
    const db = conn.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const formData = await request.formData();
    const file = formData.get('file');
    const isZipped = formData.get('isZipped') === 'true';
    const originalFiles = formData.get('originalFiles');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Validate file size (optional: add a size limit)
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Open an upload stream to GridFS with metadata
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        userId: decoded.userId,
        isZipped,
        originalFiles: originalFiles ? JSON.parse(originalFiles) : null,
        contentType: file.type,
        size: file.size
      }
    });

    // Convert file's ArrayBuffer to a Node Buffer
    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    // Create a readable stream from the nodeBuffer
    const readableStream = Readable.from(nodeBuffer);

    // Pipe the readable stream into the GridFS upload stream and await finish
    await new Promise((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve);
    });

    // Update the user document with the file ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    if (isZipped) {
      user.zippedFiles.push(uploadStream.id);
    } else {
      user.files.push(uploadStream.id);
    }
    await user.save();

    return NextResponse.json(
      {
        message: 'File uploaded successfully',
        fileId: uploadStream.id,
        fileName: file.name,
        size: file.size,
        isZipped
      },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
