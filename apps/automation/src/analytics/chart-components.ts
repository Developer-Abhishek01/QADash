import { Logger } from '../utils/logger';
import { TrendData, TimeSeriesDataPoint, DefectData, HeatmapCell, AiInsight } from './analytics-client';

export interface ChartConfig {
  title: string;
  type: ChartType;
  data: any;
  options?: ChartOptions;
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'donut'
  | 'area'
  | 'heatmap'
  | 'scatter'
  | 'gauge';

export interface ChartOptions {
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  donutRadius?: number;
  heatmapColorScale?: string[];
  gaugeMin?: number;
  gaugeMax?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
  tooltip?: boolean;
}

export class ChartGenerator {
  constructor(_logger?: Logger) {
  }

  generatePassFailTrendChart(trends: TrendData[]): ChartConfig {
    return {
      title: 'Pass/Fail Trends',
      type: 'area',
      data: {
        labels: trends.map(t => t.period),
        datasets: [
          { name: 'Passed', data: trends.map(t => t.passed), color: '#22c55e' },
          { name: 'Failed', data: trends.map(t => t.failed), color: '#ef4444' },
          { name: 'Skipped', data: trends.map(t => t.skipped), color: '#f59e0b' },
        ],
      },
      options: {
        showLegend: true,
        showGrid: true,
        stacked: true,
        animate: true,
      },
    };
  }

  generateExecutionTrendChart(trends: TimeSeriesDataPoint[]): ChartConfig {
    return {
      title: 'Execution Trends',
      type: 'line',
      data: {
        labels: trends.map(t => t.timestamp),
        datasets: [{ name: 'Executions', data: trends.map(t => t.value), color: '#667eea' }],
      },
      options: {
        showGrid: true,
        animate: true,
      },
    };
  }

  generatePieChart(title: string, data: { label: string; value: number; color: string }[]): ChartConfig {
    return {
      title,
      type: 'pie',
      data: {
        labels: data.map(d => d.label),
        values: data.map(d => d.value),
        colors: data.map(d => d.color),
      },
      options: {
        showLegend: true,
        animate: true,
      },
    };
  }

  generateDefectDensityChart(defects: DefectData[]): ChartConfig {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...defects].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      title: 'Defect Density',
      type: 'bar',
      data: {
        labels: sorted.map(d => d.testName),
        datasets: [{ name: 'Occurrences', data: sorted.map(d => d.occurrences), color: '#ef4444' }],
      },
      options: {
        horizontal: true,
        showGrid: true,
        animate: true,
      },
    };
  }

  generateHeatmapChart(heatmapData: HeatmapCell[]): ChartConfig {
    return {
      title: 'Execution Heatmap',
      type: 'heatmap',
      data: {
        cells: heatmapData,
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      },
      options: {
        heatmapColorScale: ['#f3f4f6', '#93c5fd', '#3b82f6', '#1d4ed8'],
      },
    };
  }

  generateAiInsightsChart(insights: AiInsight[]): ChartConfig {
    const typeColors: Record<string, string> = {
      flaky: '#ef4444',
      slow: '#f59e0b',
      pattern: '#8b5cf6',
      recommendation: '#22c55e',
    };

    const data = insights.map(i => ({
      label: i.title,
      value: i.confidence,
      color: typeColors[i.type] || '#6b7280',
    }));

    return {
      title: 'AI Insights',
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{ name: 'Confidence', data: data.map(d => d.value), color: '#667eea' }],
      },
      options: {
        horizontal: true,
        showGrid: true,
      },
    };
  }

  generateBrowserComparisonChart(browsers: { browser: string; passRate: number; avgDuration: number }[]): ChartConfig {
    return {
      title: 'Browser Comparison',
      type: 'bar',
      data: {
        labels: browsers.map(b => b.browser),
        datasets: [
          { name: 'Pass Rate (%)', data: browsers.map(b => b.passRate), color: '#22c55e' },
          { name: 'Avg Duration (s)', data: browsers.map(b => Math.round(b.avgDuration / 1000)), color: '#667eea' },
        ],
      },
      options: {
        stacked: false,
        showLegend: true,
      },
    };
  }

  generateReliabilityGauge(score: number): ChartConfig {
    return {
      title: 'Reliability Score',
      type: 'gauge',
      data: {
        value: score,
        min: 0,
        max: 100,
      },
      options: {
        gaugeMin: 0,
        gaugeMax: 100,
        colors: ['#ef4444', '#f59e0b', '#22c55e'],
      },
    };
  }

  generateTrendSummary(trends: TrendData[]): { metric: string; value: string; change: number; direction: 'up' | 'down' }[] {
    if (trends.length < 2) return [];

    const last = trends[trends.length - 1];
    const first = trends[0];

    const avgPassRate = trends.reduce((sum, t) => sum + t.passRate, 0) / trends.length;
    const avgDuration = trends.reduce((sum, t) => sum + t.avgDuration, 0) / trends.length;
    const totalTests = trends.reduce((sum, t) => sum + t.total, 0);

    return [
      { metric: 'Pass Rate', value: `${Math.round(avgPassRate)}%`, change: last.passRate - avgPassRate, direction: last.passRate >= avgPassRate ? 'up' : 'down' },
      { metric: 'Avg Duration', value: `${Math.round(avgDuration / 1000)}s`, change: last.avgDuration - avgDuration, direction: last.avgDuration <= avgDuration ? 'up' : 'down' },
      { metric: 'Total Tests', value: totalTests.toString(), change: last.total - first.total, direction: last.total >= first.total ? 'up' : 'down' },
    ];
  }

  generateExportConfig(charts: ChartConfig[], format: 'png' | 'svg' | 'pdf' | 'csv'): unknown {
    return {
      format,
      charts: charts.map(c => c.title),
      timestamp: new Date().toISOString(),
    };
  }
}

export const chartGenerator = new ChartGenerator();