import { InstructorRosterDraftService } from './instructor-roster-draft.service';

describe('InstructorRosterDraftService', () => {
  beforeEach(() => sessionStorage.clear());

  it('restores preparation after reload and isolates users and events', () => {
    const rows = [{ name: 'Ana', email: 'ana@ifma.edu.br' }];
    expect(new InstructorRosterDraftService().save(14, 'owner', rows)).toBe(true);
    const restored = new InstructorRosterDraftService();
    expect(restored.read(14, 'owner')).toEqual(rows);
    expect(restored.read(15, 'owner')).toEqual([]);
    expect(restored.read(14, 'another-editor')).toEqual([]);
  });

  it('retains in-memory preparation when storage is unavailable', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    try {
      const service = new InstructorRosterDraftService();
      const rows = [{ name: '', email: 'ana@ifma.edu.br' }];
      expect(service.save(14, 'owner', rows)).toBe(false);
      expect(service.read(14, 'owner')).toEqual(rows);
    } finally { storage.mockRestore(); }
  });
});
