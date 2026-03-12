import Link from 'next/link';
import { useRouter } from 'next/router';

const stages = [
  { name: 'Upload',        path: '/' },
  { name: 'ETL & Preview', path: '/etl' },
  { name: 'Preprocessing', path: '/preprocessing' },
  { name: 'Business Goals',path: '/business' },
  { name: 'Data Insights', path: '/insights' },
  { name: 'Visualizations',path: '/visualizations' },
  { name: 'Analysis',      path: '/analysis' },
];

export default function Layout({ children }) {
  const router = useRouter();

  const getCurrentStep = () => {
    // Handle dynamic routes like /analysis/[sessionId]
    const pathname = router.pathname.startsWith('/analysis/') ? '/analysis' : router.pathname;
    const pathIndex = stages.findIndex(s => s.path === pathname);
    return pathIndex >= 0 ? pathIndex + 1 : 1;
  };

  const handleStepChange = (stepNum) => {
    const path = stages[stepNum - 1]?.path;
    if (path) router.push(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Stepper Header */}
      <div style={{
        background: 'rgba(8, 8, 18, 0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '20px 32px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div>
              <div style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                color: 'var(--muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>Workflow Progress</div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>
                {stages[getCurrentStep() - 1]?.name || 'AI Analytics'}
              </h2>
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--muted)',
              fontWeight: 500,
            }}>
              Step {getCurrentStep()} of {stages.length}
            </div>
          </div>

          {/* Inline stepper indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            overflow: 'auto',
            paddingBottom: 4,
          }}>
            {stages.map((stage, idx) => {
              const stepNum = idx + 1;
              const current = getCurrentStep();
              const isActive = current === stepNum;
              const isComplete = current > stepNum;

              return (
                <div key={stepNum} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link
                    href={stage.path}
                    onClick={(e) => {
                      e.preventDefault();
                      handleStepChange(stepNum);
                    }}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        transition: 'all 0.2s ease',
                        background: isActive
                          ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                          : isComplete
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'rgba(255,255,255,0.08)',
                        color: isActive || isComplete ? '#fff' : 'var(--muted)',
                        border: isActive
                          ? '2px solid var(--primary-light)'
                          : '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                      }}
                      title={stage.name}
                    >
                      {isComplete ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 7l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                  </Link>
                  {idx < stages.length - 1 && (
                    <div
                      style={{
                        width: 16,
                        height: 1,
                        background: isComplete ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--background)',
        padding: '32px',
      }}>
        {children}
      </main>
    </div>
  );
}
