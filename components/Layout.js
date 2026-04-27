import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnimatedStepIndicator, AnimatedStepConnector } from './AnimatedStepIndicator';

const defaultStages = [
  { name: 'Upload', path: '/' },
  { name: 'ETL & Preview', path: '/etl' },
  { name: 'Preprocessing', path: '/preprocessing' },
  { name: 'Business Goals', path: '/business' },
  { name: 'Data Insights', path: '/insights' },
  { name: 'Visualizations', path: '/visualizations' },
  { name: 'Analysis', path: '/analysis' },
];

export default function Layout({ children, workflowStages = defaultStages, currentStepOverride }) {
  const router = useRouter();
  const stages = workflowStages?.length ? workflowStages : defaultStages;

  const getRouteStep = () => {
    const pathname = router.pathname === '/analysis/[sessionId]' ? '/analysis' : router.pathname;
    const pathIndex = stages.findIndex((stage) => stage.path === pathname);
    return pathIndex >= 0 ? pathIndex + 1 : 1;
  };

  const currentStep = Number.isFinite(currentStepOverride)
    ? Math.min(Math.max(currentStepOverride, 1), stages.length)
    : getRouteStep();

  const handleStepChange = (stepNum) => {
    // Navigate to analysis page with demo session and step parameter
    router.push(`/analysis/demo?step=${stepNum}`);
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
                {stages[currentStep - 1]?.name || 'AI Analytics'}
              </h2>
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--muted)',
              fontWeight: 500,
            }}>
              Step {currentStep} of {stages.length}
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

              return (
                <div key={stepNum} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{ cursor: stage.path ? 'pointer' : 'default' }}
                    title={stage.name}
                    onClick={() => {
                      if (stage.path) {
                        handleStepChange(stepNum);
                      }
                    }}
                  >
                    <AnimatedStepIndicator
                      step={stepNum}
                      currentStep={currentStep}
                      onClickStep={handleStepChange}
                      disableStepIndicators={!stage.path}
                    />
                  </div>
                  {idx < stages.length - 1 && (
                    <AnimatedStepConnector isComplete={currentStep > stepNum} />
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
