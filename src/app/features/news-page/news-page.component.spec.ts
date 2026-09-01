import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { NewsItemType } from './interface/news.interface';
import { NewsService } from './services/news.service';
import { NewsPageComponent } from './news-page.component';

describe('NewsPageComponent', () => {
  let fixture: ComponentFixture<NewsPageComponent>;
  let component: NewsPageComponent;
  let newsResponse: NewsItemType[];
  let myNews: { author: NewsItemType[]; editor: NewsItemType[] };

  const authService = {
    hasAnyRole: vi.fn(),
  };
  const newsService = {
    getAll: vi.fn(() => of({ content: newsResponse, next_cursor: null, previous_cursor: null })),
    getMine: vi.fn(() => of(myNews)),
  };

  const firstNews: NewsItemType = {
    id: 1,
    title: 'Semana de Algoritmos',
    slug: 'semana-de-algoritmos',
    summary: 'Atividades para a comunidade acadêmica.',
    cover_image_url: null,
    featured: false,
    published_at: '2026-08-22T12:00:00',
  };
  const secondNews: NewsItemType = {
    id: 2,
    title: 'Laboratório aberto',
    slug: 'laboratorio-aberto',
    summary: 'Confira os novos horários do laboratório.',
    cover_image_url: null,
    featured: false,
    published_at: '2026-08-21T12:00:00',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    newsResponse = [];
    myNews = { author: [], editor: [] };
    authService.hasAnyRole.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [NewsPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: NewsService, useValue: newsService },
      ],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(NewsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should render an empty public state without showing editorial actions', () => {
    createComponent();

    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Nenhuma notícia');
    expect(fixture.nativeElement.querySelector('.btn-create-news')).toBeNull();
  });

  it('should search news and show edit actions only for editable news', () => {
    newsResponse = [firstNews, secondNews];
    myNews = { author: [firstNews], editor: [secondNews] };
    authService.hasAnyRole.mockReturnValue(true);
    createComponent();

    expect(fixture.nativeElement.querySelectorAll('.edit-link')).toHaveLength(2);

    component.updateSearch('algoritmos');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-news-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.card-title')?.textContent).toContain('Algoritmos');
  });
});
