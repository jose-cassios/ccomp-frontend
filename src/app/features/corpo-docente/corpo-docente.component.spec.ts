import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CorpoDocenteComponent } from './corpo-docente.component';

describe('CorpoDocenteComponent', () => {
  let component: CorpoDocenteComponent;
  let fixture: ComponentFixture<CorpoDocenteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CorpoDocenteComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CorpoDocenteComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the formatted faculty count', () => {
    expect(component.professorCount).toBe('06');
    expect(component.professors).toHaveLength(6);
  });

  it('should reserve a nullable Lattes URL field for every faculty member', () => {
    expect(component.professors.every((professor) => 'lattesUrl' in professor)).toBe(true);
  });
});
