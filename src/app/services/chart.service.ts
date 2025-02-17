import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { DashboardStateService } from './dashboard-state.service';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  constructor(private dashboardState: DashboardStateService) {}

  getBaseChartConfig(chartColor: string, isCompact: boolean = false): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: chartColor,
          backgroundColor: isCompact ? 'transparent' : `${chartColor.split(')')[0]} / 0.1)`,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: chartColor,
          pointBorderColor: 'white',
          pointBorderWidth: 1,
          fill: !isCompact
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'hsl(0 0% 100%)',
            titleColor: 'hsl(240 5.9% 10%)',
            bodyColor: 'hsl(240 3.8% 46.1%)',
            borderColor: 'hsl(240 5.9% 90%)',
            borderWidth: 1,
            padding: 8,
            displayColors: false,
            callbacks: {
              label: (context) => `${context.raw}`
            }
          }
        },
        scales: {
          x: {
            display: !isCompact,
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              font: {
                size: 11
              }
            }
          },
          y: {
            display: !isCompact,
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              font: {
                size: 11
              }
            },
            ...(isCompact && {
              suggestedMin: (context: { chart: Chart }) => {
                const values = context.chart.data.datasets[0].data as number[];
                if (values.length === 0) return 0;
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min;
                return min - (range * 0.05);
              },
              suggestedMax: (context: { chart: Chart }) => {
                const values = context.chart.data.datasets[0].data as number[];
                if (values.length === 0) return 100;
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min;
                return max + (range * 0.05);
              }
            })
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        hover: {
          mode: 'index',
          intersect: false
        }
      }
    };
  }

  getChartColor(type: 'users' | 'pageViews'): string {
    return type === 'pageViews' 
      ? 'hsl(270 91.2% 59.8%)' // Purple for page views
      : 'hsl(217.2 91.2% 59.8%)'; // Blue for users
  }

  getChartData(widgetId: number, days: number = 7) {
    const widget = this.dashboardState.getWidget(widgetId);
    if (!widget) return { labels: [], data: [] };

    try {
      const metricData = this.dashboardState.getMetricData(widget.type);
      const deviceType = this.dashboardState.getCurrentDeviceType();
      const selectedDay = this.dashboardState.getCurrentSelectedDay();

      const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
      if (selectedDayIndex === -1) return { labels: [], data: [] };

      const startIndex = Math.max(0, selectedDayIndex - (days - 1));
      const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

      const labels = relevantDays.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const data = relevantDays.map(d => 
        deviceType === 'total' ? d.total :
        deviceType === 'desktop' ? d.desktop : d.mobile
      );

      return { labels, data };
    } catch (error) {
      console.error('Error getting chart data:', error);
      return { labels: [], data: [] };
    }
  }

  setupChartResizeObserver(chart: Chart, element: HTMLElement): ResizeObserver {
    const resizeObserver = new ResizeObserver(() => {
      if (chart) {
        chart.resize();
      }
    });
    
    resizeObserver.observe(element);
    return resizeObserver;
  }
} 