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

export async function GET(req, { params }) {
  try {
    const fileId = params.fileId;
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectToDatabase();
    const db = await getDb();
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const file = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    if (!file?.[0]) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file[0].metadata?.userId?.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
