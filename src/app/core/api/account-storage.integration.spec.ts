import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../features/auth/services/auth.service';
import { AUTH_CONFIG } from '../../features/auth/config/auth.config';
import { StorageService } from '../storage/storage.service';

describe('Profile and storage API contracts', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  it('updates only the supported profile field and refreshes the header state', () => {
    auth.updateProfile(' Ana ').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/users'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({name: 'Ana'});
    req.flush({id: 'u', name: 'Ana', email_address: 'a@example.com'});
    expect(auth.getCurrentUser()?.name).toBe('Ana');
    expect(JSON.parse(localStorage.getItem(AUTH_CONFIG.USER_KEY)!)).toMatchObject({name: 'Ana'});
  });

  it('clears the session only when deactivation succeeds', () => {
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, 'saved-token');
    auth.deactivateAccount().subscribe({error: () => undefined});
    http.expectOne(r => r.url.endsWith('/users')).flush({}, {status: 500, statusText: 'Error'});
    expect(auth.getToken()).toBe('saved-token');
    auth.deactivateAccount().subscribe();
    const req = http.expectOne(r => r.url.endsWith('/users'));
    expect(req.request.method).toBe('DELETE'); req.flush({response: 'Desativada'});
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticatedValue).toBe(false);
  });

  it('downloads binary data and deletes using encoded exact filenames', () => {
    const storage = TestBed.inject(StorageService);
    storage.download('foto teste.png').subscribe();
    const download = http.expectOne(r => r.url.endsWith('/storage/foto%20teste.png'));
    expect(download.request.responseType).toBe('blob');
    download.flush(new Blob(['image']));
    storage.delete('foto teste.png').subscribe();
    const remove = http.expectOne(r => r.url.endsWith('/storage/foto%20teste.png'));
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, {status: 204, statusText: 'No Content'});
  });
});
