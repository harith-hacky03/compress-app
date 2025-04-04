'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function FileCompressor({ token }) {
  const [files, setFiles] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const [userFiles, setUserFiles] = useState([]);
  const [zippedFiles, setZippedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    // Get the API URL from environment variable
    const url = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    console.log('Setting API URL:', url);
    setApiUrl(url);
  }, []);

  useEffect(() => {
    if (token && apiUrl) {
      console.log('Fetching files with token and API URL:', { token, apiUrl });
      fetchUserFiles();
    }
  }, [token, apiUrl]);

  const fetchUserFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      const data = await response.json();
      setFiles(data.files || []);
      // Fix: update userFiles so the download button gets the correct fileId.
      setUserFiles(data.files || []);
      setZippedFiles(data.zippedFiles || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setFiles(selectedFiles);
    setError('');
    handleCompress(selectedFiles);
  };

  const handleCompress = async (filesToCompress = files) => {
    if (filesToCompress.length === 0) return;

    setIsCompressing(true);
    setError('');
    const zip = new JSZip();

    try {
      // First, create the zip file
      for (const file of filesToCompress) {
        const fileData = await file.arrayBuffer();
        zip.file(file.name, fileData);
      }

      // Generate the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Upload the zip file to MongoDB
      const formData = new FormData();
      formData.append('file', new File([content], 'compressed_files.zip'));
      formData.append('isZipped', 'true');
      formData.append('originalFiles', JSON.stringify(filesToCompress.map(file => ({
        name: file.name,
        originalName: file.name,
        size: file.size,
      }))));

      console.log('Uploading zip file to:', `${apiUrl}/api/upload`);
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.message || 'Failed to upload zip file');
      }

      
      // Then, upload individual files to MongoDB
      for (const file of filesToCompress) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          console.log('Uploading file to:', `${apiUrl}/api/upload`);
          const response = await fetch(`${apiUrl}/api/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Upload failed:', errorData);
            continue; // Continue with next file even if one fails
          }

          console.log('File uploaded successfully');
        } catch (error) {
          console.error('Error uploading file:', error);
          // Continue with next file even if one fails
        }
      }
      
      // Refresh the user's file list
      await fetchUserFiles();
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to process files. Please try again.');
    } finally {
      setIsCompressing(false);
      setFiles([]);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      console.log('Downloading file from:', `${apiUrl}/api/download/${fileId}`);
      const response = await fetch(`${apiUrl}/api/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download file');
      }

      const blob = await response.blob();
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Download error:', error);
      setError(error.message || 'Failed to download file. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Upload Files</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer block"
            >
              <div className="text-gray-600">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm">Click to upload files</p>
                <p className="text-xs text-gray-500">or drag and drop</p>
              </div>
            </label>
          </div>

          {isCompressing && (
            <div className="text-center text-gray-600">
              <p>Compressing and uploading files...</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Your Files</h2>
        {isLoading ? (
          <div className="text-center text-gray-600">
            <p>Loading your files...</p>
          </div>
        ) : userFiles.length > 0 ? (
          <div className="space-y-4">
            {userFiles.map((file) => (
              <div key={file.fileId} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{file.originalName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(file.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(file.fileId, file.originalName)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-600">
            <p>No files uploaded yet</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Your Zipped Files</h2>
        {isLoading ? (
          <div className="text-center text-gray-600">
            <p>Loading your zipped files...</p>
          </div>
        ) : zippedFiles.length > 0 ? (
          <div className="space-y-4">
            {zippedFiles.map((file) => (
              <div key={file.fileId} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{file.originalName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(file.uploadDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Contains {file.originalFiles.length} files
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(file.fileId, file.originalName)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-600">
            <p>No zipped files uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
} 