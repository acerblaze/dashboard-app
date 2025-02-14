import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BaseMetricWidget } from '../base-metric-widget';

@Component({
  selector: 'app-expanded-metric-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './expanded-metric-widget.component.html',
  styleUrl: './expanded-metric-widget.component.scss'
})
export class ExpandedMetricWidgetComponent extends BaseMetricWidget {
  isTargetReached: boolean = false;

  constructor(
    dashboardState: DashboardStateService,
    numberAnimation: NumberAnimationService
  ) {
    super(dashboardState, numberAnimation);
  }

  protected override calculateMetrics(): void {
    super.calculateMetrics();
    this.isTargetReached = this.progressPercentage >= 100;
  }

  toggleSize(): void {
    this.dashboardState.updateWidgetSize(this.id, 'small');
  }

  getMonthlyTarget(): number {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return 0;
    return this.dashboardState.getMetricData(widget.type).monthlyTarget;
  }
}
