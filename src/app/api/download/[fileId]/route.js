import { NextResponse } from 'next/server';
import { GridFSBucket, ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
    },
  });
}

export async function GET(request, { params }) {
  try {
    const fileId = params?.fileId;
    console.log('Requested fileId:', fileId);

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectToDatabase();
    const db = getDb();
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let objectId;
    try {
      objectId = new ObjectId(fileId);
    } catch (e) {
      console.error('Invalid ObjectId format:', fileId);
      return NextResponse.json({ error: 'Invalid file ID format' }, { status: 400 });
    }

    const file = await bucket.find({ _id: objectId }).toArray();
    if (!file || file.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file[0].metadata?.userId?.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const downloadStream = bucket.openDownloadStream(objectId);
    const chunks = [];

    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file[0].filename}"`,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
