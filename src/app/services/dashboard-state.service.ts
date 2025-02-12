import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type DeviceType = 'total' | 'desktop' | 'mobile';

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private deviceTypeSubject = new BehaviorSubject<DeviceType>('total');
  deviceType$ = this.deviceTypeSubject.asObservable();

  constructor() {}

  setDeviceType(type: DeviceType): void {
    this.deviceTypeSubject.next(type);
  }

  getCurrentDeviceType(): DeviceType {
    return this.deviceTypeSubject.value;
  }
}
