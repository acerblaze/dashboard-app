import { Component, ElementRef, Input, OnInit, ViewChild, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { BaseMetricWidget } from '../base-metric-widget';
import { Chart, ChartConfiguration } from 'chart.js';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-expanded-metric-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatMenuModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './expanded-metric-widget.component.html',
  styleUrl: './expanded-metric-widget.component.scss'
})
export class ExpandedMetricWidgetComponent extends BaseMetricWidget implements OnInit {
  @ViewChild('trendChart') trendChartCanvas!: ElementRef;
  
  private trendChart: Chart | null = null;
  isTargetReached: boolean = false;
  override progressPercentage: number = 0;

  constructor(
    protected override dashboardState: DashboardStateService,
    protected override numberAnimation: NumberAnimationService,
    protected override errorHandler: ErrorHandler
  ) {
    super(dashboardState, numberAnimation, errorHandler);
  }

  override ngOnInit() {
    super.ngOnInit();
    
    // Combine all subscriptions that affect widget data
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.selectedDay$,
        this.dashboardState.deviceType$,
        this.dashboardState.expandedWidgets$
      ]).subscribe(() => {
        this.calculateMetrics();
      })
    );
  }

  ngAfterViewInit() {
    this.initTrendChart();
    this.updateChartData();
  }

  private initTrendChart() {
    const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.getLastSevenDays(),
        datasets: [{
          label: this.metricLabel,
          data: [],
          borderColor: this.metricType === 'users' ? '#1976d2' : '#9c27b0',
          backgroundColor: this.metricType === 'users' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(156, 39, 176, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            padding: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#1a1a1a',
            bodyColor: '#666',
            borderColor: '#e9ecef',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `${this.formatNumber(context.parsed.y)}`;
              }
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#666'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#e9ecef'
            },
            ticks: {
              color: '#666',
              callback: (value) => this.formatNumber(value as number)
            }
          }
        }
      }
    };

    this.trendChart = new Chart(ctx, config);
  }

  private updateChartData() {
    if (!this.trendChart) return;
    
    const data = this.getLastSevenDaysData();
    this.trendChart.data.labels = this.getLastSevenDays();
    this.trendChart.data.datasets[0].data = data;
    this.trendChart.update();
  }

  getMonthlyTarget(): number {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return 0;
    return this.dashboardState.getMetricData(widget.type).monthlyTarget;
  }

  showMenu = false;

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  override toggleMetricType(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (widget) {
      const newType: MetricType = widget.type === 'users' ? 'pageViews' : 'users';
      this.dashboardState.updateWidgetType(this.id, newType);
      this.showMenu = false;
    }
  }

  override toggleSize(): void {
    this.dashboardState.toggleWidgetSize(this.id);
    this.showMenu = false;
  }

  private updateProgressStatus() {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    // Calculate cumulative value up to selected day
    const cumulativeValue = metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const value = deviceType === 'total' ? day.total :
                     deviceType === 'desktop' ? day.desktop : day.mobile;
        return sum + value;
      }, 0);

    // Update progress percentage
    this.progressPercentage = Math.min((cumulativeValue / metricData.monthlyTarget) * 100, 100);
    this.isTargetReached = this.progressPercentage >= 100;
  }

  getHighestValue(): number {
    const data = this.getLastSevenDaysData();
    return Math.max(...data);
  }

  getAverageValue(): number {
    const data = this.getLastSevenDaysData();
    const sum = data.reduce((a, b) => a + b, 0);
    return Math.round(sum / data.length);
  }

  getDayOverDayChange(): number {
    const data = this.getLastSevenDaysData();
    if (data.length < 2) return 0;
    
    const today = data[data.length - 1];
    const yesterday = data[data.length - 2];
    
    if (yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  }

  getWeekOverWeekChange(): number {
    const data = this.getLastSevenDaysData();
    if (data.length < 7) return 0;
    
    const today = data[data.length - 1];
    const lastWeek = data[0];
    
    if (lastWeek === 0) return 0;
    return Math.round(((today - lastWeek) / lastWeek) * 100);
  }

  private getLastSevenDays(): string[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    // Find the index of the selected day
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    // Get 7 days of data ending at the selected day
    const startIndex = Math.max(0, selectedDayIndex - 6);
    const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

    return relevantDays.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
  }

  private getLastSevenDaysData(): number[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    // Find the index of the selected day
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    // Get 7 days of data ending at the selected day
    const startIndex = Math.max(0, selectedDayIndex - 6);
    const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

    return relevantDays.map(d => 
      deviceType === 'total' ? d.total : 
      deviceType === 'desktop' ? d.desktop : d.mobile
    );
  }

  protected override calculateMetrics(): void {
    super.calculateMetrics();
    this.updateProgressStatus();
    this.updateChartData();
  }
}
