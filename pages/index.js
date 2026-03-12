import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import FileUploader from '../components/FileUploader';

export default function Home() {
  const router = useRouter();

  const handleUploadSuccess = (data) => {
    // Redirect to analysis page with session ID
    router.push(`/analysis/${data.sessionId}`);
  };

  const steps = [
    { step: 1, title: 'Upload CSV',       desc: 'Drag & drop your data file' },
    { step: 2, title: 'ETL Processing',   desc: 'Automatic data processing' },
    { step: 3, title: 'AI Conversation',  desc: 'Define your business objectives' },
    { step: 4, title: 'Data Analysis',    desc: 'Deep dive into patterns & trends' },
    { step: 5, title: 'Visualizations',   desc: 'Interactive charts & dashboards' },
    { step: 6, title: 'AI Insights',      desc: 'Actionable recommendations' },
  ];

  const features = [
    {
      badge: 'badge-green',
      label: 'ETL Engine',
      title: 'Smart Data Processing',
      desc: 'Automatic extract, transform and loading on your uploaded CSV data.',
      accent: 'var(--accent-green)',
    },
    {
      badge: 'badge-lavender',
      label: 'AI Chat',
      title: 'Business Context Understanding',
      desc: 'Conversational AI that learns your goals and tailors every insights to your objectives.',
      accent: 'var(--accent-lavender)',
    },
    {
      badge: 'badge-pink',
      label: 'Triple Analysis',
      title: 'Descriptive · Predictive · Prescriptive',
      desc: 'Three-layer insight engine that tells you what happened, what will happen and what to do.',
      accent: 'var(--accent)',
    },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Hero ── */}
        <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 56, paddingTop: 16 }}>
          <div style={{ display: 'inline-flex', gap: 8, marginBottom: 24 }}>
            <span className="badge badge-green">Insight under 10 minutes</span>
            <span className="badge badge-lavender">Automated ETL Proccess</span>
            <span className="badge badge-pink">Supported by Gemini 3 Flash</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 16 }}>
            <span className="text-gradient">AI-Powered</span>
            <br />
            <span style={{ color: 'var(--foreground)' }}>Data Analytics</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Upload data and get actionable insights to improve your business now!
          </p>
        </div>

        {/* ── Upload ── */}
        <div className="animate-fade-in animate-fade-in-delay-1">
          <FileUploader onUploadSuccess={handleUploadSuccess} />
        </div>

        <div className="divider" style={{ margin: '48px 0' }} />

        {/* ── Features ── */}
        <div className="animate-fade-in animate-fade-in-delay-2" style={{ marginBottom: 48 }}>
          <p className="section-label" style={{ textAlign: 'center', marginBottom: 20 }}>What you get</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {features.map((f) => (
              <div
                key={f.title}
                className="glass-strong"
                style={{
                  borderRadius: 14,
                  padding: '24px',
                  borderTop: `2px solid ${f.accent}30`,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span className={`badge ${f.badge}`} style={{ marginBottom: 14 }}>{f.label}</span>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8, color: 'var(--foreground)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="glass-strong animate-fade-in animate-fade-in-delay-3" style={{ borderRadius: 16, padding: '32px 28px', marginBottom: 32 }}>
          <p className="section-label" style={{ marginBottom: 6 }}>Pipeline</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {steps.map((item) => (
              <div
                key={item.step}
                className="glass"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10 }}
              >
                <div className="step-dot active">{item.step}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}

