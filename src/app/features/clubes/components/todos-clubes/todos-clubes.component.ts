import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, input, output } from '@angular/core';
import { Club } from '../../models/clube.model';

@Component({
  selector: 'app-todos-clubes',
  imports: [CommonModule],
  templateUrl: './todos-clubes.component.html',
  styleUrl: './todos-clubes.component.css',
})
export class TodosClubesComponent {
  @ViewChild('sortWrapper') sortWrapper?: ElementRef<HTMLElement>;

  readonly clubs = input<readonly Club[]>([]);
  readonly loading = input(false);
  readonly loadingMore = input(false);
  readonly error = input<string | null>(null);
  readonly hasMore = input(false);
  readonly selected = output<Club>();
  readonly enroll = output<Club>();
  readonly loadMore = output<void>();

  sort = 'Recentes';
  sortMenuOpen = false;
  readonly sortOptions = ['Recentes', 'A-Z', 'Z-A'];

  get sortedClubs(): Club[] {
    const clubs = [...this.clubs()];
    if (this.sort === 'A-Z') return clubs.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (this.sort === 'Z-A') return clubs.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
    return clubs.sort((a, b) => this.timestamp(b) - this.timestamp(a));
  }

  @HostListener('document:click', ['$event.target'])
  closeSortWhenClickingOutside(target: EventTarget | null): void {
    if (this.sortMenuOpen && !this.sortWrapper?.nativeElement.contains(target as Node)) {
      this.sortMenuOpen = false;
    }
  }

  selectSort(option: string): void {
    this.sort = option;
    this.sortMenuOpen = false;
  }

  private timestamp(club: Club): number {
    return new Date(club.published_at ?? club.updated_at ?? club.created_at).getTime();
  }
}
