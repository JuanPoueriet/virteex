import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ComparisonChart } from './comparison-chart';
import { DashboardWidget, DashboardService } from '../../../../core/services/dashboard';

describe('ComparisonChart', () => {
  let component: ComparisonChart;
  let fixture: ComponentFixture<ComparisonChart>;

  const mockWidget: DashboardWidget = {
    id: '1',
    type: 'comparison',
    title: 'Test Widget',
    x: 0,
    y: 0,
    cols: 1,
    rows: 1,
  };

  const mockDashboardService = {
      updateWidgetConfig: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparisonChart, TranslateModule.forRoot()],
      providers: [
          { provide: DashboardService, useValue: mockDashboardService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComparisonChart);
    component = fixture.componentInstance;
    component.widget = mockWidget; // Set required input
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
