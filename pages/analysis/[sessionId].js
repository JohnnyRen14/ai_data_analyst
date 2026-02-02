import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import DataPreview from '../../components/DataPreview';
import ChatInterface from '../../components/ChatInterface';
import VisualizationPanel from '../../components/VisualizationPanel';
import InsightsCard from '../../components/InsightsCard';

export default function AnalysisPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [etlData, setEtlData] = useState(null);
  const [dataInsights, setDataInsights] = useState(null);
  const [visualizations, setVisualizations] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionId) {
      performETL();
    }
  }, [sessionId]);

  const performETL = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/etl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) throw new Error('ETL failed');
      
      const data = await response.json();
      setEtlData(data);
      setCurrentStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreprocessing = async (method = 'z-score') => {
    setLoading(true);
    try {
      const response = await fetch('/api/preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, method }),
      });

      if (!response.ok) throw new Error('Preprocessing failed');
      
      setCurrentStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessComplete = async (businessPlan) => {
    setCurrentStep(4);
    // Automatically proceed to data insights
    await generateDataInsights();
  };

  const generateDataInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) throw new Error('Insights generation failed');
      
      const data = await response.json();
      setDataInsights(data.insights);
      
      // Generate visualizations
      if (data.insights.visualizations) {
        await generateVisualizations(data.insights.visualizations);
      }
      
      setCurrentStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateVisualizations = async (vizConfig) => {
    try {
      // In a real implementation, fetch actual data for visualizations
      // For now, we'll use the configuration from AI
      setVisualizations(vizConfig);
      setCurrentStep(6);
    } catch (err) {
      setError(err.message);
    }
  };

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) throw new Error('Analysis generation failed');
      
      const data = await response.json();
      setAnalysis(data.analysis);
      setCurrentStep(7);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <Layout>
        <div className="text-center">
          <p className="text-gray-400">Loading session...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8 glass-strong p-6 rounded-2xl">
          <h1 className="text-3xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
            Analysis Pipeline
          </h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step <= currentStep ? 'gradient-primary' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-400">
            Step {currentStep} of 7
          </div>
        </div>

        {error && (
          <div className="mb-8 glass-strong p-4 rounded-xl border-l-4 border-red-500">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Processing...</p>
          </div>
        )}

        {/* Step 1 & 2: ETL & Data Preview */}
        {currentStep >= 2 && etlData && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📊 Data Preview</h2>
            <DataPreview
              data={etlData.data}
              columns={etlData.columns}
              totalRows={etlData.rowCount}
            />
            
            {currentStep === 2 && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => handlePreprocessing('z-score')}
                  className="btn-primary"
                  disabled={loading}
                >
                  Apply Z-Score Normalization
                </button>
                <button
                  onClick={() => handlePreprocessing('min-max')}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Apply Min-Max Normalization
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Skip Preprocessing
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Business Understanding */}
        {currentStep === 3 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">💡 Business Understanding</h2>
            <ChatInterface
              sessionId={sessionId}
              onComplete={handleBusinessComplete}
            />
          </div>
        )}

        {/* Step 4 & 5: Data Insights */}
        {currentStep >= 4 && dataInsights && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🔍 Data Insights</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="glass-strong p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-3">Data Quality</h3>
                <ul className="space-y-2">
                  {dataInsights.dataQuality?.map((item, idx) => (
                    <li key={idx} className="text-gray-300 flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-strong p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-3">Patterns</h3>
                <ul className="space-y-2">
                  {dataInsights.patterns?.map((item, idx) => (
                    <li key={idx} className="text-gray-300 flex items-start gap-2">
                      <span className="text-blue-400">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {currentStep === 4 && (
              <button
                onClick={generateVisualizations}
                className="btn-primary"
                disabled={loading}
              >
                Generate Visualizations
              </button>
            )}
          </div>
        )}

        {/* Step 6: Visualizations */}
        {currentStep >= 5 && visualizations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📈 Visualizations</h2>
            <VisualizationPanel visualizations={visualizations} />
            
            {currentStep === 6 && (
              <div className="mt-6">
                <button
                  onClick={generateAnalysis}
                  className="btn-primary"
                  disabled={loading}
                >
                  Generate AI Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 7: Analysis Results */}
        {currentStep === 7 && analysis && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🎯 AI Analysis</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <InsightsCard
                title="Descriptive Analysis"
                type="descriptive"
                insights={analysis.descriptive?.insights}
              />
              <InsightsCard
                title="Predictive Analysis"
                type="predictive"
                insights={analysis.predictive?.insights}
              />
              <InsightsCard
                title="Prescriptive Analysis"
                type="prescriptive"
                insights={analysis.prescriptive?.insights}
              />
            </div>
            
            <div className="mt-8 glass-strong p-6 rounded-2xl text-center">
              <h3 className="text-2xl font-bold mb-2 text-green-400">
                ✓ Analysis Complete!
              </h3>
              <p className="text-gray-400 mb-4">
                Your comprehensive data analysis is ready
              </p>
              <button
                onClick={() => router.push('/')}
                className="btn-primary"
              >
                Analyze Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
