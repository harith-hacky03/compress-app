import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '89489');
    const userId = decoded.userId;

    await connectDB();

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const isZipped = formData.get('isZipped') === 'true';
    const originalFiles = JSON.parse(formData.get('originalFiles') || '[]');

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Create GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'files',
    });

    // Upload file to GridFS
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        userId: userId,
        originalName: file.name,
        contentType: file.type,
        isZipped: isZipped,
        originalFiles: originalFiles,
      },
    });

    const buffer = await file.arrayBuffer();
    await uploadStream.write(Buffer.from(buffer));
    await uploadStream.end();

    // Save file reference to user
    if (isZipped) {
      user.zippedFiles.push({
        name: file.name,
        originalName: file.name,
        size: file.size,
        fileId: uploadStream.id.toString(),
        uploadDate: new Date(),
        originalFiles: originalFiles,
      });
    } else {
      user.files.push({
        name: file.name,
        originalName: file.name,
        size: file.size,
        fileId: uploadStream.id.toString(),
        uploadDate: new Date(),
      });
    }

    await user.save();

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      fileId: uploadStream.id.toString(),
      isZipped: isZipped
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: 'Error uploading file' },
      { status: 500 }
    );
  }
} 