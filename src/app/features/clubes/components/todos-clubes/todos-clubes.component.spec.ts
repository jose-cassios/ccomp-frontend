import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodosClubesComponent } from './todos-clubes.component';

describe('TodosClubesComponent', () => {
  let component: TodosClubesComponent;
  let fixture: ComponentFixture<TodosClubesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodosClubesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodosClubesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
