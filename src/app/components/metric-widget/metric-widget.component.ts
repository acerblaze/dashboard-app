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
export class MetricWidgetComponent extends BaseMetricWidget {
  showMenu = false;

  constructor(
    dashboardState: DashboardStateService,
    numberAnimation: NumberAnimationService
  ) {
    super(dashboardState, numberAnimation);
  }

  override toggleSize(): void {
    this.dashboardState.toggleWidgetSize(this.id);
    this.showMenu = false;
  }
}
