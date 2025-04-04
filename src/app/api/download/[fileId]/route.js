import { NextResponse } from 'next/server';
import { GridFSBucket, ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request, { params }) {
  try {
    // Validate parameters
    if (!params?.fileId) {
      return NextResponse.json(
        { error: 'Missing file ID' }, 
        { status: 400 }
      );
    }

    // Authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization required' }, 
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json(
        { error: 'Invalid token' }, 
        { status: 401 }
      );
    }

    // Database connection
    await connectToDatabase();
    const db = getDb();

    // File validation
    let fileId;
    try {
      fileId = new ObjectId(params.fileId);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid file format' }, 
        { status: 400 }
      );
    }

    // User verification
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // File existence check
    const bucket = new GridFSBucket(db, { bucketName: 'files' });
    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' }, 
        { status: 404 }
      );
    }

    // Authorization check
    const file = files[0];
    if (file.metadata?.userId?.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'Access denied' }, 
        { status: 403 }
      );
    }

    // Stream response
    const downloadStream = bucket.openDownloadStream(fileId);
    return new NextResponse(downloadStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Content-Security-Policy': 'default-src "none"',
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error) {
    console.error('Download Error:', {
      error: error.message,
      fileId: params?.fileId,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}