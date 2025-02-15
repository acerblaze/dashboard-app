import { Component, OnInit, ElementRef, ViewChild, OnDestroy, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BaseMetricWidget } from '../base-metric-widget';
import { Chart, ChartConfiguration, ScaleOptionsByType } from 'chart.js';
import { combineLatest } from 'rxjs';

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
    
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.selectedDay$,
        this.dashboardState.deviceType$,
        this.dashboardState.expandedWidgets$
      ]).subscribe(() => {
        this.updateChartData();
      })
    );
  }

  ngAfterViewInit() {
    this.initChart();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize();
      }
    });
    
    if (this.sparklineChartCanvas?.nativeElement) {
      this.resizeObserver.observe(this.sparklineChartCanvas.nativeElement);
    }
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

  private initChart() {
    if (this.sparklineChartCanvas) {
      const ctx = this.sparklineChartCanvas.nativeElement.getContext('2d');
      
      const widget = this.dashboardState.getWidget(this.id);
      const isPageViews = widget?.type === 'pageViews';
      
      const chartColor = isPageViews 
        ? 'hsl(270 91.2% 59.8%)' // Purple for page views
        : 'hsl(217.2 91.2% 59.8%)'; // Blue for users
      
      const config: ChartConfiguration = {
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
            pointRadius: 2,
            pointHoverRadius: 2,
            pointBackgroundColor: chartColor,
            pointBorderColor: 'white',
            pointBorderWidth: 1
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
              enabled: true,
              mode: 'index',
              intersect: false,
              backgroundColor: 'hsl(0 0% 100%)',
              titleColor: 'hsl(240 5.9% 10%)',
              bodyColor: 'hsl(240 3.8% 46.1%)',
              borderColor: 'hsl(240 5.9% 90%)',
              borderWidth: 1,
              padding: 4,
              boxPadding: 2,
              displayColors: false,
              callbacks: {
                title: () => '',
                label: (context) => {
                  return `${context.label}: ${this.formatNumber(context.raw as number)}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: false
            },
            y: {
              display: false,
              suggestedMin: (context: { chart: Chart }) => {
                const values = context.chart.data.datasets[0].data as number[];
                if (values.length === 0) return 0;
                const min = Math.min(...values);
                const max = Math.max(...values);
                // Calculate the range and set minimum closer to the actual minimum
                const range = max - min;
                return min - (range * 0.05);
              },
              suggestedMax: (context: { chart: Chart }) => {
                const values = context.chart.data.datasets[0].data as number[];
                if (values.length === 0) return 100;
                const min = Math.min(...values);
                const max = Math.max(...values);
                // Calculate the range and set maximum closer to the actual maximum
                const range = max - min;
                return max + (range * 0.05);
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          hover: {
            mode: 'index',
            intersect: false
          }
        }
      };

      this.chart = new Chart(ctx, config);
      this.updateChartData();
    }
  }

  private updateChartData() {
    if (!this.chart) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();

    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return;

    // Get 7 days of data ending at the selected day
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
    this.chart.update('active');
  }

  override toggleSize(): void {
    this.dashboardState.toggleWidgetSize(this.id);
    this.showMenu = false;
  }

  removeWidget(): void {
    this.dashboardState.removeRegularWidget(this.id);
    this.showMenu = false;
  }
}
