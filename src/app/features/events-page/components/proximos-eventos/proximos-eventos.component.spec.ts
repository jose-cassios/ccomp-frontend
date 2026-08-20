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

  it('should expose timing, format and category filters', () => {
    expect(fixture.nativeElement.querySelectorAll('select')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Todos os eventos');
  });
});
