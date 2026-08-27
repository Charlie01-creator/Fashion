import type {
  StyleProfileDTO,
  UpdateFashionPreferenceRequest,
  UserFashionPreferenceDTO,
} from "@fashion-platform/shared";
import { api } from "./api";

export const styleApi = {
  async generateProfile(): Promise<StyleProfileDTO> {
    return api.post<StyleProfileDTO>("/style-profile/generate");
  },

  async getProfile(): Promise<StyleProfileDTO> {
    return api.get<StyleProfileDTO>("/style-profile");
  },

  async getPreferences(): Promise<UserFashionPreferenceDTO | null> {
    return api.get<UserFashionPreferenceDTO | null>("/style-profile/preferences");
  },

  async updatePreferences(input: UpdateFashionPreferenceRequest): Promise<UserFashionPreferenceDTO> {
    return api.patch<UserFashionPreferenceDTO>("/style-profile/preferences", input);
  },
};
