import { Injectable } from '@angular/core';
import { MetricData, DailyMetric } from '../data/mock-metrics';
import { DeviceType } from './dashboard-state.service';

@Injectable({
  providedIn: 'root'
})
export class MetricCalculationService {
  findDayData(metricData: MetricData, selectedDay: string): DailyMetric {
    const dayData = metricData.dailyData.find(d => d.date === selectedDay);
    if (!dayData) {
      throw new Error(`No data found for selected day: ${selectedDay}`);
    }
    return dayData;
  }

  getDeviceValue(data: DailyMetric, deviceType: DeviceType): number {
    return deviceType === 'total' ? data.total :
           deviceType === 'desktop' ? data.desktop : 
           data.mobile;
  }

  calculateCurrentValue(selectedDayData: DailyMetric, deviceType: DeviceType): number {
    return this.getDeviceValue(selectedDayData, deviceType);
  }

  calculateCumulativeValue(
    metricData: MetricData,
    selectedDay: string,
    deviceType: DeviceType
  ): number {
    return metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => sum + this.getDeviceValue(day, deviceType), 0);
  }

  calculateProgressPercentage(
    metricData: MetricData,
    selectedDay: string,
    deviceType: DeviceType
  ): number {
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

    return relevantDays.map(d => this.getDeviceValue(d, deviceType));
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }

  formatPercentage(value: number): string {
    return `${Math.round(value)}%`;
  }
} 