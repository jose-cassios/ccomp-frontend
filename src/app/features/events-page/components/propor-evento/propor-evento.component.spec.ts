import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProporEventoComponent } from './propor-evento.component';

describe('ProporEventoComponent', () => {
  let component: ProporEventoComponent;
  let fixture: ComponentFixture<ProporEventoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProporEventoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProporEventoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
