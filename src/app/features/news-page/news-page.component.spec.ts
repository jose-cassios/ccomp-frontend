import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { NewsService } from './services/news.service';
import { NewsPageComponent } from './news-page.component';

describe('NewsPageComponent', () => {
  let fixture: ComponentFixture<NewsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { hasAnyRole: () => false },
        },
        {
          provide: NewsService,
          useValue: {
            getAll: () => of({ content: [], next_cursor: null, previous_cursor: null }),
            getMine: () => of({ author: [], editor: [] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render an empty public state without showing editorial actions', () => {
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Nenhuma notícia');
    expect(fixture.nativeElement.querySelector('.btn-create-news')).toBeNull();
  });
});
