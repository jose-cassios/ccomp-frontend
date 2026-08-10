import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NewsService } from './news.service';
import { ApiConfig } from '../../../core/api/api.config';
import { environment } from '../../../../environments/environment';

describe('NewsService', () => {
  let service: NewsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiConfig],
    });

    service = TestBed.inject(NewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a news template via POST /news/create', () => {
    const mockResponse = { id: '123', title: 'Nova notícia' };

    service.createNewsTemplate().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/news/create`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(mockResponse);
  });
});
