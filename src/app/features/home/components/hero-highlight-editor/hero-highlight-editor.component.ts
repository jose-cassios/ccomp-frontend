import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
  GlobalHighlight,
  HighlightCandidate,
  HighlightSelection,
  HighlightSourceType,
} from '../../models/global-highlight.model';

interface HighlightCategory {
  type: HighlightSourceType;
  label: string;
}

@Component({
  selector: 'app-hero-highlight-editor',
  standalone: true,
  templateUrl: './hero-highlight-editor.component.html',
  styleUrl: './hero-highlight-editor.component.css',
})
export class HeroHighlightEditorComponent {
  readonly categories: readonly HighlightCategory[] = [
    { type: 'NEWS', label: 'Notícias' },
    { type: 'EVENT', label: 'Eventos' },
    { type: 'CLUB', label: 'Clubes' },
  ];
  readonly open = input(false);
  readonly loadingCategories = input<Record<HighlightSourceType, boolean>>({
    NEWS: false,
    EVENT: false,
    CLUB: false,
  });
  readonly saving = input(false);
  readonly categoryErrors = input<Partial<Record<HighlightSourceType, string>>>({});
  readonly saveError = input<string | null>(null);
  readonly candidates = input<readonly HighlightCandidate[]>([]);
  readonly selectedItems = input<readonly GlobalHighlight[]>([]);
  readonly closed = output<void>();
  readonly saved = output<HighlightSelection[]>();
  readonly categoryRequested = output<HighlightSourceType>();
  readonly activeCategory = signal<HighlightSourceType>('NEWS');
  private readonly selectedKeys = signal<ReadonlySet<string>>(new Set());

  readonly selectedCount = computed(() => this.selectedKeys().size);
  readonly visibleCandidates = computed(() => this.candidates().filter(
    (candidate) => candidate.source_type === this.activeCategory(),
  ));
  readonly loading = computed(() => this.loadingCategories()[this.activeCategory()]);
  readonly errorMessage = computed(() => this.categoryErrors()[this.activeCategory()] ?? null);
  readonly activeCategoryLabel = computed(() =>
    this.categories.find((category) => category.type === this.activeCategory())?.label ?? '',
  );
  readonly emptyMessage = computed(() => {
    switch (this.activeCategory()) {
      case 'NEWS':
        return 'Não há notícias publicadas. Rascunhos precisam ser publicados antes de aparecerem na home.';
      case 'EVENT':
        return 'Não há eventos em andamento ou futuros disponíveis para destaque.';
      case 'CLUB':
        return 'Não há clubes publicados disponíveis para destaque.';
    }
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.activeCategory.set('NEWS');
      this.selectedKeys.set(new Set(
        this.selectedItems().map((item) => this.key(item.source_type, item.source_id)),
      ));
    });
  }

  isSelected(candidate: HighlightCandidate): boolean {
    return this.selectedKeys().has(this.key(candidate.source_type, candidate.source_id));
  }

  toggle(candidate: HighlightCandidate): void {
    const key = this.key(candidate.source_type, candidate.source_id);
    const next = new Set(this.selectedKeys());
    if (next.has(key)) {
      next.delete(key);
    } else if (next.size < 8) {
      next.add(key);
    }
    this.selectedKeys.set(next);
  }

  selectCategory(sourceType: HighlightSourceType): void {
    this.activeCategory.set(sourceType);
    this.categoryRequested.emit(sourceType);
  }

  save(): void {
    const selections = Array.from(this.selectedKeys()).map<HighlightSelection>((key) => {
      const [sourceType, sourceId] = key.split(':');
      return {
        source_type: sourceType as HighlightSourceType,
        source_id: Number(sourceId),
      };
    });
    this.saved.emit(selections);
  }

  private key(sourceType: string, sourceId: number): string {
    return `${sourceType}:${sourceId}`;
  }
}
