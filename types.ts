
export type TabType = 'image' | 'video';

export interface PromptParts {
  subject_main: string;
  background_context: string;
  camera_angle: string;
  composition_layout: string;
  mood_atmosphere: string;
  art_style: string;
}

export interface VideoPromptParts {
  subject_actor: string;
  environment_setting: string;
  camera_motion: string;
  action_event: string;
  mood_vibe: string;
  visual_style: string;
}

export type AspectRatio = '21:9' | '16:9' | '4:3' | '3:2' | '1:1' | '2:3' | '3:4' | '9:16' | '9:21';
export type Resolution = '1K' | '2K' | '4K';

export interface GenerationResult {
  type: TabType;
  url: string;
  prompt: string;
  model: string;
  duration: number; // in seconds
  timestamp: number;
}
