import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DestaquesSemana } from './destaques-semana';

describe('DestaquesSemana', () => {
  let component: DestaquesSemana;
  let fixture: ComponentFixture<DestaquesSemana>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DestaquesSemana],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DestaquesSemana);
    fixture.componentRef.setInput('newsItems', []);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
