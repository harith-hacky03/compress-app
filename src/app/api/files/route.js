import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
    },
  });
}

export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return NextResponse.json({ error: 'No token provided' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
        }
      });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('No token found in authorization header');
      return NextResponse.json({ error: 'No token provided' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
        }
      });
    }

    // Verify the token
    let userId;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
      console.log('Token verified for user:', userId);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
        }
      });
    }

    // Connect to the database
    try {
      await connectToDatabase();
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json({ error: 'Database connection failed' }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
        }
      });
    }

    // Find the user and populate their files
    const user = await User.findById(userId).populate('files').populate('zippedFiles');
    if (!user) {
      console.log('User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
        }
      });
    }

    console.log('Found user with files:', {
      userId: user._id,
      fileCount: user.files.length,
      zippedFileCount: user.zippedFiles.length
    });

    // Return the files
    return NextResponse.json({
      files: user.files,
      zippedFiles: user.zippedFiles
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Error in files endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
        }
      }
    );
  }
} 