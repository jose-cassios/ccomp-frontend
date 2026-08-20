import { ADMINISTRATION_ROLES, NEWS_MANAGEMENT_ROLES } from './auth.config';

describe('role access configuration', () => {
  it('restricts administration to administrators', () => {
    expect(ADMINISTRATION_ROLES).toEqual(['ADM']);
  });

  it('allows administrators and moderators to manage news', () => {
    expect(NEWS_MANAGEMENT_ROLES).toEqual(['ADM', 'MODERATOR']);
  });
});
