"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewInvoiceDrawer } from "./new-invoice-drawer";

export function NewInvoiceButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Invoice
      </Button>
      <NewInvoiceDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
