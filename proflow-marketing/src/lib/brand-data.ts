import { CLIENTS } from "./clients-data";

export interface VisualIdentity {
  colors: Array<{ name: string; hex: string }>;
  logos: string[]; // filenames
  fonts: string[];
}

export interface HashtagSets {
  branded: string[];
  niche: string[];
  broad: string[];
}

export interface BrandGuideline {
  client_id: string;
  about: string;
  target_audience: string;
  voice_words_use: string[];
  voice_words_avoid: string[];
  visual_identity: VisualIdentity;
  content_pillars: string[];
  dos: string[];
  donts: string[];
  hashtag_sets: HashtagSets;
  competitors: Array<{ name: string; handle?: string; link?: string }>;
  key_links: Array<{ label: string; url: string }>;
  updated_at: string;
}

const NOW = new Date().toISOString();

export const BRAND_GUIDELINES: Record<string, BrandGuideline> = {
  [CLIENTS[0].id]: {
    client_id: CLIENTS[0].id,
    about:
      "Acme Solar installs residential rooftop solar across Arizona, Nevada, and New Mexico. Founded in 2017, focused on homeowners who want to lower their electric bill without dealing with sales-y reps.",
    target_audience:
      "Homeowners aged 35-65 in AZ, NV, NM. Median household income $90k+. Highly price-conscious, skeptical of pushy sales, value clear explainers and real local references.",
    voice_words_use: [
      "plainspoken",
      "neighborly",
      "transparent",
      "show your work",
      "no jargon",
    ],
    voice_words_avoid: [
      "salesy",
      "synergy",
      "limited-time-only",
      "act fast",
      "exclusive deal",
    ],
    visual_identity: {
      colors: [
        { name: "Brand green", hex: "#16A34A" },
        { name: "Sky blue", hex: "#0EA5E9" },
        { name: "Warm sand", hex: "#FBBF24" },
        { name: "Ink", hex: "#0F172A" },
      ],
      logos: ["logo-primary.svg", "logo-monochrome.svg"],
      fonts: ["Inter (display + body)"],
    },
    content_pillars: [
      "Real install stories with named homeowners",
      "Tax credit and rebate explainers",
      "Energy bill comparisons before/after",
      "Behind-the-scenes installer day-in-the-life",
    ],
    dos: [
      "Show local AZ/NV/NM landmarks in B-roll",
      "Quote real homeowner savings",
      "Use the calm narrator voice on reels",
      "Show installers in branded gear",
    ],
    donts: [
      "Don't promise specific dollar savings without disclaimers",
      "Don't use scarcity language",
      "Don't show rooftops without homeowner sign-off",
    ],
    hashtag_sets: {
      branded: ["#AcmeSolar", "#PoweredByAcme"],
      niche: ["#AZSolar", "#NMSolar", "#ResidentialSolar", "#RooftopSolar"],
      broad: ["#SolarEnergy", "#RenewableEnergy", "#GreenHome"],
    },
    competitors: [
      { name: "Sunlit Energy", handle: "@sunlitenergy" },
      { name: "Cactus Power", handle: "@cactuspower" },
      { name: "PaloVerde Solar", handle: "@paloverde_solar" },
    ],
    key_links: [
      { label: "Website", url: "https://acmesolar.example" },
      { label: "Get a quote", url: "https://acmesolar.example/quote" },
      { label: "Link in bio", url: "https://acmesolar.example/links" },
    ],
    updated_at: NOW,
  },

  [CLIENTS[2].id]: {
    client_id: CLIENTS[2].id,
    about:
      "Luvelie Beauty makes minimalist skincare for sensitive, mid-20s to mid-30s women. Vegan, fragrance-free, ingredient-led storytelling.",
    target_audience:
      "Women 24-36 in US/UK/AU urban centers. Beauty-fluent, fragrance-sensitive, value ingredient transparency over influencer hype.",
    voice_words_use: ["warm", "honest", "ingredient-led", "calm", "playful"],
    voice_words_avoid: ["miracle", "anti-aging", "cure", "hype", "perfect skin"],
    visual_identity: {
      colors: [
        { name: "Petal", hex: "#EC4899" },
        { name: "Bone", hex: "#F5F5F4" },
        { name: "Olive", hex: "#65A30D" },
      ],
      logos: ["logo-pink.svg"],
      fonts: ["GT Sectra (display)", "Inter (body)"],
    },
    content_pillars: [
      "Routine education and order-of-operations",
      "Ingredient deep dives",
      "Real before/afters with ethics disclaimers",
      "Founder POV and product development",
    ],
    dos: [
      "Show diverse skin types",
      "Use natural lighting",
      "Caption with ingredient %",
      "Credit research",
    ],
    donts: [
      "Don't claim 'cure' or 'anti-aging' results",
      "Don't filter skin smoothness",
      "Don't compare to competitors by name",
    ],
    hashtag_sets: {
      branded: ["#LuvelieRoutine", "#LovedByLuvelie"],
      niche: ["#SensitiveSkin", "#FragranceFree", "#SlowSkincare"],
      broad: ["#SkincareTips", "#CleanBeauty", "#BeautyCommunity"],
    },
    competitors: [
      { name: "The Ordinary", handle: "@theordinary" },
      { name: "Krave Beauty", handle: "@kravebeauty" },
    ],
    key_links: [
      { label: "Shop", url: "https://luvelie.example" },
      { label: "Founder letter", url: "https://luvelie.example/about" },
    ],
    updated_at: NOW,
  },

  [CLIENTS[3].id]: {
    client_id: CLIENTS[3].id,
    about:
      "Benny Co. is a B2B SaaS reducing sales tooling spend for mid-market teams. Founder-led, technical buyer audience.",
    target_audience:
      "Heads of RevOps and CROs at 50-500 employee B2B SaaS companies. Skim LinkedIn during commute, trust peer benchmarks, hate generic 'thought leadership.'",
    voice_words_use: ["data-led", "specific", "founder voice", "blunt", "useful"],
    voice_words_avoid: ["thought leader", "synergy", "leverage", "AI-powered"],
    visual_identity: {
      colors: [
        { name: "Signal blue", hex: "#0EA5E9" },
        { name: "Deep blue", hex: "#1E40AF" },
        { name: "Charcoal", hex: "#111827" },
      ],
      logos: ["logo-blue.svg"],
      fonts: ["IBM Plex Sans"],
    },
    content_pillars: [
      "RevOps benchmark threads",
      "Founder build-in-public posts",
      "Customer case studies with $ saved",
      "Tool consolidation guides",
    ],
    dos: [
      "Lead with a concrete number",
      "Quote real customers by name + role",
      "Use carousels for benchmarks",
    ],
    donts: [
      "Don't lean on AI buzzwords",
      "Don't gate every CTA behind a demo form",
      "Don't post on weekends",
    ],
    hashtag_sets: {
      branded: ["#BennyCo"],
      niche: ["#RevOps", "#B2BSaaS", "#PipelineOps"],
      broad: ["#SaaS", "#SalesEnablement"],
    },
    competitors: [
      { name: "Default", handle: "default-com" },
      { name: "Outreach", handle: "@outreach_io" },
    ],
    key_links: [
      { label: "Website", url: "https://benny.example" },
      { label: "Pricing", url: "https://benny.example/pricing" },
    ],
    updated_at: NOW,
  },
};

export function getBrandGuideline(clientId: string): BrandGuideline | undefined {
  return BRAND_GUIDELINES[clientId];
}
