import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MetricDetailsComponent } from './pages/metric-details/metric-details.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Analytics Dashboard'
  },
  {
    path: 'metric/:type',
    component: MetricDetailsComponent,
    title: 'Metric Details'
  }
];
