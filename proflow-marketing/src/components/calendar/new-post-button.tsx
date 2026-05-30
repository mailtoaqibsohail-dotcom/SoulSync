"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewPostDrawer } from "./new-post-drawer";

export function NewPostButton({ label = "New Content" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <NewPostDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
