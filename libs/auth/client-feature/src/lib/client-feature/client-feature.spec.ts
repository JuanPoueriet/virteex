import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientFeature } from './client-feature';

describe('ClientFeature', () => {
  let component: ClientFeature;
  let fixture: ComponentFixture<ClientFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientFeature],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientFeature);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
