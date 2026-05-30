#!/usr/bin/env python3
"""Seed realistic demo data so each role sees a distinct slice.
Uses the Supabase service-role key (bypasses RLS). Idempotent via upserts."""
import json, os, sys, urllib.request, datetime

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SR = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

ORG = "c1051d79-d5c4-49ae-a70d-87190d3dd2f0"
OWNER = "9cdfbdd2-0cf7-4a6f-8c4d-af4f369ea54e"
TEAM = "11358459-28de-452d-933a-632dc9e14c25"
MAC = "ea3e8e7f-e56c-478b-8908-bb7d271523a2"

ACME = "c9ba41f5-6f19-4e66-b6b5-3f40e6b002ad"      # Mac's client (exists)
LUVELIE = "1a2b3c4d-0002-4002-8002-000000000002"
BENNY = "1a2b3c4d-0003-4003-8003-000000000003"
BLUEFIELD = "1a2b3c4d-0004-4004-8004-000000000004"

today = datetime.date.today()

def d(offset):  # date offset string
    return (today + datetime.timedelta(days=offset)).isoformat()

def ts(offset, hour=10):  # timestamptz offset
    dt = datetime.datetime.combine(today + datetime.timedelta(days=offset),
                                   datetime.time(hour, 0))
    return dt.isoformat() + "Z"

