import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetricDetailsComponent } from './metric-details.component';

describe('MetricDetailsComponent', () => {
  let component: MetricDetailsComponent;
  let fixture: ComponentFixture<MetricDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetricDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
