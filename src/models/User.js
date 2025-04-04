import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  files: [{
    name: String,
    originalName: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now },
    fileId: String, // GridFS file ID
  }],
  zippedFiles: [{
    name: String,
    originalName: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now },
    fileId: String, // GridFS file ID
    originalFiles: [{
      name: String,
      originalName: String,
      size: Number,
      fileId: String,
    }],
  }],
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', userSchema); 