def post(table, rows, on_conflict=None):
    if not rows:
        return
    qs = f"?on_conflict={on_conflict}" if on_conflict else ""
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}{qs}",
        data=json.dumps(rows).encode(),
        method="POST",
        headers={
            "apikey": SR,
            "Authorization": f"Bearer {SR}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        urllib.request.urlopen(req)
        print(f"  OK  {table}: {len(rows)} rows")
    except urllib.error.HTTPError as e:
        print(f"  ERR {table}: {e.code} {e.read().decode()[:300]}")

# 1. Clients (upsert by id) -------------------------------------------------
post("clients", [
    {"id": ACME, "org_id": ORG, "name": "Acme Solar", "status": "active",
     "plan_name": "Growth Plan", "monthly_fee": 1500, "brand_primary": "#16A34A",
     "industry": "Energy", "primary_contact": "Mac", "billing_email": "aqib.sohail@khubaibpakistan.org", "is_active": True},
    {"id": LUVELIE, "org_id": ORG, "name": "Luvelie Beauty", "status": "active",
     "plan_name": "Pro Plan", "monthly_fee": 2000, "brand_primary": "#EC4899",
     "industry": "Beauty", "primary_contact": "Lara", "billing_email": "billing@luvelie.example", "is_active": True},
    {"id": BENNY, "org_id": ORG, "name": "Benny Co.", "status": "active",
     "plan_name": "Starter Plan", "monthly_fee": 900, "brand_primary": "#0EA5E9",
     "industry": "Retail", "primary_contact": "Ben", "billing_email": "billing@benny.example", "is_active": True},
    {"id": BLUEFIELD, "org_id": ORG, "name": "Bluefield Energy", "status": "active",
     "plan_name": "Growth Plan", "monthly_fee": 1800, "brand_primary": "#1E40AF",
     "industry": "Energy", "primary_contact": "Dana", "billing_email": "billing@bluefield.example", "is_active": True},
])

# 2. Team assignments: Aqib S -> Luvelie + Benny only (NOT Acme/Bluefield) ---
post("team_assignments", [
    {"user_id": TEAM, "client_id": LUVELIE},
    {"user_id": TEAM, "client_id": BENNY},
], on_conflict="user_id,client_id")

# 3. Content items ----------------------------------------------------------
def ci(cid, client, status, day, caption, assigned=None):
    return {"id": cid, "client_id": client, "created_by": OWNER,
            "assigned_to": assigned, "post_type": "feed", "caption": caption,
            "status": status, "scheduled_at": ts(day)}

post("content_items", [
    # Acme (Mac's) — client sees these
    ci("2a000000-0000-4000-8000-000000000001", ACME, "pending_approval", 1, "5 reasons your AZ home is solar-ready", OWNER),
    ci("2a000000-0000-4000-8000-000000000002", ACME, "scheduled", 2, "Tax credit deadline reminder"),
    ci("2a000000-0000-4000-8000-000000000003", ACME, "published", -10, "Customer spotlight: the Patels"),
    ci("2a000000-0000-4000-8000-000000000004", ACME, "needs_changes", 3, "Founder Q&A — solar myths"),
    ci("2a000000-0000-4000-8000-000000000005", ACME, "pending_approval", 4, "Before/after install timelapse"),
    # Luvelie (team assigned) — team sees these
    ci("2a000000-0000-4000-8000-000000000011", LUVELIE, "draft", 1, "Glow-from-within routine reel", TEAM),
    ci("2a000000-0000-4000-8000-000000000012", LUVELIE, "needs_changes", 2, "Summer glow campaign hero", TEAM),
    ci("2a000000-0000-4000-8000-000000000013", LUVELIE, "pending_approval", 1, "New serum teaser", TEAM),
    ci("2a000000-0000-4000-8000-000000000014", LUVELIE, "scheduled", 3, "Founder skincare story"),
    # Benny (team assigned)
    ci("2a000000-0000-4000-8000-000000000021", BENNY, "draft", 2, "Founder Q&A part 2", TEAM),
    ci("2a000000-0000-4000-8000-000000000022", BENNY, "scheduled", 4, "Product drop announcement"),
    # Bluefield (NOT team assigned) — only owner sees
    ci("2a000000-0000-4000-8000-000000000031", BLUEFIELD, "scheduled", 1, "Onsite generation case study"),
    ci("2a000000-0000-4000-8000-000000000032", BLUEFIELD, "pending_approval", 2, "Grid resilience explainer"),
])

# 4. Invoices: Mac sees only Acme's; owner sees all -------------------------
def inv(num, client, status, issue, due, total):
    return {"org_id": ORG, "client_id": client, "invoice_number": num,
            "issue_date": d(issue), "due_date": d(due), "subtotal": total,
            "total": total, "status": status, "currency": "USD", "created_by": OWNER}

post("invoices", [
    inv("INV-2026-0001", ACME, "paid", -40, -10, 1500),
    inv("INV-2026-0002", ACME, "sent", -5, 10, 1500),
    inv("INV-2026-0003", LUVELIE, "sent", -3, 12, 2000),
    inv("INV-2026-0004", BENNY, "overdue", -20, -5, 900),
    inv("INV-2026-0005", BLUEFIELD, "paid", -35, -5, 1800),
], on_conflict="org_id,invoice_number")

# 5. Brand guidelines (one per client) --------------------------------------
def brand(client, about, audience, voice):
    return {"client_id": client, "about": about, "target_audience": audience, "voice_tone": voice}

post("brand_guidelines", [
    brand(ACME, "Acme Solar helps Arizona homeowners go solar with zero hassle.",
          "Homeowners 35-60 in the US Southwest", "Confident, friendly, expert"),
    brand(LUVELIE, "Clean beauty brand focused on glow-from-within skincare.",
          "Women 18-34 interested in clean beauty", "Warm, playful, aspirational"),
    brand(BENNY, "Direct-to-consumer lifestyle brand.", "Gen-Z shoppers", "Bold, witty"),
    brand(BLUEFIELD, "Commercial onsite energy generation.", "Facility managers", "Authoritative, technical"),
], on_conflict="client_id")

# 6. Client platforms -------------------------------------------------------
def cp(client, platform, handle):
    return {"client_id": client, "platform": platform, "handle": handle, "is_active": True}

post("client_platforms", [
    cp(ACME, "instagram", "@acmesolar"), cp(ACME, "facebook", "AcmeSolar"), cp(ACME, "linkedin", "acme-solar"),
    cp(LUVELIE, "instagram", "@luveliebeauty"), cp(LUVELIE, "tiktok", "@luvelie"),
    cp(BENNY, "instagram", "@bennyco"), cp(BENNY, "tiktok", "@bennyco"),
    cp(BLUEFIELD, "linkedin", "bluefield-energy"),
], on_conflict="client_id,platform")

# 7. Metrics snapshots for Acme (so Mac's analytics/home show trends) -------
snaps = []
base = {"instagram": 12000, "facebook": 7000, "linkedin": 1800}
growth = {"instagram": 8, "facebook": 3, "linkedin": 2}
for plat, start in base.items():
    for i in range(45, -1, -1):  # 45 days ago -> today
        day = d(-i)
        followers = start + growth[plat] * (45 - i)
        reach = followers * 3 + (i % 7) * 120
        snaps.append({"client_id": ACME, "platform": plat, "snapshot_date": day,
                      "followers": followers, "reach": reach, "following": 300,
                      "profile_visits": reach // 10, "website_clicks": reach // 40})
post("metrics_snapshots", snaps, on_conflict="client_id,platform,snapshot_date")

print("Seed complete.")
