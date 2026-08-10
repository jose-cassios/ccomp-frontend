import { Component, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NewsService } from '../../services/news.service';

@Component({
  selector: 'app-news-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './news-modal.component.html',
  styleUrl: './news-modal.component.css'
})
export class NewsModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly close = output<void>();
  readonly save = output<any>();

  newsForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private newsService: NewsService
  ) {
    this.newsForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      summary: ['', [Validators.required, Validators.minLength(10)]],
      coverImageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      autorId: ['', [Validators.required]],
      content: ['', [Validators.required, Validators.minLength(20)]],
      featured: [false]
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    if (this.newsForm.valid) {
      this.isSubmitting = true;
      this.newsService.createNewsTemplate().subscribe({
        next: (response) => {
          const newsData = {
            ...this.newsForm.value,
            ...(response ?? {}),
            id: response?.id ?? Date.now().toString(),
            slug: response?.slug ?? this.generateSlug(this.newsForm.value.title),
            publishedAt: response?.publishedAt ?? new Date(),
            updatedAt: response?.updatedAt ?? new Date()
          };
          this.save.emit(newsData);
          console.log('Notícia criada com sucesso', newsData);
          this.newsForm.reset();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Erro ao criar notícia', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  get title() {
    return this.newsForm.get('title');
  }

  get summary() {
    return this.newsForm.get('summary');
  }

  get coverImageUrl() {
    return this.newsForm.get('coverImageUrl');
  }

  get autorId() {
    return this.newsForm.get('autorId');
  }

  get content() {
    return this.newsForm.get('content');
  }
}
