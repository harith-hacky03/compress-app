import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
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

export async function POST(request) {
  const origin = request.headers.get('origin') || 'https://compress-app.vercel.app';
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { 
          status: 400,
          headers: corsHeaders(origin)
        }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { 
          status: 401,
          headers: corsHeaders(origin)
        }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { 
          status: 401,
          headers: corsHeaders(origin)
        }
      );
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    return NextResponse.json(
      { 
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      },
      { 
        status: 200,
        headers: corsHeaders(origin)
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: corsHeaders(origin)
      }
    );
  }
} 