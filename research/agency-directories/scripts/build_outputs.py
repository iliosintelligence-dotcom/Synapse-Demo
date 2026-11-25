"""Build the All rows / Deduplicated / Summary outputs from the scraped JSONL data.

usage: python build_outputs.py <data_dir> <out_dir>
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import date
from urllib.parse import urlparse

import pandas as pd

DATA_DIR, OUT_DIR = sys.argv[1], sys.argv[2]
os.makedirs(OUT_DIR, exist_ok=True)
COLUMNS = ["platform", "company_name", "type", "city", "state", "address", "phone", "whatsapp",
           "email", "website", "active_listings_count", "profile_url", "date_collected"]
PLATFORM_NPC = "Nigeria Property Centre"

# Sources that could not be collected; reported on the Summary tab.
SOURCE_STATUS = [
    {"platform": "Nigeria Property Centre", "host": "nigeriapropertycentre.com",
     "directories": "/agents (agencies), /developers (developers)",
     "status": "Collected",
     "notes": "robots.txt allows the directories (only *report/create* is disallowed). "
              "Profiles show phone, WhatsApp, address, website and listing counts; "
              "NPC does not publish email addresses on profiles (contact is via an on-site form), "
              "so the email column is empty for this platform."},
    {"platform": "PropertyPro", "host": "www.propertypro.ng",
     "directories": "not reached",
     "status": "Blocked - not collected",
     "notes": "www.propertypro.ng redirects to propertypro.ng, which answers every request "
              "(including /robots.txt and /agents) with a Cloudflare 'Just a moment...' JavaScript "
              "bot challenge (HTTP 403). Not worked around, per instructions."},
    {"platform": "Private Property Nigeria", "host": "www.privateproperty.com.ng",
     "directories": "not reached",
     "status": "Host refused by network - not collected",
     "notes": "www.privateproperty.com.ng returns a 301 redirect to https://privateproperty.ng/, "
              "and that host is not on this environment's network allowlist (proxy: 403 'no rule "
              "or network setting allows this host')."},
    {"platform": "Expert Listing", "host": "www.expertlisting.ng",
     "directories": "/professionals (tabs: Developers, Brokerage, Agents)",
     "status": "Host refused by network - not collected",
     "notes": "The /professionals page renders client-side and loads its data from "
              "api.expertlisting.ng/api/v1/business/professionals/, which is not on this "
              "environment's network allowlist (connections refused by the proxy), so the "
              "directory shows 'No Professionals Found'. No server-rendered profile pages or "
              "sitemap entries for professionals were found on www.expertlisting.ng."},
]


def read_jsonl(path):
    out = []
    if os.path.exists(path):
        for line in open(path):
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def norm_phone(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("234") and len(d) >= 13:
        d = "0" + d[3:]
    elif len(d) == 10 and d[0] in "789":
        d = "0" + d
    return d


def split_phones(s):
    parts = re.split(r"[,/;|]", s or "")
    return [p.strip() for p in parts if re.sub(r"\D", "", p)]


def uniq(seq):
    return list(dict.fromkeys(x for x in seq if x))


def domain(url):
    if not url:
        return ""
    host = urlparse(url if "//" in url else "//" + url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


SUFFIXES = r"\b(limited|ltd|plc|llc|inc|nig|nigeria|enterprises?|ventures?|company|co|the|and|&)\b"


def norm_name(n):
    n = (n or "").lower().replace("&", " and ")
    n = re.sub(r"[^a-z0-9 ]", " ", n)
    n = re.sub(SUFFIXES, " ", n)
    return re.sub(r"\s+", " ", n).strip()


def split_address(addr):
    """Fallback city/state from an address like '..., Lekki, Lagos, Nigeria'."""
    parts = [p.strip() for p in (addr or "").split(",") if p.strip()]
    if parts and parts[-1].lower() == "nigeria":
        parts = parts[:-1]
    state = parts[-1] if parts else ""
    city = parts[-2] if len(parts) >= 2 else ""
    return city, state


def build_npc_rows():
    cards = {}
    for c in read_jsonl(os.path.join(DATA_DIR, "npc_list.jsonl")):
        cur = cards.setdefault(c["profile_url"], dict(c))
        for k in ("address", "phone", "name"):
            if not cur.get(k) and c.get(k):
                cur[k] = c[k]
    profiles = {}
    for p in read_jsonl(os.path.join(DATA_DIR, "npc_profiles.jsonl")):
        profiles[p["profile_url"]] = p
    rows = []
    for url, c in cards.items():
        p = profiles.get(url, {})
        phones = uniq([norm_phone(x) for x in split_phones(c.get("phone")) + p.get("phones", [])
                       + split_phones(p.get("telephone"))])
        whats = uniq([norm_phone(x) for x in p.get("whatsapp", [])])
        emails = uniq([e.strip().lower() for e in p.get("emails", []) + [p.get("ld_email", "")]])
        sites = uniq(p.get("websites", []))
        f_city, f_state = split_address(c.get("address"))
        rows.append({
            "platform": PLATFORM_NPC,
            "company_name": (c.get("name") or p.get("name") or "").strip(),
            "type": c.get("type", ""),
            "city": p.get("city") or f_city,
            "state": p.get("state") or f_state,
            "address": c.get("address", ""),
            "phone": ", ".join(phones),
            "whatsapp": ", ".join(whats),
            "email": ", ".join(emails),
            "website": ", ".join(sites),
            "active_listings_count": p.get("active_listings", ""),
            "profile_url": url,
            "date_collected": p.get("fetched") or date.today().isoformat(),
            "_profile_opened": bool(p) and not p.get("error"),
        })
    return rows


def dedupe(rows):
    """Union-find over rows: same normalised name AND a shared phone, email or website domain."""
    parent = list(range(len(rows)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    keys = defaultdict(list)
    for i, r in enumerate(rows):
        nn = norm_name(r["company_name"])
        if not nn:
            continue
        ids = set()
        for ph in (r["phone"] + "," + r["whatsapp"]).split(","):
            ph = norm_phone(ph)
            if len(ph) >= 10:
                ids.add("p:" + ph)
        for e in r["email"].split(","):
            if e.strip():
                ids.add("e:" + e.strip())
        for w in r["website"].split(","):
            d = domain(w.strip())
            if d:
                ids.add("w:" + d)
        for k in ids:
            keys[(nn, k)].append(i)
    for idxs in keys.values():
        for j in idxs[1:]:
            union(idxs[0], j)
    groups = defaultdict(list)
    for i in range(len(rows)):
        groups[find(i)].append(rows[i])
    out = []
    for grp in groups.values():
        grp.sort(key=lambda r: -(int(r["active_listings_count"] or 0)))
        first = grp[0]

        def merged(col):
            vals = []
            for r in grp:
                vals += [v.strip() for v in str(r[col]).split(",") if v.strip()]
            return ", ".join(uniq(vals))

        listings = [int(r["active_listings_count"]) for r in grp if str(r["active_listings_count"]).strip()]
        out.append({
            "company_name": first["company_name"],
            "type": ", ".join(uniq(r["type"] for r in grp)),
            "platforms": ", ".join(uniq(r["platform"] for r in grp)),
            "platform_count": len(uniq(r["platform"] for r in grp)),
            "listing_count_on_platforms": len(grp),
            "city": first["city"] or next((r["city"] for r in grp if r["city"]), ""),
            "state": first["state"] or next((r["state"] for r in grp if r["state"]), ""),
            "address": first["address"] or next((r["address"] for r in grp if r["address"]), ""),
            "phone": merged("phone"),
            "whatsapp": merged("whatsapp"),
            "email": merged("email"),
            "website": merged("website"),
            "active_listings_count_total": sum(listings) if listings else "",
            "profile_urls": " | ".join(r["profile_url"] for r in grp),
            "date_collected": max(r["date_collected"] for r in grp),
        })
    out.sort(key=lambda r: r["company_name"].lower())
    return out


def main():
    rows = build_npc_rows()
    rows.sort(key=lambda r: (r["platform"], r["type"], r["company_name"].lower()))
    opened = sum(r.pop("_profile_opened") for r in rows)
    all_df = pd.DataFrame(rows, columns=COLUMNS)
    dd_df = pd.DataFrame(dedupe(rows))

    def has(df, col):
        return int((df[col].astype(str).str.strip() != "").sum()) if len(df) else 0

    summary = []
    summary.append(["Generated", date.today().isoformat()])
    summary.append([])
    summary.append(["SOURCES", "Host", "Directories", "Status", "Rows collected", "Notes"])
    for s in SOURCE_STATUS:
        n = int((all_df["platform"] == s["platform"]).sum())
        summary.append([s["platform"], s["host"], s["directories"], s["status"], n, s["notes"]])
    summary.append([])
    summary.append(["TOTALS", "Value"])
    summary.append(["Rows (All rows tab)", len(all_df)])
    summary.append(["Profiles opened successfully", opened])
    summary.append(["Unique companies (Deduplicated tab)", len(dd_df)])
    for col in ("email", "phone", "whatsapp", "website"):
        summary.append([f"All rows with {col}", has(all_df, col)])
        summary.append([f"Unique companies with {col}", has(dd_df, col)])
    summary.append([])
    summary.append(["ROWS PER PLATFORM AND TYPE", "Type", "Rows"])
    for (pl, ty), n in all_df.groupby(["platform", "type"]).size().items():
        summary.append([pl, ty, int(n)])
    summary.append([])
    summary.append(["ROWS PER STATE", "Rows"])
    for st, n in Counter(all_df["state"].replace("", "(not shown)")).most_common():
        summary.append([st, n])
    summary.append([])
    summary.append(["ROWS PER CITY (top 100)", "State", "Rows"])
    city_counts = Counter(zip(all_df["city"].replace("", "(not shown)"), all_df["state"]))
    for (ci, st), n in city_counts.most_common(100):
        summary.append([ci, st, n])
    width = max(len(r) for r in summary)
    sum_df = pd.DataFrame([r + [""] * (width - len(r)) for r in summary])

    all_df.to_csv(os.path.join(OUT_DIR, "all_rows.csv"), index=False)
    dd_df.to_csv(os.path.join(OUT_DIR, "deduplicated.csv"), index=False)
    sum_df.to_csv(os.path.join(OUT_DIR, "summary.csv"), index=False, header=False)
    xlsx = os.path.join(OUT_DIR, "nigeria_agency_developer_directory.xlsx")
    with pd.ExcelWriter(xlsx, engine="openpyxl") as w:
        all_df.to_excel(w, sheet_name="All rows", index=False)
        dd_df.to_excel(w, sheet_name="Deduplicated", index=False)
        sum_df.to_excel(w, sheet_name="Summary", index=False, header=False)
        from openpyxl.styles import Font
        for name in ("All rows", "Deduplicated"):
            ws = w.sheets[name]
            ws.freeze_panes = "A2"
            ws.auto_filter.ref = ws.dimensions
            for c in ws[1]:
                c.font = Font(bold=True)
            for col in ws.columns:
                width = min(60, max(10, max(len(str(c.value or "")) for c in col[:300]) + 2))
                ws.column_dimensions[col[0].column_letter].width = width
        ws = w.sheets["Summary"]
        for row in ws.iter_rows():
            if row[0].value and str(row[0].value).isupper():
                for c in row:
                    c.font = Font(bold=True)
        ws.column_dimensions["A"].width = 38
        for L in "BCDE":
            ws.column_dimensions[L].width = 28
        ws.column_dimensions["F"].width = 120
    print(f"rows={len(all_df)} unique={len(dd_df)} opened={opened} "
          f"email={has(all_df,'email')} phone={has(all_df,'phone')} website={has(all_df,'website')}")


if __name__ == "__main__":
    main()
