import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-metric-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './metric-details.component.html',
  styleUrl: './metric-details.component.scss'
})
export class MetricDetailsComponent {

}
