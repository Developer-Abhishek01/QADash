import { Logger } from '../utils/logger';
import { AnalyticsService } from './analytics-service';
import { ChartGenerator } from './chart-components';

export interface DashboardConfig {
  widgets: WidgetConfig[];
  layout: 'grid' | 'masonry' | 'full';
  refreshInterval: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position?: { x: number; y: number };
  config: any;
}

export type WidgetType = 
  | 'trend-line'
  | 'bar-chart'
  | 'pie-chart'
  | 'heatmap'
  | 'gauge'
  | 'stats-card'
  | 'table'
  | 'ai-insights';

export class DashboardVisualization {
  private analyticsService: AnalyticsService;
  private chartGenerator: ChartGenerator;

  constructor(_logger?: Logger) {
    this.analyticsService = new AnalyticsService();
    this.chartGenerator = new ChartGenerator();
  }

  async buildDashboard(projectId: string, config?: Partial<DashboardConfig>): Promise<any> {
    const widgets = config?.widgets || this.getDefaultWidgets();

    const widgetData = await Promise.all(
      widgets.map(widget => this.getWidgetData(projectId, widget))
    );

    return {
      widgets: widgets.map((w, i) => ({
        ...w,
        data: widgetData[i],
      })),
      layout: config?.layout || 'grid',
      lastUpdated: new Date().toISOString(),
    };
  }

  private getDefaultWidgets(): WidgetConfig[] {
    return [
      { id: 'w1', type: 'trend-line', title: 'Pass/Fail Trends', size: 'large', config: { days: 30 } },
      { id: 'w2', type: 'bar-chart', title: 'Top Failures', size: 'medium', config: { limit: 10 } },
      { id: 'w3', type: 'pie-chart', title: 'Test Status', size: 'small', config: {} },
      { id: 'w4', type: 'stats-card', title: 'Reliability', size: 'small', config: {} },
      { id: 'w5', type: 'heatmap', title: 'Execution Heatmap', size: 'medium', config: {} },
      { id: 'w6', type: 'bar-chart', title: 'Browser Analytics', size: 'medium', config: {} },
      { id: 'w7', type: 'ai-insights', title: 'AI Insights', size: 'medium', config: {} },
      { id: 'w8', type: 'table', title: 'Environment Stats', size: 'medium', config: {} },
    ];
  }

  private async getWidgetData(projectId: string, widget: WidgetConfig): Promise<any> {
    switch (widget.type) {
      case 'trend-line':
        return this.chartGenerator.generatePassFailTrendChart(
          await this.analyticsService.query({ type: 'trends', filters: { projectId } })
        );
      case 'bar-chart':
        return this.chartGenerator.generateDefectDensityChart(
          await this.analyticsService.query({ type: 'defects', filters: { projectId } })
        );
      case 'pie-chart':
        return this.chartGenerator.generatePieChart('Test Status', [
          { label: 'Passed', value: 75, color: '#22c55e' },
          { label: 'Failed', value: 15, color: '#ef4444' },
          { label: 'Skipped', value: 10, color: '#f59e0b' },
        ]);
      case 'gauge':
        return this.chartGenerator.generateReliabilityGauge(82);
      case 'heatmap':
        return this.chartGenerator.generateHeatmapChart(
          await this.analyticsService.query({ type: 'heatmap', filters: { projectId } })
        );
      case 'ai-insights':
        return this.chartGenerator.generateAiInsightsChart(
          await this.analyticsService.query({ type: 'ai', filters: { projectId } })
        );
      default:
        return {};
    }
  }

  async renderWidget(widget: WidgetConfig, data: any): Promise<string> {
    return `<div id="${widget.id}" class="widget widget-${widget.size}">${JSON.stringify(data)}</div>`;
  }
}

export const dashboardVisualization = new DashboardVisualization();