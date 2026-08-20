import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../api/api.service';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const api = {
    post: vi.fn((_endpoint: string, _body: unknown) =>
      of({ url: 'https://files.example/capa.png', file_name: 'capa.png' }),
    ),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [StorageService, { provide: ApiService, useValue: api }],
    });
  });

  it('should upload a file as multipart form data', () => {
    const service = TestBed.inject(StorageService);
    const file = new File(['image'], 'capa.png', { type: 'image/png' });

    service.upload(file).subscribe();

    expect(api.post).toHaveBeenCalledWith('/storage/upload', expect.any(FormData));
    const formData = api.post.mock.calls[0]?.[1] as FormData;
    expect(formData.get('file')).toBe(file);
  });
});
