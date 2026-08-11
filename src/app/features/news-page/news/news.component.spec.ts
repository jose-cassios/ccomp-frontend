import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NewsItemType } from '../interface/news.interface';
import { NewsService } from '../services/news.service';
import { NewsComponent } from './news.component';

describe('NewsComponent', () => {
  let fixture: ComponentFixture<NewsComponent>;

  const news: NewsItemType = {
    id: 7,
    title: 'Notícia carregada pelo slug',
    slug: 'noticia-carregada',
    summary: 'Resumo da notícia carregada.',
    coverImageUrl: 'https://example.com/capa.jpg',
    featured: false,
    publishedAt: '2026-08-11T12:00:00',
    updatedAt: '2026-08-11T12:00:00',
    content: '## Conteúdo\n\nTexto em **Markdown**.',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: news.slug })) },
        },
        {
          provide: NewsService,
          useValue: { getBySlug: () => of(news) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should load and render the public news by slug', () => {
    const title = fixture.nativeElement.querySelector('.preview-heading h1');
    expect(title?.textContent).toContain(news.title);
    expect(fixture.nativeElement.querySelector('.markdown-content strong')?.textContent).toBe('Markdown');
  });
});
