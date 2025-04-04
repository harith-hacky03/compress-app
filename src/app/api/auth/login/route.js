import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    try {
      console.log('Attempting to connect to database...');
      await connectDB();
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        codeName: error.codeName
      });
      return NextResponse.json(
        { message: 'Database connection error' },
        { status: 500 }
      );
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || '89489',
      { expiresIn: '7d' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      codeName: error.codeName
    });
    return NextResponse.json(
      { message: 'Error logging in' },
      { status: 500 }
    );
  }
} 