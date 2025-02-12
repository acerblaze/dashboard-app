import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetricWidgetComponent } from './metric-widget.component';

describe('MetricWidgetComponent', () => {
  let component: MetricWidgetComponent;
  let fixture: ComponentFixture<MetricWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetricWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
