import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NoticiasClubeComponent } from './noticias-clube.component';

describe('NoticiasClubeComponent', () => {
  let component: NoticiasClubeComponent;
  let fixture: ComponentFixture<NoticiasClubeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasClubeComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasClubeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
