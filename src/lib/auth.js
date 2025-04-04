import jwt from 'jsonwebtoken';

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '89489');
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || '89489', {
    expiresIn: '7d',
  });
} 