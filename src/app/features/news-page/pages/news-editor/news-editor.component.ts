import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, switchMap, tap } from 'rxjs';
import { StorageService } from '../../../../core/storage/storage.service';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import {
  NewsPreviewComponent,
  NewsPreviewData,
} from '../../components/news-preview/news-preview.component';
import { NewsEditorUser, NewsItemType, NewsUpdatePayload } from '../../interface/news.interface';
import { NewsService } from '../../services/news.service';

type EditorOperation = 'idle' | 'loading' | 'creating' | 'saving' | 'publishing' | 'deleting';
type EditorView = 'edit' | 'preview';

interface EditorFormValue {
  title: string;
  summary: string;
  cover_image_url: string;
  featured: boolean;
  content: string;
}

const EMPTY_FORM: EditorFormValue = {
  title: '',
  summary: '',
  cover_image_url: '',
  featured: false,
  content: '',
};

@Component({
  selector: 'app-news-editor',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MarkdownEditorComponent, NewsPreviewComponent],
  templateUrl: './news-editor.component.html',
  styleUrl: './news-editor.component.css',
})
export class NewsEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly newsService = inject(NewsService);
  private readonly storageService = inject(StorageService);
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    summary: ['', [Validators.required, Validators.minLength(10)]],
    cover_image_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    featured: [false],
    content: ['', [Validators.required, Validators.minLength(20)]],
  });

  readonly news = signal<NewsItemType | null>(null);
  readonly operation = signal<EditorOperation>('idle');
  readonly activeView = signal<EditorView>('edit');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly hasUnsavedChanges = signal(false);
  readonly formValue = signal<EditorFormValue>(EMPTY_FORM);
  readonly formIsValid = signal(false);
  readonly editors = signal<NewsEditorUser[]>([]);
  readonly editorsLoading = signal(false);
  readonly uploadingCover = signal(false);
  readonly editorForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly isBusy = computed(() => this.operation() !== 'idle');
  readonly isPublished = computed(() => Boolean(this.news()?.published_at));
  readonly preview = computed<NewsPreviewData>(() => ({
    ...this.formValue(),
    published_at: this.news()?.published_at,
    updated_at: this.news()?.updated_at,
  }));
  readonly canPublish = computed(
    () =>
      Boolean(this.news()?.id) &&
      this.formIsValid() &&
      !this.hasUnsavedChanges() &&
      !this.isPublished() &&
      !this.isBusy(),
  );
  readonly operationLabel = computed(() => {
    switch (this.operation()) {
      case 'loading': return 'Carregando notícia...';
      case 'creating': return 'Criando rascunho...';
      case 'saving': return 'Salvando alterações...';
      case 'publishing': return 'Publicando notícia...';
      case 'deleting': return 'Excluindo notícia...';
      default: return '';
    }
  });
  readonly publishDisabledReason = computed(() => {
    if (this.isPublished()) return 'Esta notícia já foi publicada.';
    if (!this.news()) return 'Salve a notícia antes de publicar.';
    if (this.hasUnsavedChanges()) return 'Salve as alterações antes de publicar.';
    if (!this.formIsValid()) return 'Preencha todos os campos obrigatórios.';
    return '';
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.formValue.set(value as EditorFormValue);
      this.formIsValid.set(this.form.valid);
      this.hasUnsavedChanges.set(true);
      this.successMessage.set(null);
    });
    this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formIsValid.set(this.form.valid);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.formIsValid.set(this.form.valid);
      return;
    }

    if (!/^\d+$/.test(id)) {
      this.errorMessage.set('O identificador da notícia é inválido.');
      return;
    }

    this.loadNews(id);
  }

  save(): void {
    if (this.isBusy() || this.isPublished()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revise os campos obrigatórios antes de salvar.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    const payload: NewsUpdatePayload = this.form.getRawValue();
    const currentNews = this.news();

    if (currentNews) {
      this.updateNews(currentNews.id, payload);
      return;
    }

    this.createNews(payload);
  }

  publish(): void {
    const currentNews = this.news();
    if (!currentNews || !this.canPublish()) {
      if (this.hasUnsavedChanges()) {
        this.errorMessage.set('Salve as alterações antes de publicar para garantir que a prévia seja a versão enviada.');
      }
      return;
    }

    this.operation.set('publishing');
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.newsService.publish(currentNews.id).pipe(
      switchMap(() => this.newsService.getById(currentNews.id)),
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (publishedNews) => {
        this.applyNews(publishedNews);
        this.successMessage.set('Notícia publicada com sucesso. A versão exibida é a que foi salva e revisada.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível publicar a notícia.'));
      },
    });
  }

  deleteNews(): void {
    const currentNews = this.news();
    if (!currentNews || this.isBusy()) return;

    const itemType = this.isPublished() ? 'a notícia publicada' : 'o rascunho';
    if (typeof window !== 'undefined' && !window.confirm(`Excluir ${itemType} “${currentNews.title}”?`)) {
      return;
    }

    this.operation.set('deleting');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.newsService.delete(currentNews.id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: () => {
        this.hasUnsavedChanges.set(false);
        void this.router.navigate(['/noticias']);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível excluir a notícia.'));
      },
    });
  }

  setView(view: EditorView): void {
    this.activeView.set(view);
  }

  dismissFeedback(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  updateContent(content: string): void {
    this.form.controls.content.setValue(content);
    this.form.controls.content.markAsTouched();
  }

  uploadCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploadingCover() || this.isPublished()) return;
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selecione um arquivo de imagem válido.');
      input.value = '';
      return;
    }

    this.uploadingCover.set(true);
    this.errorMessage.set(null);
    this.storageService.upload(file).pipe(
      finalize(() => {
        this.uploadingCover.set(false);
        input.value = '';
      }),
    ).subscribe({
      next: (response) => {
        this.form.controls.cover_image_url.setValue(response.url);
        this.form.controls.cover_image_url.markAsTouched();
        this.successMessage.set('Imagem enviada. Salve a notícia para aplicar a nova capa.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível enviar a imagem.'));
      },
    });
  }

  addEditor(): void {
    const currentNews = this.news();
    if (!currentNews || this.editorForm.invalid || this.editorsLoading()) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const email = this.editorForm.controls.email.value.trim();
    this.editorsLoading.set(true);
    this.errorMessage.set(null);
    this.newsService.addEditor(currentNews.id, email).pipe(
      switchMap(() => this.newsService.getEditors(currentNews.id)),
      finalize(() => this.editorsLoading.set(false)),
    ).subscribe({
      next: (editors) => {
        this.editors.set(editors);
        this.editorForm.reset();
        this.successMessage.set('Editor adicionado à notícia.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível adicionar o editor.'));
      },
    });
  }

  removeEditor(editor: NewsEditorUser): void {
    const currentNews = this.news();
    if (!currentNews || this.editorsLoading()) return;

    this.editorsLoading.set(true);
    this.errorMessage.set(null);
    this.newsService.removeEditor(currentNews.id, editor.email_address).pipe(
      finalize(() => this.editorsLoading.set(false)),
    ).subscribe({
      next: () => {
        this.editors.update((editors) => editors.filter((item) => item.id !== editor.id));
        this.successMessage.set('Editor removido da notícia.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível remover o editor.'));
      },
    });
  }

  canDeactivate(): boolean {
    if (!this.hasUnsavedChanges() || typeof window === 'undefined') {
      return true;
    }
    return window.confirm('Há alterações não salvas. Deseja sair mesmo assim?');
  }

  @HostListener('window:beforeunload', ['$event'])
  preventUnsavedUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  private loadNews(id: string): void {
    this.operation.set('loading');
    this.newsService.getById(id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (news) => {
        this.applyNews(news);
        this.loadEditors(news.id);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível carregar a notícia para edição.'));
      },
    });
  }

  private createNews(payload: NewsUpdatePayload): void {
    this.operation.set('creating');
    this.newsService.create().pipe(
      tap((createdNews) => {
        this.news.set(createdNews);
        this.location.replaceState(`/noticias/${createdNews.id}/editar`);
      }),
      switchMap((createdNews) => this.newsService.update(createdNews.id, payload)),
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (savedNews) => this.handleSaveSuccess(savedNews, 'Rascunho criado e salvo com sucesso.'),
      error: (error: unknown) => {
        const id = this.news()?.id;
        const fallback = id
          ? `O rascunho #${id} foi criado, mas não foi possível salvar o conteúdo. Tente salvar novamente.`
          : 'Não foi possível criar a notícia.';
        this.errorMessage.set(this.getErrorMessage(error, fallback));
      },
    });
  }

  private updateNews(id: number, payload: NewsUpdatePayload): void {
    this.operation.set('saving');
    this.newsService.update(id, payload).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (savedNews) => this.handleSaveSuccess(savedNews, 'Alterações salvas com sucesso.'),
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível salvar as alterações.'));
      },
    });
  }

  private handleSaveSuccess(news: NewsItemType, message: string): void {
    this.applyNews(news);
    this.successMessage.set(message);
  }

  private applyNews(news: NewsItemType): void {
    const value: EditorFormValue = {
      title: news.title ?? '',
      summary: news.summary ?? '',
      cover_image_url: news.cover_image_url ?? '',
      featured: news.featured ?? false,
      content: news.content ?? '',
    };

    this.news.set(news);
    this.form.reset(value, { emitEvent: false });
    this.formValue.set(value);
    this.formIsValid.set(this.form.valid);
    this.hasUnsavedChanges.set(false);
    if (news.published_at) {
      this.form.disable({ emitEvent: false });
    }
  }

  private loadEditors(newsId: number): void {
    this.editorsLoading.set(true);
    this.newsService.getEditors(newsId).pipe(
      finalize(() => this.editorsLoading.set(false)),
    ).subscribe({
      next: (editors) => this.editors.set(editors),
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível carregar os editores da notícia.'));
      },
    });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message ?? error.error?.detail ?? error.error?.response;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      if (error.status === 403) {
        return 'Você não tem permissão para alterar esta notícia.';
      }
      if (error.status === 404) {
        return 'A notícia solicitada não foi encontrada.';
      }
    }
    return fallback;
  }
}
