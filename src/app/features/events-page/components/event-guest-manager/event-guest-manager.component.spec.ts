import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EventGuestManagerComponent } from './event-guest-manager.component';
import { EventGuestsService, EventGuest } from '../../services/event-guests.service';
import { AuthService } from '../../../auth/services/auth.service';

describe('Guest registration workflow', () => {
  const guest: EventGuest = { id: 7, name: 'Guest', user_id: '', status: 'CONFIRMED', visibility: 'PUBLIC' };
  let component: EventGuestManagerComponent;
  let fixture: ComponentFixture<EventGuestManagerComponent>;
  const service = {
    allGuests: vi.fn(() => of([guest])),
    guests: vi.fn(() => of({ content: [guest], next_cursor: null })),
    create: vi.fn(() => of({ message: 'Created' })), profile: vi.fn(() => of({})),
    uploadImage: vi.fn(() => of({})), associate: vi.fn(() => of(void 0)),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: EventGuestsService, useValue: service },
      { provide: AuthService, useValue: { hasAnyRole: () => true } },
    ] });
    fixture = TestBed.createComponent(EventGuestManagerComponent);
    fixture.componentRef.setInput('eventId', 1); fixture.componentRef.setInput('activityId', 3);
    fixture.detectChanges(); component = fixture.componentInstance;
  });
  afterEach(() => vi.restoreAllMocks());
  it('does not infer a new guest ID from the create message or associate another profile', () => {
    component.form.setValue({ name: 'Guest', description: 'Speaker' }); component.save();
    expect(service.create).toHaveBeenCalledWith(1, { name: 'Guest', description: 'Speaker' });
    expect(component.selected()).toBeNull(); expect(service.associate).not.toHaveBeenCalled();
    expect(service.uploadImage).not.toHaveBeenCalled();
    component.choose(7); component.role.setValue('SPECIAL_GUEST'); component.associate();
    expect(service.associate).toHaveBeenCalledWith(1, 7, 3, 'SPECIAL_GUEST');
  });
  it('keeps the selected local photo on failure and retries only its upload', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    component.choose(7);
    const file = new File(['image'], 'guest.png', { type: 'image/png' });
    component.selectPhoto({ target: { files: [file], value: '' } } as unknown as Event);
    service.uploadImage.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.upload();
    expect(component.file()).toBe(file); expect(component.busy()).toBe(false);
    component.upload();
    expect(service.uploadImage).toHaveBeenLastCalledWith(1, 7, file);
    expect(component.file()).toBeNull(); expect(revoke).toHaveBeenCalledWith('blob:preview');
    expect(service.create).not.toHaveBeenCalled();
  });
  it('opens a single form for name, description and photo through New guest, without a profile selector', () => {
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeNull();
    const button = fixture.nativeElement.querySelector('.list-heading button') as HTMLButtonElement;
    button.click(); fixture.detectChanges();
    expect(component.editing()).toBe(true);
    expect(fixture.nativeElement.querySelector('input[type="file"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Atualizar lista');
  });

  it('preserves the photo and asks for confirmation when the backend creates without returning an ID', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const created = { ...guest, id: 8, description: 'Speaker' };
    service.allGuests.mockReturnValueOnce(of([guest])).mockReturnValueOnce(of([guest, created]));
    component.newGuest();
    component.form.setValue({ name: 'Guest', description: 'Speaker' });
    const file = new File(['image'], 'guest.png', { type: 'image/png' });
    component.selectPhoto({ target: { files: [file], value: '' } } as unknown as Event);
    component.save();
    expect(component.photoCandidates()).toEqual([created]);
    expect(component.file()).toBe(file);
    expect(component.selected()).toBeNull();
    expect(service.uploadImage).not.toHaveBeenCalled();
    component.save(); // Repeated clicks must not create another profile.
    expect(service.create).toHaveBeenCalledTimes(1);
    service.uploadImage.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.confirmPhoto(created);
    expect(component.selected()?.id).toBe(8);
    expect(component.file()).toBe(file);
    expect(component.error()).toContain('perfil já foi salvo');
    component.save();
    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.profile).not.toHaveBeenCalled();
    expect(service.uploadImage).toHaveBeenLastCalledWith(1, 8, file);
    expect(component.editing()).toBe(false);
    expect(component.file()).toBeNull();
  });

  it('uploads immediately when creation returns its authoritative ID', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    service.create.mockReturnValueOnce(of({ message: 'Created', id: 9 }));
    component.newGuest(); component.form.setValue({ name: 'Guest', description: 'Speaker' });
    const file = new File(['image'], 'guest.png', { type: 'image/png' });
    component.selectPhoto({ target: { files: [file], value: '' } } as unknown as Event);
    component.save();
    expect(service.uploadImage).toHaveBeenCalledWith(1, 9, file);
    expect(component.pendingPhoto()).toBeNull();
    expect(component.editing()).toBe(false);
  });

  it('rejects unsupported files and never starts an upload', () => {
    component.choose(7);
    component.selectPhoto({ target: { files: [new File(['svg'], 'x.svg', { type: 'image/svg+xml' })], value: '' } } as unknown as Event);
    expect(component.error()).toContain('PNG'); expect(component.file()).toBeNull();
    expect(service.uploadImage).not.toHaveBeenCalled();
  });
});
