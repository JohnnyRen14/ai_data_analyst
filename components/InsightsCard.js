export default function InsightsCard({
  title,
  type,
  insights,
  icon,
  summary,
  kpis,
  recommendations,
}) {
  const getTypeColor = (type) => {
    switch (type) {
      case 'descriptive':
        return 'from-blue-500 to-cyan-500';
      case 'predictive':
        return 'from-purple-500 to-pink-500';
      case 'prescriptive':
        return 'from-green-500 to-emerald-500';
      case 'query':
        return 'from-indigo-500 to-violet-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'descriptive':
        return '📊';
      case 'predictive':
        return '🔮';
      case 'prescriptive':
        return '💡';
      case 'query':
        return '🎯';
      default:
        return '📈';
    }
  };

  return (
    <div className="glass-strong rounded-2xl overflow-hidden animate-fade-in hover:scale-[1.02] transition-transform">
      {/* Header with gradient */}
      <div
        className={`p-6 bg-gradient-to-r ${getTypeColor(type)} text-white`}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon || getTypeIcon(type)}</span>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        {summary ? (
          <p className="text-white/90 text-sm">{summary}</p>
        ) : (
          <p className="text-white/80 text-sm capitalize">{type} Analysis</p>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* KPI Highlights */}
        {kpis && Object.keys(kpis).length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(kpis).map(([key, value], idx) => (
              <div
                key={idx}
                className="glass p-3 rounded-lg text-center"
              >
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {key}
                </div>
                <div className="text-lg font-bold text-white">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bullet-point insights */}
        {insights && insights.length > 0 && (
          <ul className="space-y-3">
            {insights.map((insight, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 p-3 glass rounded-lg hover:bg-white/10 transition"
              >
                <span className="text-primary mt-1">▸</span>
                <span className="text-gray-200 flex-1">{insight}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Recommendations
            </h4>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 glass rounded-lg"
                >
                  <span className="text-green-400 mt-1">→</span>
                  <span className="text-gray-200 flex-1">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fallback */}
        {(!insights || insights.length === 0) &&
          (!kpis || Object.keys(kpis).length === 0) &&
          (!recommendations || recommendations.length === 0) && (
            <p className="text-gray-400 text-center py-4">
              No insights available yet
            </p>
          )}
      </div>
    </div>
  );
}
