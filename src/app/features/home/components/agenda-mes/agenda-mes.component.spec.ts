import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendaMesComponent } from './agenda-mes.component';

describe('AgendaMesComponent', () => {
  let component: AgendaMesComponent;
  let fixture: ComponentFixture<AgendaMesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaMesComponent]
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
