import { signal } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NewsItemType } from '../interface/news.interface';
import { NewsService } from '../services/news.service';
import { NewsComponent } from './news.component';

describe('NewsComponent', () => {
  const role = signal('USER');
  let fixture: ComponentFixture<NewsComponent>;

  const news: NewsItemType = {
    id: 7,
    title: 'Notícia carregada pelo slug',
    slug: 'noticia-carregada',
    summary: 'Resumo da notícia carregada.',
    cover_image_url: 'https://example.com/capa.jpg',
    featured: false,
    published_at: '2026-08-11T12:00:00',
    updated_at: '2026-08-11T12:00:00',
    content: '## Conteúdo\n\nTexto em **Markdown**.',
  };

  beforeEach(async () => {
    role.set('USER');
    await TestBed.configureTestingModule({
      imports: [NewsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticatedState: () => role() !== 'VISITOR', hasAnyRole: (allowed: readonly string[]) => allowed.includes(role()) } },
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

  it.each(['ADM', 'MODERATOR'])('shows the edit destination for %s reading a public article', roleName => {
    role.set(roleName); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.edit-link')?.getAttribute('href')).toBe('/noticias/7/editar');
  });
  it.each(['VISITOR', 'USER', 'STAFF'])('does not expose the moderation action to %s', roleName => {
    role.set(roleName); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.edit-link')).toBeNull();
  });
  it('should load and render the public news by slug', () => {
    const title = fixture.nativeElement.querySelector('.preview-heading h1');
    expect(title?.textContent).toContain(news.title);
    expect(fixture.nativeElement.querySelector('.markdown-content strong')?.textContent).toBe('Markdown');
  });
});
