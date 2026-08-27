import type {
  GenerateOutfitRequest,
  GenerateOutfitResponse,
  OutfitDTO,
  OutfitFeedbackAction,
  OutfitListResponse,
} from "@fashion-platform/shared";
import { api } from "./api";

export const outfitApi = {
  async generate(request: GenerateOutfitRequest): Promise<GenerateOutfitResponse> {
    return api.post<GenerateOutfitResponse>("/outfits/generate", request);
  },

  async listOutfits(page = 1, limit = 12): Promise<OutfitListResponse> {
    return api.get<OutfitListResponse>(`/outfits?page=${page}&limit=${limit}`);
  },

  async getOutfit(id: string): Promise<OutfitDTO> {
    return api.get<OutfitDTO>(`/outfits/${id}`);
  },

  async deleteOutfit(id: string): Promise<void> {
    await api.delete(`/outfits/${id}`);
  },

  async submitFeedback(id: string, action: OutfitFeedbackAction): Promise<OutfitDTO> {
    return api.post<OutfitDTO>(`/outfits/${id}/feedback`, { action });
  },
};
