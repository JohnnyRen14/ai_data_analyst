import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { ScatterChart } from '@mui/x-charts/ScatterChart';
import { PieChart } from '@mui/x-charts/PieChart';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

const chartSx = {
  // Axis labels
  '& .MuiChartsAxis-tickLabel': {
    fill: '#9ca3af !important',
    fontSize: '0.75rem',
  },
  // Axis lines
  '& .MuiChartsAxis-line': {
    stroke: 'rgba(255,255,255,0.1) !important',
  },
  // Grid lines
  '& .MuiChartsGrid-line': {
    stroke: 'rgba(255,255,255,0.06) !important',
  },
  // Tick marks
  '& .MuiChartsAxis-tick': {
    stroke: 'rgba(255,255,255,0.1) !important',
  },
};

/**
 * Normalize viz specs from either old format (xKey/yKey) or new agent format (x_axis/y_axis).
 */
function normalizeViz(viz) {
  return {
    type: normalizeChartType(viz.type),
    title: viz.title || 'Chart',
    description: viz.description || '',
    xKey: viz.xKey || viz.x_axis,
    yKey: viz.yKey || viz.y_axis,
    data: viz.data || [],
    series: viz.series || [],
  };
}

/**
 * Map agent chart type names to internal types.
 */
function normalizeChartType(type) {
  const typeMap = {
    bar_chart: 'bar',
    line_chart: 'line',
    scatter_plot: 'scatter',
    pie_chart: 'pie',
    histogram: 'bar',       // render histograms as bar charts
    stacked_bar: 'bar',     // render stacked bars as bar charts
    bar: 'bar',
    line: 'line',
    scatter: 'scatter',
    pie: 'pie',
  };
  return typeMap[type] || 'bar';
}

export default function VisualizationPanel({ visualizations }) {
  if (!visualizations || visualizations.length === 0) {
    return (
      <div className="glass-strong p-8 rounded-2xl text-center">
        <p className="text-gray-400">No visualizations available</p>
      </div>
    );
  }

  const renderChart = (rawViz, index) => {
    const viz = normalizeViz(rawViz);
    const { type, data, xKey, yKey, title, description } = viz;

    // Guard: need data to render
    if (!data || data.length === 0) {
      return (
        <div key={index} className="glass-strong p-6 rounded-2xl animate-fade-in">
          <h4 className="text-lg font-bold mb-1">{title}</h4>
          <p className="text-sm text-gray-400">No data available for this chart</p>
        </div>
      );
    }

    // Extract axis data and series data
    const xLabels = data.map((d) => d[xKey] ?? '');
    const yValues = data.map((d) => Number(d[yKey]) || 0);

    let chart = null;

    if (type === 'line') {
      chart = (
        <LineChart
          xAxis={[{ data: xLabels, scaleType: 'point' }]}
          series={[{ data: yValues, label: yKey, color: '#6366f1' }]}
          height={300}
          grid={{ horizontal: true }}
          sx={chartSx}
          skipAnimation
        />
      );
    } else if (type === 'bar') {
      chart = (
        <BarChart
          xAxis={[{ data: xLabels, scaleType: 'band' }]}
          series={[{ data: yValues, label: yKey, color: '#8b5cf6' }]}
          height={300}
          grid={{ horizontal: true }}
          sx={chartSx}
          skipAnimation
        />
      );
    } else if (type === 'scatter') {
      const scatterData = data.map((d) => ({
        x: Number(d[xKey]) || 0,
        y: Number(d[yKey]) || 0,
        id: d[xKey],
      }));
      chart = (
        <ScatterChart
          series={[{ data: scatterData, label: `${xKey} vs ${yKey}`, color: '#ec4899' }]}
          height={300}
          sx={chartSx}
          skipAnimation
        />
      );
    } else if (type === 'pie') {
      const pieData = data.map((d, i) => ({
        id: i,
        value: Number(d[yKey]) || 0,
        label: String(d[xKey] ?? `Item ${i + 1}`),
        color: COLORS[i % COLORS.length],
      }));
      chart = (
        <PieChart
          series={[{ data: pieData, innerRadius: 30, outerRadius: 100, paddingAngle: 2 }]}
          height={300}
          sx={chartSx}
          skipAnimation
        />
      );
    } else {
      // Fallback: default to bar chart
      chart = (
        <BarChart
          xAxis={[{ data: xLabels, scaleType: 'band' }]}
          series={[{ data: yValues, label: yKey, color: '#8b5cf6' }]}
          height={300}
          grid={{ horizontal: true }}
          sx={chartSx}
          skipAnimation
        />
      );
    }

    return (
      <div key={index} className="glass-strong p-6 rounded-2xl animate-fade-in">
        <div className="mb-4">
          <h4 className="text-lg font-bold mb-1">{title}</h4>
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>
        {chart}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {visualizations.map((viz, idx) => renderChart(viz, idx))}
    </div>
  );
}
