import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmConstrucao } from './em-construcao';

describe('EmConstrucao', () => {
  let component: EmConstrucao;
  let fixture: ComponentFixture<EmConstrucao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmConstrucao]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmConstrucao);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
