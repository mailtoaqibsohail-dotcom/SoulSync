"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Check, TrendingUp, Menu, X } from "lucide-react";

/* ---------------------------------------------------------------- */
/* Data                                                             */
/* ---------------------------------------------------------------- */

const SERVICES = [
  { emoji: "📅", title: "Social media management", desc: "End-to-end planning, scheduling, and publishing across every channel.", from: "#2563EB", to: "#0EA5E9" },
  { emoji: "🎬", title: "Short-form video", desc: "Scroll-stopping Reels, TikToks, and Shorts produced in-house.", from: "#EC4899", to: "#8B5CF6" },
  { emoji: "🖼️", title: "Carousels & posts", desc: "Swipe-worthy carousels and feed posts that earn the save.", from: "#F59E0B", to: "#EF4444" },
  { emoji: "📊", title: "Infographics", desc: "Complex ideas turned into clean, shareable visuals.", from: "#10B981", to: "#0EA5E9" },
  { emoji: "🎙️", title: "Podcast production", desc: "Recording, editing, clips, and distribution, fully managed.", from: "#8B5CF6", to: "#2563EB" },
  { emoji: "📺", title: "YouTube growth", desc: "Long-form strategy, thumbnails, and Shorts that compound.", from: "#FF0000", to: "#F59E0B" },
  { emoji: "🛍️", title: "Shopify content", desc: "Product storytelling and UGC that converts browsers to buyers.", from: "#16A34A", to: "#84CC16" },
  { emoji: "🎵", title: "Spotify & audio", desc: "Audiograms, playlists, and audio-first campaigns.", from: "#1DB954", to: "#0EA5E9" },
  { emoji: "✍️", title: "Copy & captions", desc: "On-brand copy and AI-assisted captions tuned to your voice.", from: "#0F172A", to: "#2563EB" },
  { emoji: "🚀", title: "Paid & growth", desc: "Creative testing and reporting that ties content to results.", from: "#2563EB", to: "#7C3AED" },
];

const PLATFORMS = [
  { name: "Instagram", color: "#E4405F" },
  { name: "TikTok", color: "#000000" },
  { name: "YouTube", color: "#FF0000" },
  { name: "Facebook", color: "#1877F2" },
  { name: "LinkedIn", color: "#0A66C2" },
  { name: "X / Twitter", color: "#000000" },
  { name: "Shopify", color: "#16A34A" },
  { name: "Spotify", color: "#1DB954" },
];

const STEPS = [
  { n: "01", title: "Strategy", desc: "We learn your brand voice, audience, and goals, then build a content plan." },
  { n: "02", title: "Production", desc: "Our studio produces video, carousels, infographics, and copy at scale." },
  { n: "03", title: "Your approval", desc: "Review everything in your branded portal and approve in one tap." },
  { n: "04", title: "Publish & report", desc: "We publish on schedule and send clear monthly performance reports." },
];

const STATS = [
  { value: "15+", label: "Brands managed" },
  { value: "1.2k+", label: "Assets shipped / month" },
  { value: "6", label: "Platforms covered" },
  { value: "24h", label: "Avg. approval turnaround" },
];

const FEATURES = [
  { title: "Branded client portal", desc: "Your clients log in to a calm, on-brand space to see everything you do for them." },
  { title: "One-tap approvals", desc: "Posts move from draft to scheduled the moment the client approves. No more email chains." },
  { title: "Real analytics", desc: "Follower growth, reach, engagement, and best-time-to-post, all in one dashboard." },
  { title: "Monthly reports", desc: "Beautiful PDF reports auto-generated and ready to share, every single month." },
  { title: "AI caption assistant", desc: "Captions written in each brand's exact voice, drafted in seconds." },
  { title: "Simple invoicing", desc: "Wise, bank transfer, or Payoneer. Branded invoices and payment proofs, handled." },
];

/* ---------------------------------------------------------------- */

