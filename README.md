# Analytics Dashboard Application

A modern, responsive analytics dashboard built with Angular 19, featuring real-time metrics visualization, customizable widgets, and an intuitive user interface.

## Features

- **Dynamic Widget System**
  - Drag-and-drop widget organization
  - Resizable widgets (regular and expanded views)
  - Real-time metric updates
  - Customizable widget layouts

- **Metric Visualizations**
  - User analytics tracking
  - Page view statistics
  - Interactive charts using Chart.js
  - Animated number transitions

- **Filtering & Controls**
  - Date-based filtering
  - Device type filtering (Desktop/Mobile/Total)
  - Dynamic data caching
  - Responsive layout

## Technology Stack

- **Frontend Framework**: Angular 19.1.0
- **UI Components**: Angular Material 19.1.4
- **Charting**: Chart.js 4.4.7
- **Date Handling**: Moment.js 2.30.1
- **State Management**: RxJS 7.8.0
- **Styling**: SCSS

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── day-selector/          # Date selection component
│   │   ├── metric-widget/         # Regular-sized metric widget
│   │   ├── expanded-metric-widget/ # Expanded metric widget
│   │   └── base-metric-widget.ts  # Base widget class
│   ├── pages/
│   │   ├── dashboard/            # Main dashboard view
│   │   └── metric-details/       # Detailed metric view
│   ├── services/
│   │   ├── chart.service.ts      # Chart configuration and setup
│   │   ├── dashboard-state.service.ts # State management
│   │   └── number-animation.service.ts # Number animations
│   └── data/
│       └── mock-metrics.ts       # Mock data for development
```

## Setup and Installation

1. **Prerequisites**
   - Node.js (LTS version)
   - Angular CLI 19.1.6

2. **Installation**
   ```bash
   # Clone the repository
   git clone [repository-url]
   cd dashboard-app

   # Install dependencies
   npm install
   ```

3. **Development Server**
   ```bash
   npm start
   ```
   Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

4. **Build**
   ```bash
   npm run build
   ```
   The build artifacts will be stored in the `dist/` directory.

## Key Components

### DashboardStateService
- Central state management service
- Handles widget configurations
- Manages metric data caching
- Controls device and date filtering

### Metric Widgets
- Base widget functionality in `base-metric-widget.ts`
- Regular and expanded view implementations
- Real-time data updates
- Interactive charts and animations

### Data Filtering
- Date selection through `day-selector` component
- Device type filtering (Desktop/Mobile/Total)
- Cached data management for performance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
