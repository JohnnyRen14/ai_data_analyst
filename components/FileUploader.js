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
      // Generate a cleaner table name from the filename
      const tableName = file.name.replace('.csv', '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      formData.append('tableName', tableName);

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
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div
        className={`upload-zone${isDragging ? ' dragging' : ''}`}
        style={{ padding: '48px 32px', textAlign: 'center' }}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Icon */}
        <div style={{
          width: 64, height: 64, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          borderRadius: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(124,110,232,0.35)',
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="white" strokeWidth="2">
            <path d="M14 4v14M8 10l6-6 6 6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 22h20" strokeLinecap="round"/>
          </svg>
        </div>

        <h3 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 8 }}>Drop your CSV file here</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.87rem', marginBottom: 24 }}>
          or click to browse &mdash; supports any comma-separated file
        </p>

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
          className="btn-primary"
          style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? (
            <>
              <span style={{
                width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.7s linear infinite',
              }} />
              Uploading…
            </>
          ) : 'Choose File'}
        </label>

        {error && (
          <div style={{
            marginTop: 20, padding: '10px 16px',
            background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.25)',
            borderRadius: 8, color: 'var(--error)', fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          {[
            { text: 'Fast Processing', color: 'var(--accent-green)' },
            { text: 'Encrypted Upload', color: 'var(--accent-lavender)' },
            { text: 'AI-Powered', color: 'var(--accent)' },
          ].map(({ text, color }) => (
            <span key={text} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '0.75rem', color: 'var(--muted)',
            }}>
              <span style={{ color, fontSize: '0.7rem' }}>&#10003;</span>
              {text}
            </span>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
