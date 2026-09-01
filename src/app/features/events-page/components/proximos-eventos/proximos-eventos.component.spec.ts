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

  it('should render a cover image in an event card', () => {
    fixture.componentRef.setInput('eventos', [{
      id: 1,
      title: 'Semana da Computação',
      slug: 'semana-da-computacao',
      description: null,
      cover_image_url: 'https://example.com/semana.jpg',
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'IN_PERSON',
      start_date: '2026-09-10T08:00:00',
      end_date: '2026-09-10T18:00:00',
    }]);
    fixture.detectChanges();

    const cover = fixture.nativeElement.querySelector('.event-card__cover') as HTMLImageElement;
    expect(cover.src).toBe('https://example.com/semana.jpg');
  });

  it('should render managed events in a compact grid with an edit action', () => {
    fixture.componentRef.setInput('eventos', [{
      id: 1,
      title: 'Semana da Computação',
      slug: 'semana-da-computacao',
      description: null,
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'IN_PERSON',
      status: 'DRAFT',
      start_date: '2026-09-10T08:00:00',
      end_date: '2026-09-10T18:00:00',
    }]);
    fixture.componentRef.setInput('manageMode', true);
    fixture.componentRef.setInput('compactMode', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.events-grid--compact')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.event-card__cover')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Rascunho');
    expect(fixture.nativeElement.textContent).toContain('Editar evento');
  });
});
