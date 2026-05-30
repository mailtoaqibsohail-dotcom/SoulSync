import { CLIENTS } from "./clients-data";

export const ASSET_FOLDERS = [
  "All Assets",
  "Logos & Branding",
  "Product Photos",
  "Lifestyle Photos",
  "Video Clips",
  "Templates",
  "Stock",
  "Archived",
] as const;
export type AssetFolder = (typeof ASSET_FOLDERS)[number];

export type AssetFileType = "image" | "video" | "vector" | "pdf";

export interface AssetRecord {
  id: string;
  client_id: string;
  filename: string;
  folder: Exclude<AssetFolder, "All Assets">;
  file_type: AssetFileType;
  size_bytes: number;
  tags: string[];
  description?: string;
  uploaded_at: string;
  /** Tone used for the placeholder thumbnail tile. */
  thumb_color: string;
}

function iso(daysAgo: number, hoursAgo: number = 0): string {
  const now = new Date();
  return new Date(
    now.getTime() - daysAgo * 86400 * 1000 - hoursAgo * 3600 * 1000
  ).toISOString();
}

// Sample assets seeded for the three liveliest clients. Mirrors the
// shape of the spec's `assets` table so swapping in Supabase is a
// straight column rename.
export const ASSETS: AssetRecord[] = [
  // Acme Solar -----------------------------------------------------------
  { id: "a1",  client_id: CLIENTS[0].id, filename: "logo-primary.svg",            folder: "Logos & Branding", file_type: "vector", size_bytes:  18_400, tags: ["logo", "primary"],          uploaded_at: iso(0, 2),  thumb_color: CLIENTS[0].brand_color },
  { id: "a2",  client_id: CLIENTS[0].id, filename: "logo-monochrome.svg",         folder: "Logos & Branding", file_type: "vector", size_bytes:  16_200, tags: ["logo", "mono"],             uploaded_at: iso(0, 3),  thumb_color: "#111827" },
  { id: "a3",  client_id: CLIENTS[0].id, filename: "panel-install-day.jpg",       folder: "Product Photos",   file_type: "image",  size_bytes: 1_840_000, tags: ["installs", "roof"],         uploaded_at: iso(2),     thumb_color: "#16A34A" },
  { id: "a4",  client_id: CLIENTS[0].id, filename: "family-yard-az.jpg",          folder: "Lifestyle Photos", file_type: "image",  size_bytes: 2_100_000, tags: ["family", "outdoors"],       uploaded_at: iso(4),     thumb_color: "#FBBF24" },
  { id: "a5",  client_id: CLIENTS[0].id, filename: "drone-flyover.mp4",           folder: "Video Clips",      file_type: "video",  size_bytes: 38_500_000, tags: ["drone", "flyover"],         uploaded_at: iso(5),     thumb_color: "#0EA5E9" },
  { id: "a6",  client_id: CLIENTS[0].id, filename: "ig-carousel-template.psd",    folder: "Templates",        file_type: "image",  size_bytes: 5_200_000, tags: ["carousel", "template"],     uploaded_at: iso(6),     thumb_color: "#7C3AED" },
  { id: "a7",  client_id: CLIENTS[0].id, filename: "az-credit-explainer.pdf",     folder: "Templates",        file_type: "pdf",    size_bytes:   420_000, tags: ["tax", "explainer"],         uploaded_at: iso(7),     thumb_color: "#DC2626" },
  { id: "a8",  client_id: CLIENTS[0].id, filename: "stock-sunset-rooftop.jpg",    folder: "Stock",            file_type: "image",  size_bytes: 1_240_000, tags: ["sunset", "stock"],          uploaded_at: iso(9),     thumb_color: "#F472B6" },
  { id: "a9",  client_id: CLIENTS[0].id, filename: "old-cover.png",               folder: "Archived",         file_type: "image",  size_bytes:   612_000, tags: ["old"],                      uploaded_at: iso(30),    thumb_color: "#64748B" },

  // Luvelie Beauty ------------------------------------------------------
  { id: "a10", client_id: CLIENTS[2].id, filename: "logo-pink.svg",               folder: "Logos & Branding", file_type: "vector", size_bytes:  12_900, tags: ["logo"],                     uploaded_at: iso(1),     thumb_color: "#EC4899" },
  { id: "a11", client_id: CLIENTS[2].id, filename: "serum-hero.jpg",              folder: "Product Photos",   file_type: "image",  size_bytes: 1_530_000, tags: ["product", "serum"],         uploaded_at: iso(1, 4),  thumb_color: "#F9A8D4" },
  { id: "a12", client_id: CLIENTS[2].id, filename: "model-morning-routine.jpg",   folder: "Lifestyle Photos", file_type: "image",  size_bytes: 1_980_000, tags: ["routine", "model"],         uploaded_at: iso(3),     thumb_color: "#FB7185" },
  { id: "a13", client_id: CLIENTS[2].id, filename: "reel-bts-clip.mov",           folder: "Video Clips",      file_type: "video",  size_bytes: 24_100_000, tags: ["bts", "reel"],              uploaded_at: iso(5, 2),  thumb_color: "#FACC15" },
  { id: "a14", client_id: CLIENTS[2].id, filename: "ig-story-template.psd",       folder: "Templates",        file_type: "image",  size_bytes: 3_800_000, tags: ["story", "template"],        uploaded_at: iso(8),     thumb_color: "#A855F7" },

  // Benny Co. -----------------------------------------------------------
  { id: "a15", client_id: CLIENTS[3].id, filename: "logo-blue.svg",               folder: "Logos & Branding", file_type: "vector", size_bytes:  14_200, tags: ["logo"],                     uploaded_at: iso(2, 1),  thumb_color: "#0EA5E9" },
  { id: "a16", client_id: CLIENTS[3].id, filename: "dashboard-hero.png",          folder: "Product Photos",   file_type: "image",  size_bytes: 1_100_000, tags: ["product", "dashboard"],     uploaded_at: iso(3, 4),  thumb_color: "#0284C7" },
  { id: "a17", client_id: CLIENTS[3].id, filename: "team-offsite.jpg",            folder: "Lifestyle Photos", file_type: "image",  size_bytes: 2_400_000, tags: ["team"],                     uploaded_at: iso(6, 3),  thumb_color: "#22D3EE" },
  { id: "a18", client_id: CLIENTS[3].id, filename: "founder-q-a.mp4",             folder: "Video Clips",      file_type: "video",  size_bytes: 56_300_000, tags: ["founder", "qa"],            uploaded_at: iso(10),    thumb_color: "#1D4ED8" },
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
