"use server";

import Anthropic from "@anthropic-ai/sdk";
import { CLIENTS, PLATFORM_LABEL } from "@/lib/clients-data";
import { getBrandGuideline } from "@/lib/brand-data";
import { CAPTION_LIMITS } from "@/lib/content-data";
import type {
  Caption,
  CaptionRequest,
  CaptionResult,
} from "@/lib/ai-types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

function buildSystemPrompt(req: CaptionRequest): string {
  const client = CLIENTS.find((c) => c.id === req.client_id);
  const brand = getBrandGuideline(req.client_id);
  const lines: string[] = [];
  lines.push(
    `You write social-media captions for ${client?.name ?? "a brand"}.`
  );
  if (brand) {
    lines.push(`Brand summary: ${brand.about}`);
    lines.push(`Audience: ${brand.target_audience}`);
    lines.push(
      `Use words like: ${brand.voice_words_use.join(", ")}. Avoid: ${brand.voice_words_avoid.join(", ")}.`
    );
    if (brand.content_pillars?.length) {
      lines.push(`Content pillars: ${brand.content_pillars.join("; ")}.`);
    }
  }
  lines.push(
    `Platform: ${PLATFORM_LABEL[req.platform]} (caption limit ~${CAPTION_LIMITS[req.platform]} chars).`
  );
  lines.push(
    `Tone: ${req.tone}. Goal: ${req.goal}.${req.cta ? ` Include this CTA: "${req.cta}".` : ""}`
  );
  lines.push(
    `Output rules: never use em-dashes; do not start a caption with hashtags; vary openings between options; one caption per option; no numbered list.`
  );
  return lines.join("\n");
}

function parseAnthropicCaptions(text: string, limit: number): Caption[] {
  // Split on blank lines and "Option N" / "1)" / "1." prefixes.
  const blocks = text
    .split(/\n\s*\n+/)
    .map((b) =>
      b
        .replace(/^\s*(option\s*\d+[:.)\-]?|caption\s*\d+[:.)\-]?|\d+[.)])\s*/i, "")
        .trim()
    )
    .filter((b) => b.length > 0);
  return blocks.map((text) => ({
    text,
    char_count: text.length > limit ? limit : text.length,
  }));
}

function fallbackCaptions(req: CaptionRequest): Caption[] {
  const client = CLIENTS.find((c) => c.id === req.client_id);
  const brand = getBrandGuideline(req.client_id);
  const limit = CAPTION_LIMITS[req.platform];
  const openings: Record<typeof req.tone, string[]> = {
    Friendly: ["Hey friend,", "Quick one for you:", "Listen up:"],
    Professional: ["Here is the latest from", "An update from", "Brief note from"],
    Bold: ["No more excuses.", "The truth is:", "Stop scrolling."],
    Inspirational: ["You can do this.", "Reminder:", "Today is the day."],
    Educational: ["Today's lesson:", "Five things to know:", "Quick explainer:"],
    Funny: ["Confession time:", "Asking for a friend:", "True story:"],
  };
  const opens = openings[req.tone];
  const captions: Caption[] = [];
  for (let i = 0; i < req.variations; i++) {
    const sentences = [
      `${opens[i % opens.length]} ${req.topic}`,
      brand
        ? `Why it matters for ${brand.target_audience.split(".")[0].toLowerCase()}.`
        : `Why it matters: it actually moves the needle.`,
      req.goal === "Sell"
        ? "If that resonates, the link is in our bio."
        : req.goal === "Drive engagement"
        ? "Tell us your take in the comments."
        : req.goal === "Educate"
        ? "Save this so you can come back to it."
        : req.goal === "Build community"
        ? "Tag a friend who needs to see this."
        : "Hit follow for more from us.",
      req.cta ? `${req.cta}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const trimmed = sentences.length > limit ? sentences.slice(0, limit) : sentences;
    captions.push({
      text: trimmed,
      char_count: trimmed.length,
    });
  }
  // Append brand attribution as a soft hint for the demo.
  if (client) {
    captions[0] = {
      ...captions[0],
      text:
        captions[0].text +
        ` (Drafted in ${client.name}'s voice — this is the local fallback. Set ANTHROPIC_API_KEY for live Claude output.)`,
    };
    captions[0].char_count = captions[0].text.length;
  }
  return captions;
}

export async function generateCaptions(
  req: CaptionRequest
): Promise<CaptionResult> {
  if (!req.topic.trim()) {
    return { ok: false, error: "Tell the AI what the post is about." };
  }
  if (req.variations < 1 || req.variations > 5) {
    return { ok: false, error: "Variations must be between 1 and 5." };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      ok: true,
      captions: fallbackCaptions(req),
      source: "fallback",
    };
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const system = buildSystemPrompt(req);
    const userMsg = `Write ${req.variations} different caption${req.variations === 1 ? "" : "s"} for: "${req.topic}". Separate each one with a blank line.`;
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = result.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n\n");
    const captions = parseAnthropicCaptions(
      text,
      CAPTION_LIMITS[req.platform]
    );
    if (captions.length === 0) {
      return {
        ok: true,
        captions: fallbackCaptions(req),
        source: "fallback",
      };
    }
    return { ok: true, captions, source: "anthropic" };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Claude API error: ${err.message}`
          : "Unknown Claude API error.",
    };
  }
}
