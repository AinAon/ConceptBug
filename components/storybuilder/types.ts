import { AspectRatio } from "../../types";

export type StoryModel =
  | "gemini-3.1-flash-image-preview"
  | "gemini-3-pro-image-preview"
  | "gemini-2.5-flash-image";

export interface StoryItem {
  id: string;
  cutNumber: number;
  context: string;
  imageUrl?: string;
  referenceImages: string[];
  isGenerating: boolean;
}

export type StoryRatio = Extract<AspectRatio, "16:9" | "4:3" | "1:1" | "3:4" | "9:16">;
