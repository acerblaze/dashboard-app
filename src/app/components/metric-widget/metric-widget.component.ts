import { Component, OnInit, ElementRef, ViewChild, OnDestroy, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BaseMetricWidget } from '../base-metric-widget';
import { Chart, ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-metric-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './metric-widget.component.html',
  styleUrl: './metric-widget.component.scss'
})
export class MetricWidgetComponent extends BaseMetricWidget implements OnInit, OnDestroy {
  showMenu = false;
  @ViewChild('sparklineChart') sparklineChartCanvas!: ElementRef;
  private chart: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    protected override dashboardState: DashboardStateService,
    protected override numberAnimation: NumberAnimationService,
    protected override errorHandler: ErrorHandler
  ) {
    super(dashboardState, numberAnimation, errorHandler);
  }

  override ngOnInit() {
    super.ngOnInit();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  ngAfterViewInit() {
    this.initChart();
    this.setupResizeObserver();
  }

  private initChart() {
    if (!this.sparklineChartCanvas?.nativeElement) return;

    const ctx = this.sparklineChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const isPageViews = widget.type === 'pageViews';
    const chartColor = isPageViews 
      ? 'hsl(270 91.2% 59.8%)' // Purple for page views
      : 'hsl(217.2 91.2% 59.8%)'; // Blue for users

    this.chart = new Chart(ctx, this.getChartConfig(chartColor));
    this.updateChartData();
  }

  private getChartConfig(chartColor: string): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: this.metricLabel,
          data: [],
          fill: true,
          borderColor: chartColor,
          backgroundColor: `${chartColor.split(')')[0]} / 0.1)`,
          tension: 0.4,
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        scales: {
          x: {
            display: false,
            grid: {
              display: false
            }
          },
          y: {
            display: false,
            grid: {
              display: false
            },
            suggestedMin: (context: { chart: Chart }) => {
              const values = context.chart.data.datasets[0].data as number[];
              if (values.length === 0) return 0;
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min;
              return min - (range * 0.05);
            },
            suggestedMax: (context: { chart: Chart }) => {
              const values = context.chart.data.datasets[0].data as number[];
              if (values.length === 0) return 100;
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min;
              return max + (range * 0.05);
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };
  }

  private updateChartData() {
    if (!this.chart) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    try {
      const metricData = this.dashboardState.getMetricData(widget.type);
      const deviceType = this.dashboardState.getCurrentDeviceType();
      const selectedDay = this.dashboardState.getCurrentSelectedDay();

      const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
      if (selectedDayIndex === -1) return;

      // Get last 7 days of data
      const startIndex = Math.max(0, selectedDayIndex - 6);
      const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

      const labels = relevantDays.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const data = relevantDays.map(d => 
        deviceType === 'total' ? d.total : 
        deviceType === 'desktop' ? d.desktop : d.mobile
      );

      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update('none');
    } catch (error) {
      this.handleError(error);
    }
  }

  private setupResizeObserver() {
    if (!this.sparklineChartCanvas?.nativeElement) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize();
      }
    });
    
    this.resizeObserver.observe(this.sparklineChartCanvas.nativeElement);
  }

  override toggleSize(): void {
    this.dashboardState.toggleWidgetSize(this.id);
    this.showMenu = false;
  }

  override toggleMetricType(): void {
    super.toggleMetricType();
    this.showMenu = false;
    this.updateChartData();
  }

  removeWidget(): void {
    this.dashboardState.removeRegularWidget(this.id);
    this.showMenu = false;
  }

  protected override calculateMetrics(): void {
    super.calculateMetrics();
    this.updateChartData();
  }
}
