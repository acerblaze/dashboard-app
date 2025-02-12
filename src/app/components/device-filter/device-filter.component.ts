import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardStateService, DeviceType } from '../../services/dashboard-state.service';

@Component({
  selector: 'app-device-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './device-filter.component.html',
  styleUrl: './device-filter.component.scss'
})
export class DeviceFilterComponent {
  deviceTypes: { value: DeviceType; label: string }[] = [
    { value: 'total', label: 'All Devices' },
    { value: 'desktop', label: 'Desktop Only' },
    { value: 'mobile', label: 'Mobile Only' }
  ];

  constructor(private dashboardState: DashboardStateService) {}

  get selectedDeviceType(): DeviceType {
    return this.dashboardState.getCurrentDeviceType();
  }

  onDeviceTypeChange(type: DeviceType): void {
    this.dashboardState.setDeviceType(type);
  }
}
