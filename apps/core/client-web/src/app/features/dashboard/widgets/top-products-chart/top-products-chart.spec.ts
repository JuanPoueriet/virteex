import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { TopProductsChart } from './top-products-chart';
import { DashboardWidget, DashboardService } from '../../../../core/services/dashboard';

describe('TopProductsChart', () => {
  let component: TopProductsChart;
  let fixture: ComponentFixture<TopProductsChart>;

  const mockWidget: DashboardWidget = {
    id: '1',
    type: 'top-products',
    title: 'Top Products',
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
      imports: [TopProductsChart, TranslateModule.forRoot()],
      providers: [
          { provide: DashboardService, useValue: mockDashboardService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopProductsChart);
    component = fixture.componentInstance;
    component.widget = mockWidget;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