export function Landing({ workspaceHref }: { workspaceHref: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".lp-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("lp-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Sticky nav state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mouse parallax for the hero mockup
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const loginCta = workspaceHref ? "Go to workspace" : "Log in";
  const loginHref = workspaceHref ?? "/sign-in";

  return (
    <div className="min-h-screen bg-white text-[#0F172A] overflow-x-hidden">
      {/* Nav */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all ${
          scrolled
            ? "bg-white/80 backdrop-blur border-b border-[#E2E8F0]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-[#0F172A] text-white grid place-items-center font-bold">
              P
            </span>
            <span className="font-semibold text-lg tracking-tight">
              ProFlow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            <a href="#services" className="hover:text-[#0F172A]">Services</a>
            <a href="#platforms" className="hover:text-[#0F172A]">Platforms</a>
            <a href="#process" className="hover:text-[#0F172A]">How it works</a>
            <a href="#portal" className="hover:text-[#0F172A]">Client portal</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-colors"
            >
              {loginCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            className="md:hidden h-10 w-10 grid place-items-center rounded-lg border border-[#E2E8F0]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-b border-[#E2E8F0] px-5 py-4 space-y-3 text-sm font-medium">
            <a href="#services" className="block" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="#platforms" className="block" onClick={() => setMenuOpen(false)}>Platforms</a>
            <a href="#process" className="block" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#portal" className="block" onClick={() => setMenuOpen(false)}>Client portal</a>
            <Link
              href={loginHref}
              className="block rounded-lg bg-[#2563EB] px-4 py-2 text-center text-white font-semibold"
            >
              {loginCta}
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-5 sm:px-8">
        {/* animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="lp-blob absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#2563EB]/20 blur-3xl" />
          <div className="lp-blob absolute top-10 right-0 h-[28rem] w-[28rem] rounded-full bg-[#8B5CF6]/20 blur-3xl" style={{ animationDelay: "-6s" }} />
          <div className="lp-blob absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#0EA5E9]/20 blur-3xl" style={{ animationDelay: "-12s" }} />
        </div>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium text-[#475569]">
              <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
              Full-service social, content & growth studio
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Social media that{" "}
              <span
                className="lp-gradient-text bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] to-[#0EA5E9]"
              >
                actually grows
              </span>{" "}
              your brand.
            </h1>
            <p className="mt-5 text-lg text-[#475569] max-w-xl">
              We do it all — management, video, carousels, posts, infographics,
              podcasts, YouTube, TikTok, Shopify and Spotify. Strategy to
              publishing to reporting, in one beautiful client portal.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 font-semibold text-white shadow-lg shadow-[#2563EB]/25 hover:bg-[#1D4ED8] transition-colors"
              >
                {workspaceHref ? "Go to workspace" : "Client login"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold hover:bg-[#F8FAFC] transition-colors"
              >
                See what we do
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#10B981]" /> No long contracts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#10B981]" /> You approve everything
              </span>
            </div>
          </div>

          {/* 3D dashboard mockup */}
          <div
            ref={heroRef}
            className="relative [perspective:1200px]"
          >
            <div
              className="relative transition-transform duration-200 will-change-transform"
              style={{
                transform:
                  "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
                transformStyle: "preserve-3d",
              }}
            >
              <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl shadow-[#0F172A]/10 overflow-hidden">
                <div className="h-10 bg-[#0F172A] flex items-center gap-1.5 px-4">
                  <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
                  <span className="h-3 w-3 rounded-full bg-[#F59E0B]" />
                  <span className="h-3 w-3 rounded-full bg-[#10B981]" />
                  <span className="ml-3 text-[11px] text-white/60">
                    agency.proflowenergy.org
                  </span>
                </div>
                <div className="p-5 space-y-4 bg-[#F8FAFC]">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { k: "Followers", v: "27,812", up: "+2.2%" },
                      { k: "Reach", v: "464k", up: "+8.0%" },
                      { k: "Engage", v: "6.1%", up: "+0.4%" },
                    ].map((s) => (
                      <div key={s.k} className="rounded-xl bg-white border border-[#E2E8F0] p-3">
                        <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">{s.k}</div>
                        <div className="text-base font-semibold mt-0.5">{s.v}</div>
                        <div className="text-[10px] text-[#10B981] inline-flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />{s.up}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-white border border-[#E2E8F0] p-4">
                    <div className="text-xs font-medium mb-3">Follower growth</div>
                    <svg viewBox="0 0 320 90" className="w-full h-24">
                      <polyline
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3"
                        points="0,70 40,60 80,64 120,45 160,48 200,30 240,34 280,18 320,12"
                      />
                      <polyline
                        fill="none"
                        stroke="#E4405F"
                        strokeWidth="3"
                        points="0,80 40,72 80,68 120,66 160,55 200,52 240,40 280,38 320,28"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* floating chips */}
              <div className="lp-float absolute -left-6 top-16 rounded-xl bg-white shadow-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium" style={{ "--lp-rot": "-6deg" } as React.CSSProperties}>
                ✅ Post approved
              </div>
              <div className="lp-float absolute -right-4 top-40 rounded-xl bg-white shadow-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium" style={{ "--lp-rot": "5deg", animationDelay: "-3s" } as React.CSSProperties}>
                🎬 Reel scheduled
              </div>
              <div className="lp-float absolute left-8 -bottom-5 rounded-xl bg-white shadow-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium" style={{ animationDelay: "-1.5s" }}>
                📈 +312 followers this week
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="py-6 border-y border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
        <div className="flex w-max lp-marquee gap-10 px-5 text-sm font-semibold text-[#64748B]">
          {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
            <span key={i} className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="lp-reveal text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything your brand needs to show up online
            </h2>
            <p className="mt-4 text-[#475569]">
              One team for strategy, production, and publishing. No juggling
              five freelancers.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s, i) => (
              <div
                key={s.title}
                className="lp-reveal group rounded-2xl border border-[#E2E8F0] bg-white p-6 hover:shadow-xl hover:-translate-y-1 transition-all"
                style={{ animationDelay: `${(i % 3) * 80}ms` }}
              >
                <div
                  className="h-12 w-12 rounded-xl grid place-items-center text-2xl shadow-sm"
                  style={{ backgroundImage: `linear-gradient(135deg, ${s.from}22, ${s.to}22)` }}
                >
                  {s.emoji}
                </div>
                <h3 className="mt-4 font-semibold text-lg">{s.title}</h3>
                <p className="mt-1.5 text-sm text-[#475569]">{s.desc}</p>
                <span
                  className="mt-4 inline-block h-1 w-10 rounded-full"
                  style={{ backgroundImage: `linear-gradient(90deg, ${s.from}, ${s.to})` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="py-20 px-5 sm:px-8 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="lp-reveal text-3xl sm:text-4xl font-bold tracking-tight">
            We publish everywhere your audience is
          </h2>
          <p className="lp-reveal mt-4 text-white/70 max-w-2xl mx-auto">
            Native formats for every platform — never copy-pasted.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {PLATFORMS.map((p, i) => (
              <span
                key={p.name}
                className="lp-reveal rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium backdrop-blur"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: p.color === "#000000" ? "#FFFFFF" : p.color }} />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="lp-reveal text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              How we work with you
            </h2>
            <p className="mt-4 text-[#475569]">
              A calm, transparent process. You are always in control.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="lp-reveal relative rounded-2xl border border-[#E2E8F0] bg-white p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#2563EB] to-[#8B5CF6]">
                  {s.n}
                </div>
                <h3 className="mt-2 font-semibold text-lg">{s.title}</h3>
                <p className="mt-1.5 text-sm text-[#475569]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-5 sm:px-8 bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label} className="lp-reveal">
              <div className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-[#0F172A] to-[#2563EB]">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-[#64748B]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Portal / features */}
      <section id="portal" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="lp-reveal text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] px-3 py-1 text-xs font-medium text-[#475569]">
              <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" /> Your private client portal
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Trust built into every login
            </h2>
            <p className="mt-4 text-[#475569]">
              When you work with us, you get a branded portal — approve posts,
              watch your growth, download reports, and pay invoices in one place.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="lp-reveal rounded-2xl border border-[#E2E8F0] bg-white p-6 hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${(i % 3) * 80}ms` }}
              >
                <div className="h-9 w-9 rounded-lg bg-[#2563EB]/10 text-[#2563EB] grid place-items-center">
                  <Check className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[#475569]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 sm:px-8 pb-24">
        <div className="lp-reveal max-w-6xl mx-auto rounded-3xl bg-[#0F172A] text-white px-8 py-16 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="lp-blob absolute -top-16 left-10 h-64 w-64 rounded-full bg-[#2563EB]/30 blur-3xl" />
            <div className="lp-blob absolute bottom-0 right-10 h-64 w-64 rounded-full bg-[#8B5CF6]/30 blur-3xl" style={{ animationDelay: "-8s" }} />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Ready to grow with ProFlow?
            </h2>
            <p className="mt-4 text-white/70 max-w-xl mx-auto">
              Already a client, team member, or the owner? Log in to your
              workspace.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#0F172A] hover:bg-white/90 transition-colors"
              >
                {loginCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:hello@proflowenergy.org"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] px-5 sm:px-8 py-12">
        <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-[#0F172A] text-white grid place-items-center font-bold">P</span>
              <span className="font-semibold">ProFlow</span>
            </div>
            <p className="mt-3 text-sm text-[#64748B] max-w-xs">
              Social media, content production, and growth for ambitious brands.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Services</div>
            <ul className="mt-3 space-y-2 text-sm text-[#475569]">
              <li>Social media management</li>
              <li>Video & podcasts</li>
              <li>Design & infographics</li>
              <li>Paid & growth</li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Log in</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/sign-in" className="text-[#2563EB] hover:underline">Client login</Link></li>
              <li><Link href="/sign-in" className="text-[#2563EB] hover:underline">Team login</Link></li>
              <li><Link href="/sign-in" className="text-[#2563EB] hover:underline">Owner login</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Contact</div>
            <ul className="mt-3 space-y-2 text-sm text-[#475569]">
              <li><a href="mailto:hello@proflowenergy.org" className="hover:text-[#0F172A]">hello@proflowenergy.org</a></li>
              <li>proflowenergy.org</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-[#E2E8F0] text-xs text-[#94A3B8] flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} ProFlow Marketing. All rights reserved.</span>
          <span>Made with care for brands that want to grow.</span>
        </div>
      </footer>
    </div>
  );
}
