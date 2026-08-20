import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AgendaMesComponent } from './agenda-mes.component';

describe('AgendaMesComponent', () => {
  let component: AgendaMesComponent;
  let fixture: ComponentFixture<AgendaMesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaMesComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendaMesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
