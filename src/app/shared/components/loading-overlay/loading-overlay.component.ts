import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/loading/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.css',
})
export class LoadingOverlayComponent {
  protected readonly loadingService = inject(LoadingService);
}
