import { Injectable } from '@angular/core';

export type EasingFunction = (progress: number) => number;

export interface AnimationOptions {
  duration?: number;
  easing?: EasingFunction;
  precision?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NumberAnimationService {
  private readonly defaultDuration = 750;
  private readonly defaultPrecision = 2;

  // Collection of easing functions
  static readonly easings = {
    linear: (progress: number): number => progress,
    easeOutExpo: (progress: number): number => 
      progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress),
    easeInOutQuad: (progress: number): number =>
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2,
    easeOutBack: (progress: number): number => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
    }
  };

  animateValue(
    start: number,
    end: number,
    callback: (value: number) => void,
    options: AnimationOptions = {}
  ): void {
    const {
      duration = this.defaultDuration,
      easing = NumberAnimationService.easings.easeOutExpo,
      precision = this.defaultPrecision
    } = options;

    const startTime = performance.now();
    const multiplier = Math.pow(10, precision);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = easing(progress);
      const current = start + (end - start) * easedProgress;
      
      // Round to specified precision
      callback(Math.round(current * multiplier) / multiplier);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure we end up exactly at the target value
        callback(end);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Utility method for animating to a value from the current displayed value
   */
  animateTo(
    currentDisplayValue: number,
    targetValue: number,
    callback: (value: number) => void,
    options?: AnimationOptions
  ): void {
    this.animateValue(currentDisplayValue, targetValue, callback, options);
  }

  /**
   * Utility method for percentage animations
   */
  animatePercentage(
    start: number,
    end: number,
    callback: (value: number) => void,
    options: AnimationOptions = {}
  ): void {
    // Ensure values are between 0 and 100
    const clampedStart = Math.max(0, Math.min(100, start));
    const clampedEnd = Math.max(0, Math.min(100, end));
    
    this.animateValue(
      clampedStart,
      clampedEnd,
      callback,
      {
        duration: options.duration || 500, // Faster default for percentages
        easing: options.easing || NumberAnimationService.easings.easeOutExpo,
        precision: options.precision || 1 // Less precision needed for percentages
      }
    );
  }
} 