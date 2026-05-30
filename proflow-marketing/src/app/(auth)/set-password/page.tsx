import { SetPasswordForm } from "./form";

export const metadata = { title: "Set your password" };

export default function SetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password to secure your account.
        </p>
      </div>
      <SetPasswordForm />
    </div>
  );
}
