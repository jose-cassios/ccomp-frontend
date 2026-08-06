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
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('avança para o próximo evento e volta ao primeiro no fim da lista', () => {
    component.goTo(component.eventos.length - 1);

    component.next();

    expect(component.currentIndex()).toBe(0);
  });

  it('volta para o último evento ao retroceder a partir do primeiro', () => {
    component.prev();

    expect(component.currentIndex()).toBe(component.eventos.length - 1);
  });
});
