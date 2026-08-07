import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Clubes } from './clubes';

describe('Clubes', () => {
  let component: Clubes;
  let fixture: ComponentFixture<Clubes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clubes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Clubes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
