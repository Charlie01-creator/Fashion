import type {
  ClothingItemDTO,
  ClothingListResponse,
  CreateClothingItemInput,
  UploadImageResponse,
} from "@fashion-platform/shared";
import { api, getAccessToken } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const clothingApi = {
  async listItems(category?: string): Promise<ClothingListResponse> {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const qs = params.toString();
    return api.get<ClothingListResponse>(`/clothing${qs ? `?${qs}` : ""}`);
  },

  async getItem(id: string): Promise<ClothingItemDTO> {
    return api.get<ClothingItemDTO>(`/clothing/${id}`);
  },

  async createItem(input: CreateClothingItemInput): Promise<ClothingItemDTO> {
    return api.post<ClothingItemDTO>("/clothing", input);
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/clothing/${id}`);
  },

  async reanalyze(id: string): Promise<ClothingItemDTO> {
    return api.post<ClothingItemDTO>(`/clothing/${id}/analyze`);
  },

  /**
   * Uses raw fetch (not the JSON `api` client) because this is a
   * multipart/form-data upload — we must NOT set a manual Content-Type
   * header here; the browser needs to set it (with the multipart boundary)
   * itself from the FormData object.
   */
  async uploadImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_URL}/clothing/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
      credentials: "include",
      body: formData,
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message ?? "Upload failed");
    }
    return json.data as UploadImageResponse;
  },
};
