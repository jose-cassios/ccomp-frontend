import { signal } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StorageService } from '../../../../core/storage/storage.service';
import { NewsItemType } from '../../interface/news.interface';
import { NewsService } from '../../services/news.service';
import { NewsEditorComponent } from './news-editor.component';

describe('NewsEditorComponent', () => {
  const role = signal('STAFF');
  const route = { snapshot: { paramMap: convertToParamMap({}) } };
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
    getMine: vi.fn(() => of({ author: [], editor: [] })),
    create: vi.fn(() => of(createdNews)),
    update: vi.fn(() => of(savedNews)),
    publish: vi.fn(() => of(void 0)),
    delete: vi.fn(() => of({ message: 'Notícia deletada com sucesso.' })),
    getById: vi.fn(() => of({ ...savedNews, published_at: '2026-08-11T15:00:00' })),
    getEditors: vi.fn(() => of([])),
    addEditor: vi.fn(() => of({ response: 'Editor adicionado.' })),
    removeEditor: vi.fn(() => of({ response: 'Editor removido.' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks(); role.set('STAFF'); route.snapshot.paramMap = convertToParamMap({});
    await TestBed.configureTestingModule({
      imports: [NewsEditorComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticatedState: () => true, hasAnyRole: (allowed: readonly string[]) => allowed.includes(role()) } },
        {
          provide: ActivatedRoute,
          useValue: route,
        },
        { provide: NewsService, useValue: newsService },
        { provide: StorageService, useValue: { upload: vi.fn() } },
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

  it('keeps a published news editable and sends its updates through PATCH', () => {
    const publishedNews = { ...savedNews, published_at: '2026-08-11T15:00:00' };
    (component as any).applyNews(publishedNews);
    component.form.controls.summary.setValue('Resumo atualizado após a publicação.');
    component.save();

    expect(component.form.enabled).toBe(true);
    expect(newsService.update).toHaveBeenCalledWith(publishedNews.id, expect.objectContaining({
      summary: 'Resumo atualizado após a publicação.',
    }));
  });

  it('should delete the current draft after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.news.set(savedNews);
    component.isAuthor.set(true);

    component.deleteNews();

    expect(newsService.delete).toHaveBeenCalledWith(savedNews.id);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it.each(['ADM', 'MODERATOR'])('allows %s to load and save another author published news', roleName => {
    role.set(roleName);
    route.snapshot.paramMap = convertToParamMap({ id: '42' });
    component.ngOnInit(); fixture.detectChanges();
    expect(newsService.getById).toHaveBeenCalledWith('42'); expect(component.isAuthor()).toBe(false);
    expect(component.form.enabled).toBe(true);
    component.form.controls.summary.setValue('Resumo revisado pela administração.'); component.save();
    expect(newsService.update).toHaveBeenCalledWith(42, expect.objectContaining({ summary: 'Resumo revisado pela administração.' }));
  });
  it('allows administrators to publish a saved draft even when the personal news lookup fails', () => {
    role.set('ADM'); newsService.getById.mockReturnValueOnce(of(savedNews as any));
    newsService.getMine.mockReturnValueOnce(throwError(() => new Error('unavailable')));
    route.snapshot.paramMap = convertToParamMap({ id: '42' }); component.ngOnInit();
    expect(component.isAuthor()).toBe(false); expect(component.canPublish()).toBe(true);
    component.publish(); expect(newsService.publish).toHaveBeenCalledWith(42);
  });
  it('keeps publication and administrative controls unavailable to nonauthor STAFF', () => {
    (component as any).applyNews(savedNews); fixture.detectChanges(); component.publish();
    expect(component.canAdministerNews()).toBe(false); expect(newsService.publish).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.button--danger')).toBeNull();
  });
  it('should show feedback and allow it to be dismissed', () => {
    component.successMessage.set('Notícia salva com sucesso.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feedback-toast--success')?.textContent).toContain(
      'Notícia salva com sucesso.',
    );

    component.dismissFeedback();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feedback-viewport')).toBeNull();
  });
});
