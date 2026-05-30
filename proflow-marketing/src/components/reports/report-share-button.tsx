"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportShareButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/reports/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          Share link
        </>
      )}
    </Button>
  );
}
