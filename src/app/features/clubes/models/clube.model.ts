export interface Club {
  id: number;
  name: string;
  summary: string | null;
  cover_image_url: string | null;
  content: string | null;
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

export interface ClubPage {
  content: Club[];
  next_cursor: string | null;
  previous_cursor: string | null;
}

export interface CreateClubPayload {
  name: string;
  summary: string;
}

export interface UpdateClubPayload {
  name?: string;
  summary?: string;
  cover_image_url?: string;
  published_at?: string;
  content?: string;
}

export type ClubMemberRole = 'INSTRUCTOR' | 'MEMBER';
export type ClubMemberStatus = 'ACTIVE' | 'INACTIVE';

export interface ClubMemberFilter {
  role?: ClubMemberRole;
  status?: ClubMemberStatus;
}

export interface ClubMemberUser {
  id: string;
  name: string;
  email_address: string;
  status_account: 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED';
  role: 'ADMIN' | 'STAFF' | 'USER';
  active: boolean;
  admin: boolean;
  team_member: boolean;
}

export interface ClubMemberListItem {
  id: number;
  club_id: number;
  user: ClubMemberUser;
  role: ClubMemberRole;
  status: ClubMemberStatus;
  joined_at: string;
  left_at: string | null;
}

export interface ClubMemberPage {
  content: ClubMemberListItem[];
  next_cursor: string | null;
  previous_cursor: string | null;
}

export interface ClubMembership {
  id: number;
  club_id: number;
  user_id: string;
  role: ClubMemberRole;
  status: ClubMemberStatus;
  joined_at: string;
  left_at: string | null;
  still_linked: boolean;
}
