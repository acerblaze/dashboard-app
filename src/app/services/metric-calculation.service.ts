import { Injectable } from '@angular/core';
import { DailyMetric, MetricData } from '../data/mock-metrics';
import { DeviceType } from './dashboard-state.service';

@Injectable({
  providedIn: 'root'
})
export class MetricCalculationService {
  calculateCumulativeValue(metricData: MetricData, selectedDay: string, deviceType: DeviceType): number {
    return metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const value = this.getValueForDeviceType(day, deviceType);
        return sum + value;
      }, 0);
  }

  calculateProgressPercentage(metricData: MetricData, selectedDay: string, deviceType: DeviceType): number {
    const cumulativeValue = this.calculateCumulativeValue(metricData, selectedDay, deviceType);
    return (cumulativeValue / metricData.monthlyTarget) * 100;
  }

  calculateWeekOverWeekChange(data: number[]): number {
    if (data.length < 8) return 0;

    const todayValue = data[data.length - 1];
    const lastWeekValue = data[data.length - 8];
    if (lastWeekValue === 0) return 0;

    const change = ((todayValue - lastWeekValue) / lastWeekValue) * 100;
    return isFinite(change) ? Math.round(change) : 0;
  }

  calculateMonthlyAverageComparison(data: number[]): number {
    if (data.length < 2) return 0;

    const todayValue = data[data.length - 1];
    const previousDays = data.slice(0, -1);
    if (previousDays.length === 0) return 0;

    const monthlyAverage = previousDays.reduce((sum, value) => sum + value, 0) / previousDays.length;
    if (monthlyAverage === 0) return 0;

    const change = ((todayValue - monthlyAverage) / monthlyAverage) * 100;
    return isFinite(change) ? Math.round(change) : 0;
  }

  getMetricDataForComparisons(metricData: MetricData, selectedDay: string, deviceType: DeviceType): number[] {
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    const startIndex = Math.max(0, selectedDayIndex - 29);
    const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

    return relevantDays.map(d => this.getValueForDeviceType(d, deviceType));
  }

  private getValueForDeviceType(day: DailyMetric, deviceType: DeviceType): number {
    return deviceType === 'total' ? day.total :
           deviceType === 'desktop' ? day.desktop : day.mobile;
  }
} 