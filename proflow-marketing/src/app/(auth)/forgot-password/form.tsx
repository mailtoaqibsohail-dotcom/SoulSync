"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendResetLink, type AuthResult } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send Reset Link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useFormState<AuthResult | null, FormData>(
    sendResetLink,
    null
  );

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for this email, we have sent a reset link. The
          link expires in 1 hour.
        </p>
        <Link
          href="/sign-in"
          className="inline-block text-sm text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we will send you a reset link.
        </p>
      </div>
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        {state && !state.ok && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {state.error}
          </div>
        )}
        <SubmitButton />
      </form>
      <Link
        href="/sign-in"
        className="block text-center text-sm text-accent hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
