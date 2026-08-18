import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventoDestaqueComponent } from './evento-destaque.component';

describe('EventoDestaqueComponent', () => {
  let component: EventoDestaqueComponent;
  let fixture: ComponentFixture<EventoDestaqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoDestaqueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventoDestaqueComponent);
    fixture.componentRef.setInput('evento', {
      id: 1,
      title: 'Semana da Computação',
      slug: 'semana-da-computacao',
      description: 'Evento acadêmico',
      format: 'IN_PERSON',
      category: 'ACADEMIC_EDUCATIONAL',
      start_date: '2026-09-01T09:00:00',
      end_date: '2026-09-01T18:00:00',
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
