/**
 * Public-safe representation of a User.
 * NEVER include passwordHash or other sensitive fields here —
 * this type is the contract sent to the client.
 */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileDTO {
  id: string;
  userId: string;
  stylePreferences: string[];
  favouriteColors: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  stylePreferences?: string[];
  favouriteColors?: string[];
}

export interface AuthTokens {
  accessToken: string;
  /** Refresh token is delivered via httpOnly cookie, never in the JSON body in production. */
  refreshToken?: string;
}

export interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}
