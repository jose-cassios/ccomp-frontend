import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProximosEventosComponent } from './proximos-eventos.component';

describe('ProximosEventosComponent', () => {
  let component: ProximosEventosComponent;
  let fixture: ComponentFixture<ProximosEventosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProximosEventosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProximosEventosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
