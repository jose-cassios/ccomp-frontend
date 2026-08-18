import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { EventosAndamentoComponent } from './eventos-andamento.component';

describe('EventosAndamentoComponent', () => {
  let component: EventosAndamentoComponent;
  let fixture: ComponentFixture<EventosAndamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventosAndamentoComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventosAndamentoComponent);
    fixture.componentRef.setInput('eventos', [
      {
        id: 1,
        title: 'Evento 1',
        slug: 'evento-1',
        description: null,
        format: 'IN_PERSON',
        category: 'ACADEMIC_EDUCATIONAL',
        start_date: '2026-09-01T09:00:00',
        end_date: '2026-09-01T12:00:00',
      },
      {
        id: 2,
        title: 'Evento 2',
        slug: 'evento-2',
        description: null,
        format: 'ONLINE',
        category: 'OTHER',
        start_date: '2026-09-02T09:00:00',
        end_date: '2026-09-02T12:00:00',
      },
    ]);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('avança para o próximo evento e volta ao primeiro no fim da lista', () => {
    component.goTo(component.eventos().length - 1);

    component.next();

    expect(component.currentIndex()).toBe(0);
  });

  it('volta para o último evento ao retroceder a partir do primeiro', () => {
    component.prev();

    expect(component.currentIndex()).toBe(component.eventos().length - 1);
  });
});
