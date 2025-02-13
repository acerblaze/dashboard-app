import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NumberAnimationService {
  private animationDuration = 750; // matches our CSS transition duration

  animateValue(start: number, end: number, callback: (value: number) => void): void {
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      
      // Easing function (easeOutExpo)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      // Calculate current value
      const current = start + (end - start) * eased;
      
      // Round to 2 decimal places to avoid floating point issues
      callback(Math.round(current * 100) / 100);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
} 