"use client";

import { useState } from "react";
import { Pencil, Download, Share2, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { BrandGuideline } from "@/lib/brand-data";

interface Props {
  guideline: BrandGuideline;
  clientName: string;
  canEdit: boolean;
}

export function BrandGuidelines({ guideline, clientName, canEdit }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);

  function shareLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Brand Guidelines</h1>
          <p className="text-sm text-muted-foreground">
            How {clientName} sounds, looks, and shows up.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated {formatDate(guideline.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant={editMode ? "default" : "outline"}
              onClick={() => setEditMode((v) => !v)}
            >
              <Pencil className="h-4 w-4" />
              {editMode ? "Done editing" : "Edit"}
            </Button>
          )}
          <Button variant="outline" disabled title="Lands with the PDF export pipeline">
            <Download className="h-4 w-4" />
            Download as PDF
          </Button>
          <Button variant="outline" onClick={shareLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share link
              </>
            )}
          </Button>
        </div>
      </div>

      <Section title="About the brand">
        <Prose editable={editMode}>{guideline.about}</Prose>
      </Section>

      <Section title="Target audience">
        <Prose editable={editMode}>{guideline.target_audience}</Prose>
      </Section>

      <Section title="Brand voice and tone">
        <div className="grid gap-4 md:grid-cols-2">
          <WordsCard
            title="Words we use"
            words={guideline.voice_words_use}
            tone="positive"
          />
          <WordsCard
            title="Words we avoid"
            words={guideline.voice_words_avoid}
            tone="negative"
          />
        </div>
      </Section>

      <Section title="Visual identity">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <Label>Colors</Label>
            <ul className="space-y-2 mt-2">
              {guideline.visual_identity.colors.map((c) => (
                <li
                  key={c.hex}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className="h-6 w-6 rounded-md border"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground text-xs ml-auto">
                    {c.hex.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label>Logos</Label>
            <ul className="space-y-1 mt-2 text-sm">
              {guideline.visual_identity.logos.map((f) => (
                <li
                  key={f}
                  className="rounded-md border px-2 py-1 text-muted-foreground"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label>Fonts</Label>
            <ul className="space-y-1 mt-2 text-sm">
              {guideline.visual_identity.fonts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Content pillars">
        <ul className="list-disc list-inside space-y-1 text-sm">
          {guideline.content_pillars.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Section>

      <Section title="Dos and Don&apos;ts">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-success/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-success text-base">Do</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1">
                {guideline.dos.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-danger/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-danger text-base">Don&apos;t</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1">
                {guideline.donts.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Hashtag strategy">
        <div className="grid gap-4 md:grid-cols-3">
          <HashtagGroup
            label="Branded"
            tags={guideline.hashtag_sets.branded}
          />
          <HashtagGroup label="Niche" tags={guideline.hashtag_sets.niche} />
          <HashtagGroup label="Broad" tags={guideline.hashtag_sets.broad} />
        </div>
      </Section>

      <Section title="Competitors to watch">
        <ul className="space-y-1 text-sm">
          {guideline.competitors.map((c) => (
            <li
              key={c.name}
              className="flex items-center gap-2"
            >
              <span className="font-medium">{c.name}</span>
              {c.handle && (
                <span className="text-muted-foreground text-xs">
                  {c.handle}
                </span>
              )}
              {c.link && (
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-accent text-xs inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Visit
                </a>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Key links">
        <ul className="space-y-1 text-sm">
          {guideline.key_links.map((l) => (
            <li
              key={l.url}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5"
            >
              <span className="font-medium">{l.label}</span>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent text-xs inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                {l.url.replace(/^https?:\/\//, "")}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function Prose({
  children,
  editable,
}: {
  children: string;
  editable: boolean;
}) {
  if (editable) {
    return (
      <textarea
        defaultValue={children}
        rows={4}
        className="w-full text-sm rounded-md border border-input bg-background p-3"
      />
    );
  }
  return <p className="text-sm whitespace-pre-wrap">{children}</p>;
}

function WordsCard({
  title,
  words,
  tone,
}: {
  title: string;
  words: string[];
  tone: "positive" | "negative";
}) {
  const color = tone === "positive" ? "#065F46" : "#991B1B";
  const bg = tone === "positive" ? "#D1FAE5" : "#FEE2E2";
  return (
    <div>
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {words.map((w) => (
          <span
            key={w}
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: bg, color }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

function HashtagGroup({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <ul className="space-y-1 mt-2">
        {tags.map((t) => (
          <li
            key={t}
            className="text-sm text-accent break-words"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
