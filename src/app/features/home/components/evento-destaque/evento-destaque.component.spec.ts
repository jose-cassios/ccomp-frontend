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
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
