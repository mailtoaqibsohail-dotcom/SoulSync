import Link from "next/link";
import { SignInForm } from "./form";
import { DemoEntry } from "./demo-entry";

export const metadata = { title: "Sign in to ProFlow" };

function looksLikeRealSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    !!url &&
    !!key &&
    /^https:\/\//.test(url) &&
    !url.includes("example.supabase.co") &&
    !url.includes("placeholder")
  );
}

export default function SignInPage() {
  const demoMode = !looksLikeRealSupabase();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your ProFlow account
        </p>
      </div>
      <SignInForm />
      <p className="text-sm text-muted-foreground text-center">
        Need an account?{" "}
        <Link
          href="mailto:hello@proflow.example"
          className="text-accent hover:underline"
        >
          Contact your account manager.
        </Link>
      </p>
      {demoMode && <DemoEntry />}
    </div>
  );
}
