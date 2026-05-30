import type { PlatformKey } from "./clients-data";

export const TONES = [
  "Friendly",
  "Professional",
  "Bold",
  "Inspirational",
  "Educational",
  "Funny",
] as const;
export type Tone = (typeof TONES)[number];

export const GOALS = [
  "Build awareness",
  "Drive engagement",
  "Educate",
  "Sell",
  "Build community",
] as const;
export type Goal = (typeof GOALS)[number];

export interface CaptionRequest {
  client_id: string;
  platform: PlatformKey;
  topic: string;
  tone: Tone;
  goal: Goal;
  cta?: string;
  variations: number;
}

export interface Caption {
  text: string;
  char_count: number;
}

export type CaptionResult =
  | { ok: true; captions: Caption[]; source: "anthropic" | "fallback" }
  | { ok: false; error: string };
