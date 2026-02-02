import { useState, useCallback } from 'react';

export default function FileUploader({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onUploadSuccess(data);
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div
        className={`glass-strong p-12 rounded-2xl transition-all duration-300 ${
          isDragging ? 'border-2 border-primary scale-105' : 'border-2 border-transparent'
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 gradient-primary rounded-full flex items-center justify-center">
              <span className="text-4xl">📊</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Upload Your CSV File</h3>
            <p className="text-gray-400">
              Drag and drop your file here, or click to browse
            </p>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
            disabled={uploading}
          />

          <label
            htmlFor="file-input"
            className={`btn-primary inline-block cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="shimmer">Uploading...</span>
              </span>
            ) : (
              'Select File'
            )}
          </label>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="glass p-3 rounded-lg">
              <div className="text-primary font-semibold mb-1">✓ Fast</div>
              <div>Lightning quick processing</div>
            </div>
            <div className="glass p-3 rounded-lg">
              <div className="text-secondary font-semibold mb-1">✓ Secure</div>
              <div>Your data is encrypted</div>
            </div>
            <div className="glass p-3 rounded-lg">
              <div className="text-accent font-semibold mb-1">✓ Smart</div>
              <div>AI-powered insights</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
