"use client";

import { useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TONES, GOALS, type Caption, type Tone, type Goal } from "@/lib/ai-types";
import { generateCaptions } from "@/app/(app)/ai/actions";
import type { PlatformKey } from "@/lib/clients-data";

interface Props {
  clientId: string;
  platform: PlatformKey;
  onPick: (text: string) => void;
  onClose: () => void;
}

export function InlineAiPopover({ clientId, platform, onPick, onClose }: Props) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("Friendly");
  const [goal, setGoal] = useState<Goal>("Drive engagement");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await generateCaptions({
        client_id: clientId,
        platform,
        topic,
        tone,
        goal,
        variations: 3,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCaptions(res.captions);
    });
  }

  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Inline caption assistant
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">What is this post about?</Label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="One sentence is enough"
        />
      </div>
      <div className="grid gap-2 grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Tone</Label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Goal</Label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1.5">
          {error}
        </div>
      )}
      <Button
        size="sm"
        onClick={go}
        disabled={pending || !topic.trim()}
        className="w-full"
      >
        {pending ? "Generating…" : "Generate 3 options"}
      </Button>

      {captions.length > 0 && (
        <ul className="space-y-2 pt-1">
          {captions.map((c, i) => (
            <li
              key={i}
              className="rounded-md border bg-background p-2 text-xs space-y-1"
            >
              <p className="whitespace-pre-wrap">{c.text}</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{c.char_count} chars</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPick(c.text)}
                  className="h-6 px-2 text-[11px]"
                >
                  Use this
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
