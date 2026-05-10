import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DestaquesSemana } from './destaques-semana';

describe('DestaquesSemana', () => {
  let component: DestaquesSemana;
  let fixture: ComponentFixture<DestaquesSemana>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DestaquesSemana]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DestaquesSemana);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
