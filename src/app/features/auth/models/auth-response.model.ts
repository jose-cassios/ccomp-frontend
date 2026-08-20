import { User } from './user.model';

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  user?: User;
}

export interface MessageResponse {
  message: string;
}
