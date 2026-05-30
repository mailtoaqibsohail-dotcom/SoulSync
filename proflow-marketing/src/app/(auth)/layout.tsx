import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="px-6 py-4">
        <Link href="/sign-in" className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            P
          </div>
          <span className="font-semibold">ProFlow</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] rounded-lg bg-card border p-8 shadow-sm">
          {children}
        </div>
      </main>
      <footer className="text-center text-xs text-muted-foreground py-6">
        ProFlow Marketing
      </footer>
    </div>
  );
}
