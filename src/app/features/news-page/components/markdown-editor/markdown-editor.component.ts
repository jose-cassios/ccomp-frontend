import { Component, ElementRef, ViewChild, input, output } from '@angular/core';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.css',
})
export class MarkdownEditorComponent {
  @ViewChild('editor') private editor?: ElementRef<HTMLTextAreaElement>;

  readonly content = input('');
  readonly disabled = input(false);
  readonly contentChange = output<string>();

  onInput(event: Event): void {
    this.contentChange.emit((event.target as HTMLTextAreaElement).value);
  }

  format(prefix: string, suffix = prefix, placeholder = 'texto'): void {
    const textarea = this.editor?.nativeElement;
    if (!textarea || this.disabled()) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || placeholder;
    const nextValue = `${textarea.value.slice(0, start)}${prefix}${selected}${suffix}${textarea.value.slice(end)}`;
    this.contentChange.emit(nextValue);

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  prefixLines(prefix: string): void {
    const textarea = this.editor?.nativeElement;
    if (!textarea || this.disabled()) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || 'item';
    const formatted = selected.split('\n').map((line) => `${prefix}${line}`).join('\n');
    const nextValue = `${textarea.value.slice(0, start)}${formatted}${textarea.value.slice(end)}`;
    this.contentChange.emit(nextValue);
    queueMicrotask(() => textarea.focus());
  }
}
