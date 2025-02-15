export interface DailyMetric {
  date: string;
  total: number;
  desktop: number;
  mobile: number;
}

export interface MetricData {
  monthlyTarget: number;
  dailyData: DailyMetric[];
}

export interface Metrics {
  users: MetricData;
  pageViews: MetricData;
}

export const mockMetricsData: Metrics = {
  // Data for the "users" metric
  users: {
    monthlyTarget: 10000, // Monthly goal is 10 000 users
    dailyData: [
      { date: "2025-02-01", total: 347, desktop: 228, mobile: 119 },
      { date: "2025-02-02", total: 392, desktop: 251, mobile: 141 },
      { date: "2025-02-03", total: 423, desktop: 279, mobile: 144 },
      { date: "2025-02-04", total: 378, desktop: 242, mobile: 136 },
      { date: "2025-02-05", total: 401, desktop: 257, mobile: 144 },
      { date: "2025-02-06", total: 389, desktop: 249, mobile: 140 },
      { date: "2025-02-07", total: 456, desktop: 298, mobile: 158 },
      { date: "2025-02-08", total: 487, desktop: 312, mobile: 175 },
      { date: "2025-02-09", total: 492, desktop: 325, mobile: 167 },
      { date: "2025-02-10", total: 478, desktop: 306, mobile: 172 },
      { date: "2025-02-11", total: 445, desktop: 289, mobile: 156 },
      { date: "2025-02-12", total: 467, desktop: 308, mobile: 159 },
      { date: "2025-02-13", total: 489, desktop: 313, mobile: 176 },
      { date: "2025-02-14", total: 523, desktop: 341, mobile: 182 },
      { date: "2025-02-15", total: 567, desktop: 374, mobile: 193 },
      { date: "2025-02-16", total: 534, desktop: 347, mobile: 187 },
      { date: "2025-02-17", total: 498, desktop: 319, mobile: 179 },
      { date: "2025-02-18", total: 612, desktop: 428, mobile: 184 },
      { date: "2025-02-19", total: 434, desktop: 351, mobile: 83 },
      { date: "2025-02-20", total: 567, desktop: 371, mobile: 196 },
      { date: "2025-02-21", total: 589, desktop: 389, mobile: 200 },
      { date: "2025-02-22", total: 612, desktop: 398, mobile: 214 },
      { date: "2025-02-23", total: 578, desktop: 379, mobile: 199 },
      { date: "2025-02-24", total: 543, desktop: 358, mobile: 185 },
      { date: "2025-02-25", total: 567, desktop: 371, mobile: 196 },
      { date: "2025-02-26", total: 598, desktop: 387, mobile: 211 },
      { date: "2025-02-27", total: 623, desktop: 408, mobile: 215 },
      { date: "2025-02-28", total: 647, desktop: 423, mobile: 224 }
    ]
  },
  
  // Data for the "pageViews" metric
  pageViews: {
    monthlyTarget: 100000, // Monthly goal is 100 000 page views
    dailyData: [
      { date: "2025-02-01", total: 3847, desktop: 2389, mobile: 1458 },
      { date: "2025-02-02", total: 4123, desktop: 2578, mobile: 1545 },
      { date: "2025-02-03", total: 4367, desktop: 2698, mobile: 1669 },
      { date: "2025-02-04", total: 3987, desktop: 2472, mobile: 1515 },
      { date: "2025-02-05", total: 4234, desktop: 2623, mobile: 1611 },
      { date: "2025-02-06", total: 4156, desktop: 2578, mobile: 1578 },
      { date: "2025-02-07", total: 4567, desktop: 2831, mobile: 1736 },
      { date: "2025-02-08", total: 4789, desktop: 2968, mobile: 1821 },
      { date: "2025-02-09", total: 4892, desktop: 3033, mobile: 1859 },
      { date: "2025-02-10", total: 4678, desktop: 2900, mobile: 1778 },
      { date: "2025-02-11", total: 4456, desktop: 2763, mobile: 1693 },
      { date: "2025-02-12", total: 4567, desktop: 2831, mobile: 1736 },
      { date: "2025-02-13", total: 4789, desktop: 2969, mobile: 1820 },
      { date: "2025-02-14", total: 5123, desktop: 3176, mobile: 1947 },
      { date: "2025-02-15", total: 5345, desktop: 3314, mobile: 2031 },
      { date: "2025-02-16", total: 5123, desktop: 3176, mobile: 1947 },
      { date: "2025-02-17", total: 4892, desktop: 3033, mobile: 1859 },
      { date: "2025-02-18", total: 5012, desktop: 3107, mobile: 1905 },
      { date: "2025-02-19", total: 5234, desktop: 3245, mobile: 1989 },
      { date: "2025-02-20", total: 5456, desktop: 3383, mobile: 2073 },
      { date: "2025-02-21", total: 5678, desktop: 3520, mobile: 2158 },
      { date: "2025-02-22", total: 5890, desktop: 3652, mobile: 2238 },
      { date: "2025-02-23", total: 5567, desktop: 3452, mobile: 2115 },
      { date: "2025-02-24", total: 5234, desktop: 3245, mobile: 1989 },
      { date: "2025-02-25", total: 5456, desktop: 3383, mobile: 2073 },
      { date: "2025-02-26", total: 5789, desktop: 3589, mobile: 2200 },
      { date: "2025-02-27", total: 6012, desktop: 3727, mobile: 2285 },
      { date: "2025-02-28", total: 6234, desktop: 3865, mobile: 2369 }
    ]
  }
}; 