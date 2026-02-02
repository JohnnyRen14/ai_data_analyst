export default function InsightsCard({ title, type, insights, icon }) {
  const getTypeColor = (type) => {
    switch (type) {
      case 'descriptive':
        return 'from-blue-500 to-cyan-500';
      case 'predictive':
        return 'from-purple-500 to-pink-500';
      case 'prescriptive':
        return 'from-green-500 to-emerald-500';
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
        <p className="text-white/80 text-sm capitalize">{type} Analysis</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {insights && insights.length > 0 ? (
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
        ) : (
          <p className="text-gray-400 text-center py-4">
            No insights available yet
          </p>
        )}
      </div>
    </div>
  );
}
