import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

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

export async function GET(request) {
  const origin = request.headers.get('origin') || 'https://compress-app.vercel.app';
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No token provided' },
        { 
          status: 401,
          headers: corsHeaders(origin)
        }
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { 
          status: 401,
          headers: corsHeaders(origin)
        }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { 
          status: 401,
          headers: corsHeaders(origin)
        }
      );
    }

    await connectToDatabase();

    const user = await User.findById(decoded.userId).populate('files').populate('zippedFiles');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { 
          status: 404,
          headers: corsHeaders(origin)
        }
      );
    }

    return NextResponse.json(
      {
        files: user.files || [],
        zippedFiles: user.zippedFiles || []
      },
      {
        status: 200,
        headers: corsHeaders(origin)
      }
    );
  } catch (error) {
    console.error('Error in files endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: corsHeaders(origin)
      }
    );
  }
} 