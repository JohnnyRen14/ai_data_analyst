import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import FileUploader from '../components/FileUploader';

export default function Home() {
  const router = useRouter();

  const handleUploadSuccess = (data) => {
    // Redirect to analysis page with session ID
    router.push(`/analysis/${data.sessionId}`);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-6">
            <h1 className="text-6xl font-bold mb-4">
              <span className="gradient-primary bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              Data Analytics
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Transform your CSV data into actionable insights with advanced ETL,
              preprocessing, and AI-driven analysis
            </p>
          </div>

          <div className="flex gap-4 justify-center mb-8">
            <div className="glass px-4 py-2 rounded-full">
              <span className="text-sm">🚀 Automated ETL</span>
            </div>
            <div className="glass px-4 py-2 rounded-full">
              <span className="text-sm">🤖 AI Insights</span>
            </div>
            <div className="glass px-4 py-2 rounded-full">
              <span className="text-sm">📊 Beautiful Viz</span>
            </div>
          </div>
        </div>

        {/* File Uploader */}
        <FileUploader onUploadSuccess={handleUploadSuccess} />

        {/* Features Grid */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="glass-strong p-6 rounded-2xl hover:scale-105 transition-transform animate-fade-in">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-bold mb-2">Smart ETL</h3>
            <p className="text-gray-400 text-sm">
              Automatic data loading, cleaning, and type inference
            </p>
          </div>

          <div className="glass-strong p-6 rounded-2xl hover:scale-105 transition-transform animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-lg font-bold mb-2">Business Context</h3>
            <p className="text-gray-400 text-sm">
              AI understands your objectives through conversation
            </p>
          </div>

          <div className="glass-strong p-6 rounded-2xl hover:scale-105 transition-transform animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-bold mb-2">Triple Analysis</h3>
            <p className="text-gray-400 text-sm">
              Descriptive, Predictive & Prescriptive insights
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 glass-strong p-8 rounded-2xl animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Upload CSV', desc: 'Drag & drop your data file' },
              { step: 2, title: 'ETL Processing', desc: 'Automatic cleaning & validation' },
              { step: 3, title: 'AI Conversation', desc: 'Define business objectives' },
              { step: 4, title: 'Data Analysis', desc: 'Deep dive into patterns' },
              { step: 5, title: 'Visualizations', desc: 'Interactive charts & graphs' },
              { step: 6, title: 'AI Insights', desc: 'Actionable recommendations' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 p-4 glass rounded-lg hover:bg-white/10 transition">
                <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white font-bold">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

