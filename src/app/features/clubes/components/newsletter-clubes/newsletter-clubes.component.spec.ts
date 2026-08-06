import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsletterClubesComponent } from './newsletter-clubes.component';

describe('NewslatterClubesComponent', () => {
  let component: NewsletterClubesComponent;
  let fixture: ComponentFixture<NewsletterClubesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsletterClubesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsletterClubesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
