import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventoDestaque } from './evento-destaque';

describe('EventoDestaque', () => {
  let component: EventoDestaque;
  let fixture: ComponentFixture<EventoDestaque>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoDestaque]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventoDestaque);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
