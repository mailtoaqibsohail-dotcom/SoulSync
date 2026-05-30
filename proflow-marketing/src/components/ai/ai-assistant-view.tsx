"use client";

import { useState, useTransition } from "react";
import { Sparkles, Copy, ArrowRight, RefreshCw, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type PlatformKey,
} from "@/lib/clients-data";
import {
  TONES,
  GOALS,
  type Caption,
  type Tone,
  type Goal,
} from "@/lib/ai-types";
import { generateCaptions } from "@/app/(app)/ai/actions";

interface ClientRef {
  id: string;
  name: string;
  brand_color: string;
  initials: string;
  platforms: PlatformKey[];
}

interface Props {
  clients: ClientRef[];
}

export function AiAssistantView({ clients }: Props) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">AI Content Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Generate captions, hooks, and hashtags trained on your brand voice.
        </p>
      </div>
      <Tabs defaultValue="caption">
        <TabsList>
          <TabsTrigger value="caption">Caption Writer</TabsTrigger>
          <TabsTrigger value="hook">Hook Generator</TabsTrigger>
          <TabsTrigger value="hashtag">Hashtag Builder</TabsTrigger>
          <TabsTrigger value="repurpose">Repurpose Long Content</TabsTrigger>
        </TabsList>
        <TabsContent value="caption" className="mt-4">
          <CaptionWriter clients={clients} />
        </TabsContent>
        <TabsContent value="hook" className="mt-4">
          <ComingSoon
            title="Hook Generator"
            description="Punchy opening lines for reels and short-form video. Same brand-voice training, optimized for the first three seconds."
          />
        </TabsContent>
        <TabsContent value="hashtag" className="mt-4">
          <ComingSoon
            title="Hashtag Builder"
            description="Generates Branded / Niche / Broad sets sized to the platform, with usage warnings on shadow-ban-prone tags."
          />
        </TabsContent>
        <TabsContent value="repurpose" className="mt-4">
          <ComingSoon
            title="Repurpose Long Content"
            description="Paste a blog post, newsletter, or transcript — get a thread plan, carousel outline, and reel script."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CaptionWriter({ clients }: { clients: ClientRef[] }) {
  const [clientId, setClientId] = useState(clients[0].id);
  const [platform, setPlatform] = useState<PlatformKey>(clients[0].platforms[0]);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("Friendly");
  const [goal, setGoal] = useState<Goal>("Drive engagement");
  const [includeCta, setIncludeCta] = useState(true);
  const [cta, setCta] = useState("Tap the link in our bio.");
  const [variations, setVariations] = useState(3);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"anthropic" | "fallback" | null>(null);
  const [pending, startTransition] = useTransition();

  const client = clients.find((c) => c.id === clientId)!;

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await generateCaptions({
        client_id: clientId,
        platform,
        topic,
        tone,
        goal,
        cta: includeCta ? cta : undefined,
        variations,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCaptions(res.captions);
      setSource(res.source);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Client">
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                const next = clients.find((c) => c.id === e.target.value);
                if (next?.platforms.length) setPlatform(next.platforms[0]);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Platform">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformKey)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {client.platforms.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What is this post about?">
            <Textarea
              rows={4}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe the topic, key message, and any specific points to include..."
            />
          </Field>
          <div className="grid gap-3 grid-cols-2">
            <Field label="Tone">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Goal">
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCta}
                onChange={(e) => setIncludeCta(e.target.checked)}
              />
              Include CTA
            </label>
            {includeCta && (
              <Input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Tap the link in our bio."
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Variations: <strong>{variations}</strong>
            </Label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={variations}
              onChange={(e) => setVariations(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <Button
            onClick={generate}
            disabled={pending}
            className="w-full"
            style={{ backgroundColor: PLATFORM_COLOR[platform] }}
          >
            <Sparkles className="h-4 w-4" />
            {pending ? "Generating…" : "Generate Captions"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {captions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Captions will land here. We pull in {client.name}&apos;s brand
              voice, your selected platform, tone, and goal.
            </CardContent>
          </Card>
        ) : (
          <>
            {source === "fallback" && (
              <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-[#92400E]">
                Generated by the local fallback. Set
                <code className="mx-1 rounded bg-muted px-1">ANTHROPIC_API_KEY</code>
                to switch to live Claude output.
              </div>
            )}
            {captions.map((c, i) => (
              <CaptionCard key={i} caption={c} platform={platform} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CaptionCard({
  caption,
  platform,
}: {
  caption: Caption;
  platform: PlatformKey;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(caption.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm whitespace-pre-wrap">{caption.text}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {caption.char_count} chars · {PLATFORM_LABEL[platform]}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" disabled title="Coming with the New Post drawer wiring next">
              <ArrowRight className="h-3 w-3" />
              Use in New Post
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <RefreshCw className="h-3 w-3" />
              Refine
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>{description}</p>
        <p className="text-xs">
          Same brand-voice plumbing as Caption Writer — drops in once that
          tab&apos;s UI patterns settle.
        </p>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
