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
    fixture.componentRef.setInput('eventos', []);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose format and category filters without restricting dates', () => {
    expect(fixture.nativeElement.querySelectorAll('select')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Todos os eventos');
    expect(fixture.nativeElement.textContent).not.toContain('Período');
  });
});
