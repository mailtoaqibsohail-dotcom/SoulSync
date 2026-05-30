import { Landing } from "@/components/landing/landing";
import { getCurrentUserOrNull, homePathForRole } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ProFlow Marketing — Social media, content & growth studio",
  description:
    "Full-service social media management, content production, video, podcasts and growth marketing for ambitious brands. Strategy to publishing to reporting, all in one branded client portal.",
};

export default async function RootLandingPage() {
  const user = await getCurrentUserOrNull();
  const workspaceHref = user ? homePathForRole(user.role) : null;
  return <Landing workspaceHref={workspaceHref} />;
}
