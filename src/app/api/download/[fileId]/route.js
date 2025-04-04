import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '89489');
    const userId = decoded.userId;
    const fileId = params.fileId;

    await connectDB();

    // Get user and verify file ownership
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const file = user.files.find(f => f.fileId === fileId);
    if (!file) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    // Create GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'files',
    });

    // Get file stream
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return file with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { message: 'Error downloading file' },
      { status: 500 }
    );
  }
} 