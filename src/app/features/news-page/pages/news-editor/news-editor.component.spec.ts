import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NewsItemType } from '../../interface/news.interface';
import { NewsService } from '../../services/news.service';
import { NewsEditorComponent } from './news-editor.component';

describe('NewsEditorComponent', () => {
  let component: NewsEditorComponent;
  let fixture: ComponentFixture<NewsEditorComponent>;

  const createdNews: NewsItemType = {
    id: 42,
    title: 'News Title',
    slug: 'news-title-a1b2c3',
    summary: null,
    cover_image_url: null,
    featured: false,
    published_at: null,
    updated_at: '2026-08-11T12:00:00',
    content: 'Default content',
  };
  const savedNews: NewsItemType = {
    ...createdNews,
    title: 'Título completo da notícia',
    summary: 'Resumo suficientemente completo.',
    cover_image_url: 'https://example.com/capa.jpg',
    content: '## Conteúdo\n\nTexto suficientemente completo para salvar.',
  };

  const newsService = {
    create: vi.fn(() => of(createdNews)),
    update: vi.fn(() => of(savedNews)),
    publish: vi.fn(() => of(void 0)),
    getById: vi.fn(() => of({ ...savedNews, published_at: '2026-08-11T15:00:00' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [NewsEditorComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } },
        },
        { provide: NewsService, useValue: newsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the template and patch only the update contract fields', () => {
    component.form.setValue({
      title: savedNews.title,
      summary: savedNews.summary ?? '',
      cover_image_url: savedNews.cover_image_url ?? '',
      featured: savedNews.featured,
      content: savedNews.content ?? '',
    });

    component.save();

    expect(newsService.create).toHaveBeenCalledOnce();
    expect(newsService.update).toHaveBeenCalledWith(createdNews.id, {
      title: savedNews.title,
      summary: savedNews.summary,
      cover_image_url: savedNews.cover_image_url,
      featured: savedNews.featured,
      content: savedNews.content,
    });
    expect(component.news()?.id).toBe(createdNews.id);
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(component.canPublish()).toBe(true);
  });

  it('should block publishing dirty content and update state after a saved publication', () => {
    component.form.setValue({
      title: savedNews.title,
      summary: savedNews.summary ?? '',
      cover_image_url: savedNews.cover_image_url ?? '',
      featured: savedNews.featured,
      content: savedNews.content ?? '',
    });
    component.save();

    component.form.controls.summary.setValue('Resumo alterado e ainda não salvo.');
    component.publish();
    expect(newsService.publish).not.toHaveBeenCalled();

    component.save();
    component.publish();

    expect(newsService.publish).toHaveBeenCalledWith(createdNews.id);
    expect(newsService.getById).toHaveBeenCalledWith(createdNews.id);
    expect(component.isPublished()).toBe(true);
  });
});
