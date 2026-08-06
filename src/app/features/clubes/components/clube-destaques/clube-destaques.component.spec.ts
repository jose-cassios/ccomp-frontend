import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClubeDestaquesComponent } from './clube-destaques.component';

describe('ClubeDestaquesComponent', () => {
  let component: ClubeDestaquesComponent;
  let fixture: ComponentFixture<ClubeDestaquesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubeDestaquesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClubeDestaquesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
