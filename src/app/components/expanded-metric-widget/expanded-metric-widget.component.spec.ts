import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedMetricWidgetComponent } from './expanded-metric-widget.component';

describe('ExpandedMetricWidgetComponent', () => {
  let component: ExpandedMetricWidgetComponent;
  let fixture: ComponentFixture<ExpandedMetricWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandedMetricWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpandedMetricWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
