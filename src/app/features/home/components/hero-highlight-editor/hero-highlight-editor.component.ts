import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
  GlobalHighlight,
  HighlightCandidate,
  HighlightSelection,
} from '../../models/global-highlight.model';

@Component({
  selector: 'app-hero-highlight-editor',
  standalone: true,
  templateUrl: './hero-highlight-editor.component.html',
  styleUrl: './hero-highlight-editor.component.css',
})
export class HeroHighlightEditorComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly saving = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly candidates = input<readonly HighlightCandidate[]>([]);
  readonly selectedItems = input<readonly GlobalHighlight[]>([]);
  readonly closed = output<void>();
  readonly saved = output<HighlightSelection[]>();
  private readonly selectedKeys = signal<ReadonlySet<string>>(new Set());

  readonly selectedCount = computed(() => this.selectedKeys().size);

  constructor() {
    effect(() => {
      if (!this.open()) return;
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

  save(): void {
    const selections = this.candidates()
      .filter((candidate) => this.isSelected(candidate))
      .map<HighlightSelection>((candidate) => ({
        source_type: candidate.source_type,
        source_id: candidate.source_id,
      }));
    this.saved.emit(selections);
  }

  private key(sourceType: string, sourceId: number): string {
    return `${sourceType}:${sourceId}`;
  }
}
