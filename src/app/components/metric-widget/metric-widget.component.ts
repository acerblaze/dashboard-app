import { Component, OnInit, ElementRef, ViewChild, OnDestroy, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BaseMetricWidget } from '../base-metric-widget';
import { Chart } from 'chart.js';
import { ChartService } from '../../services/chart.service';
import { MetricCalculationService } from '../../services/metric-calculation.service';

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
  isTargetReached: boolean = false;

  constructor(
    protected override dashboardState: DashboardStateService,
    protected override numberAnimation: NumberAnimationService,
    protected override errorHandler: ErrorHandler,
    private chartService: ChartService,
    private metricCalculation: MetricCalculationService
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
  }

  private initChart() {
    if (!this.sparklineChartCanvas?.nativeElement) return;

    const ctx = this.sparklineChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const chartColor = this.chartService.getChartColor(widget.type);
    const config = this.chartService.getBaseChartConfig(chartColor, true);
    
    this.chart = new Chart(ctx, config);
    this.updateChartData();
    this.resizeObserver = this.chartService.setupChartResizeObserver(
      this.chart,
      this.sparklineChartCanvas.nativeElement
    );
  }

  private updateChartData() {
    if (!this.chart) return;

    try {
      const { labels, data } = this.chartService.getChartData(this.id);
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update('none');
    } catch (error) {
      this.handleError(error);
    }
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
    this.updateTargetStatus();
  }

  private updateTargetStatus(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    const progressPercentage = this.metricCalculation.calculateProgressPercentage(
        metricData,
        selectedDay,
        deviceType
    );
    
    this.isTargetReached = progressPercentage >= 100;
  }
}
