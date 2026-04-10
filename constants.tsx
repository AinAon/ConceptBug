
import { AspectRatio } from './types';

export const ASPECT_RATIOS: AspectRatio[] = [
  '21:9', '16:9', '3:2',
  '4:3', '1:1', '3:4',
  '2:3', '9:16', '9:21'
];

export const RESOLUTIONS = ['1K', '2K', '4K'] as const;

export const MODELS = [
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (HQ)' },
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast' }
];
