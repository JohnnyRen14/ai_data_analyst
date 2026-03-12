import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import DataPreview from '../../components/DataPreview';
import ChatInterface from '../../components/ChatInterface';
import VisualizationPanel from '../../components/VisualizationPanel';
import InsightsCard from '../../components/InsightsCard';

const analysisStages = [
  { name: 'Upload' },
  { name: 'ETL & Preview' },
  { name: 'Business Goals' },
  { name: 'Generating Insights' },
  { name: 'Data Insights' },
  { name: 'Visualizations' },
  { name: 'Analysis' },
];

export default function AnalysisPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [etlData, setEtlData] = useState(null);
  const [dataInsights, setDataInsights] = useState(null);
  const [businessAnswers, setBusinessAnswers] = useState([]);
  const [visualizations, setVisualizations] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Ad-hoc query state
  const [queryInput, setQueryInput] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResults, setQueryResults] = useState([]);
  const queryInputRef = useRef(null);

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

  const handleProceedToBusiness = () => {
    setCurrentStep(3);
  };

  const handleBusinessComplete = async () => {
    setCurrentStep(4);
    await generateDataInsights();
  };

  const handleProceedToVisualizations = () => {
    setCurrentStep(6);
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
      setVisualizations(data.insights?.visualizations || []);

      if (data.businessAnswers && data.businessAnswers.length > 0) {
        setBusinessAnswers(data.businessAnswers);
      } else if (data.insights.businessAnswers && data.insights.businessAnswers.length > 0) {
        setBusinessAnswers(data.insights.businessAnswers);
      }

      setCurrentStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  // ── Ad-hoc query handler ───────────────────────────────────────
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!queryInput.trim() || queryLoading) return;

    setQueryLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryInput.trim() }),
      });

      if (!response.ok) throw new Error('Query failed');

      const data = await response.json();
      setQueryResults((prev) => [
        { question: queryInput.trim(), ...data, timestamp: new Date().toISOString() },
        ...prev,
      ]);
      setQueryInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setQueryLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <Layout workflowStages={analysisStages} currentStepOverride={currentStep}>
        <div className="text-center">
          <p className="text-gray-400">Loading session...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout workflowStages={analysisStages} currentStepOverride={currentStep}>
      <div className="max-w-7xl mx-auto">
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
                  onClick={handleProceedToBusiness}
                  className="btn-primary"
                  disabled={loading}
                >
                  Proceed to Business Understanding
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

        {/* Visualizations */}
        {currentStep >= 6 && visualizations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📈 Visualizations</h2>
            <VisualizationPanel visualizations={visualizations} />

            {currentStep === 6 && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={generateAnalysis}
                  className="btn-primary"
                  disabled={loading}
                >
                  Generate Final Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Data Insights: Descriptive / Predictive / Prescriptive */}
        {currentStep >= 4 && dataInsights && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🔍 Data Insights</h2>

            {/* Business Question Answers */}
            {businessAnswers.length > 0 && (
              <div className="mb-8 glass-strong p-6 rounded-2xl border-l-4 border-primary">
                <h3 className="text-xl font-bold mb-4 text-gradient-primary">
                  💬 Answers to Your Business Questions
                </h3>
                <div className="space-y-6">
                  {businessAnswers.map((answer, idx) => (
                    <div key={idx} className="glass p-5 rounded-xl">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">❓</span>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-1">
                            {answer.question}
                          </h4>
                          {answer.answer && (
                            <p className="text-gray-400 text-sm mb-3">{answer.answer}</p>
                          )}
                        </div>
                      </div>

                      {answer.error ? (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                          <p className="text-red-400 text-sm">⚠️ Error: {answer.error}</p>
                        </div>
                      ) : answer.data && answer.data.length > 0 ? (
                        <div className="mt-3">
                          <div className="mb-2 text-sm text-gray-400">
                            Found {answer.rowCount || answer.data.length} result(s):
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white/5">
                                  {Object.keys(answer.data[0]).map((key) => (
                                    <th key={key} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {answer.data.slice(0, 10).map((row, rowIdx) => (
                                  <tr key={rowIdx} className="border-t border-white/5 hover:bg-white/5">
                                    {Object.keys(answer.data[0]).map((key) => (
                                      <td key={key} className="px-3 py-2 text-gray-300">
                                        {row[key] !== null && row[key] !== undefined ? String(row[key]) : '-'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {answer.data.length > 10 && (
                              <p className="mt-2 text-xs text-gray-500 text-center">
                                Showing first 10 of {answer.data.length} results
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                          <p className="text-yellow-400 text-sm">ℹ️ No results found for this query</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Descriptive Analytics */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                <span className="text-blue-400">📊</span> Descriptive Analytics
              </h3>
              <p className="text-gray-400 text-sm mb-4">What Happened? — Analyzes historical data to understand trends and patterns.</p>
              <div className="grid md:grid-cols-2 gap-6">
                {dataInsights.descriptive?.map((item, idx) => (
                  <div key={idx} className="glass-strong p-6 rounded-2xl border-l-4 border-blue-500">
                    <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
                    <p className="text-gray-300 mb-2">{item.finding}</p>
                    {item.details && <p className="text-gray-400 text-sm">{item.details}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Predictive Analytics */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                <span className="text-purple-400">🔮</span> Predictive Analytics
              </h3>
              <p className="text-gray-400 text-sm mb-4">What Might Happen? — Uses historical data and pattern recognition to forecast future outcomes.</p>
              <div className="grid md:grid-cols-2 gap-6">
                {dataInsights.predictive?.map((item, idx) => (
                  <div key={idx} className="glass-strong p-6 rounded-2xl border-l-4 border-purple-500">
                    <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
                    <p className="text-gray-300 mb-2">{item.forecast}</p>
                    {item.confidence && (
                      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mb-2 ${
                        item.confidence === 'High' ? 'bg-green-500/20 text-green-400' :
                        item.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {item.confidence} Confidence
                      </span>
                    )}
                    {item.details && <p className="text-gray-400 text-sm mt-1">{item.details}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Prescriptive Analytics */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                <span className="text-green-400">✅</span> Prescriptive Analytics
              </h3>
              <p className="text-gray-400 text-sm mb-4">What Should We Do? — Recommends specific actions to optimize outcomes.</p>
              <div className="grid md:grid-cols-2 gap-6">
                {dataInsights.prescriptive?.map((item, idx) => (
                  <div key={idx} className="glass-strong p-6 rounded-2xl border-l-4 border-green-500">
                    <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
                    <p className="text-gray-300 mb-2">{item.action}</p>
                    {item.expectedOutcome && (
                      <p className="text-xs text-green-400 mb-2">🎯 Expected Outcome: {item.expectedOutcome}</p>
                    )}
                    {item.details && <p className="text-gray-400 text-sm">{item.details}</p>}
                  </div>
                ))}
              </div>
            </div>

            {currentStep === 5 && (
              <div className="mt-6 flex gap-4">
                {visualizations.length > 0 ? (
                  <button
                    onClick={handleProceedToVisualizations}
                    className="btn-primary"
                    disabled={loading}
                  >
                    Continue to Visualizations
                  </button>
                ) : (
                  <button
                    onClick={generateAnalysis}
                    className="btn-primary"
                    disabled={loading}
                  >
                    Generate Final Analysis
                  </button>
                )}
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
                summary={analysis.descriptive?.summary}
              />
              <InsightsCard
                title="Predictive Analysis"
                type="predictive"
                insights={analysis.predictive?.insights}
                summary={analysis.predictive?.summary}
              />
              <InsightsCard
                title="Prescriptive Analysis"
                type="prescriptive"
                insights={analysis.prescriptive?.insights}
                summary={analysis.prescriptive?.summary}
              />
            </div>
          </div>
        )}

        {/* Ad-hoc Query Section — available after Business Understanding is complete (step >= 4) */}
        {currentStep >= 4 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">💬 Ask Your Data</h2>
            <div className="glass-strong p-6 rounded-2xl">
              <form onSubmit={handleQuerySubmit} className="flex gap-3">
                <input
                  ref={queryInputRef}
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ask a question about your data..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={queryLoading}
                />
                <button
                  type="submit"
                  className="btn-primary px-6"
                  disabled={queryLoading || !queryInput.trim()}
                >
                  {queryLoading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Ask'
                  )}
                </button>
              </form>

              {/* Query Results */}
              {queryResults.length > 0 && (
                <div className="mt-6 space-y-6">
                  {queryResults.map((qr, idx) => (
                    <div key={idx} className="glass p-5 rounded-xl">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-xl">❓</span>
                        <p className="text-white font-semibold">{qr.question}</p>
                      </div>

                      {/* Summary / Response */}
                      {qr.response && (
                        <div className="mb-4 p-4 glass rounded-lg">
                          <p className="text-gray-200">{qr.response}</p>
                        </div>
                      )}

                      {/* Insights + KPIs + Recommendations */}
                      {(qr.insights?.length > 0 || (qr.kpis && Object.keys(qr.kpis).length > 0)) && (
                        <InsightsCard
                          title="Query Insights"
                          type="query"
                          summary={qr.response}
                          insights={qr.insights}
                          kpis={qr.kpis}
                          recommendations={qr.recommendations}
                        />
                      )}

                      {/* Visualization */}
                      {qr.visualization && qr.visualization.length > 0 && (
                        <div className="mt-4">
                          <VisualizationPanel visualizations={qr.visualization} />
                        </div>
                      )}

                      {/* Metrics (dev only) */}
                      {qr._metrics && (
                        <details className="mt-3">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                            Pipeline metrics ({qr._metrics.totalDurationMs}ms total)
                          </summary>
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            {qr._metrics.steps?.map((s, i) => (
                              <div key={i} className="flex justify-between">
                                <span>{s.step}</span>
                                <span>{s.durationMs}ms</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion */}
        {currentStep >= 7 && (
          <div className="mb-8 glass-strong p-6 rounded-2xl text-center">
            <h3 className="text-2xl font-bold mb-2 text-green-400">
              ✓ Analysis Complete!
            </h3>
            <p className="text-gray-400 mb-4">
              Your comprehensive data analysis is ready. Use the query box above to explore further.
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              Analyze Another File
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
