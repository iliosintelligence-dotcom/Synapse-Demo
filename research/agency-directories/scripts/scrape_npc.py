"""Polite, resumable scraper for the Nigeria Property Centre agent and developer directories.

Phase 1 walks every page of /agents and /developers and records each company card.
Phase 2 opens every profile page and records the details shown there.
Progress is appended to JSONL files in DATA_DIR, so a restart resumes where it stopped.

One request at a time, ~1 s between requests, browser User-Agent. robots.txt for
nigeriapropertycentre.com only disallows *report/create* for generic agents.
"""
import json
import os
import re
import sys
import time
from datetime import date
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE = "https://nigeriapropertycentre.com"
DATA_DIR = sys.argv[1] if len(sys.argv) > 1 else "data"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
DELAY = 1.0
DIRECTORIES = [("agents", "agency"), ("developers", "developer")]
SOCIAL = ("facebook.", "instagram.", "twitter.", "x.com", "linkedin.", "youtube.",
          "tiktok.", "apple.com", "google.com", "wa.me", "whatsapp.", "propertycentre.com")

os.makedirs(DATA_DIR, exist_ok=True)
LIST_FILE = os.path.join(DATA_DIR, "npc_list.jsonl")
PAGES_FILE = os.path.join(DATA_DIR, "npc_pages_done.jsonl")
PROFILE_FILE = os.path.join(DATA_DIR, "npc_profiles.jsonl")
LOG_FILE = os.path.join(DATA_DIR, "npc_log.txt")

session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9"})
_last = [0.0]


def log(msg):
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


class Blocked(Exception):
    pass


def fetch(url):
    for attempt in range(4):
        wait = DELAY - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            r = session.get(url, timeout=45)
        except requests.RequestException as e:
            log(f"network error {url}: {e}")
            time.sleep(5 * (attempt + 1))
            continue
        if r.status_code == 200:
            if "challenge-platform" in r.text[:5000] or "Just a moment" in r.text[:500]:
                raise Blocked(f"bot challenge at {url}")
            return r.text
        if r.status_code == 404:
            return None
        if r.status_code in (403, 429):
            log(f"HTTP {r.status_code} at {url}; backing off")
            time.sleep(60 * (attempt + 1))
            if attempt >= 2:
                raise Blocked(f"HTTP {r.status_code} at {url}")
            continue
        log(f"HTTP {r.status_code} at {url}")
        time.sleep(5 * (attempt + 1))
    return None


def append(path, obj):
    with open(path, "a") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def read_jsonl(path):
    if not os.path.exists(path):
        return []
    out = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    pass  # partial line from an interrupted write
    return out


def text(el):
    return re.sub(r"\s+", " ", el.get_text(" ")).strip() if el else ""


def parse_list_page(html, slug):
    soup = BeautifulSoup(html, "html.parser")
    pat = re.compile(rf"^/{slug}/[^/?#]+-\d+$")
    cards = []
    for h3 in soup.find_all("h3"):
        a = h3.find("a", href=pat)
        if not a:
            continue
        box = h3.find_parent("div").find_parent("div")
        address = phone = ""
        for p in box.find_all("p"):
            use = p.find("use")
            ref = use.get("href", "") if use else ""
            if ref == "#i-map-pin":
                address = text(p)
            elif ref == "#i-phone":
                phone = text(p)
        cards.append({"name": text(a), "profile_url": urljoin(BASE, a["href"]),
                      "address": address, "phone": phone})
    last = 1
    for a in soup.find_all("a", href=re.compile(rf"^/{slug}\?page=\d+$")):
        last = max(last, int(a["href"].split("=")[-1]))
    return cards, last


def parse_profile(html):
    soup = BeautifulSoup(html, "html.parser")
    out = {}
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            d = json.loads(s.string or "")
        except Exception:
            continue
        if isinstance(d, dict) and d.get("@type") not in ("SearchResultsPage", "BreadcrumbList") and d.get("name"):
            out["ld_type"] = d.get("@type")
            out["name"] = d.get("name", "")
            out["telephone"] = d.get("telephone", "")
            out["ld_email"] = d.get("email", "")
            out["ld_url"] = d.get("sameAs") or ""
            addr = d.get("address") or {}
            if isinstance(addr, dict):
                out["street"] = addr.get("streetAddress", "")
                out["city"] = addr.get("addressLocality", "")
                out["state"] = addr.get("addressRegion", "")
    h1 = soup.find("h1")
    if not out.get("name"):
        out["name"] = text(h1)
    phones, whats, sites, emails = [], [], [], []
    for a in soup.find_all("a", href=True):
        h = a["href"].strip()
        if h.startswith("tel:"):
            phones.append(h[4:])
        elif "wa.me/" in h or "api.whatsapp.com" in h:
            m = re.search(r"(?:wa\.me/|phone=)(\+?\d+)", h)
            if m:
                whats.append(m.group(1))
        elif h.startswith("mailto:"):
            emails.append(h[7:].split("?")[0])
        elif h.startswith("http"):
            host = urlparse(h).netloc.lower()
            if host and not any(s in host for s in SOCIAL):
                sites.append(h)
    out["phones"] = list(dict.fromkeys(phones))
    out["whatsapp"] = list(dict.fromkeys(whats))
    out["websites"] = list(dict.fromkeys(sites))
    out["emails"] = list(dict.fromkeys(emails))
    for el in soup.find_all(string=re.compile(r"^\s*Active listings\s*$")):
        box = el.parent.parent
        num = box.find("span")
        if num and re.fullmatch(r"[\d,]+", text(num)):
            out["active_listings"] = int(text(num).replace(",", ""))
            break
    # header address line (first map-pin line near the title), for profiles without JSON-LD address
    if h1:
        hdr = h1.find_parent("div")
        for _ in range(3):
            if hdr is not None and hdr.find("use", href="#i-map-pin") is None:
                hdr = hdr.find_parent("div")
        out["header_text"] = text(hdr)[:500] if hdr is not None else ""
    return out


def phase_lists():
    done = {(d["slug"], d["page"]) for d in read_jsonl(PAGES_FILE)}
    for slug, kind in DIRECTORIES:
        last = None
        page = 1
        while last is None or page <= last:
            if (slug, page) in done and last is not None:
                page += 1
                continue
            url = f"{BASE}/{slug}" + (f"?page={page}" if page > 1 else "")
            html = fetch(url)
            if html is None:
                log(f"list page failed {url}")
                page += 1
                if last is None:
                    last = 1
                continue
            cards, found_last = parse_list_page(html, slug)
            last = max(last or 1, found_last)
            if (slug, page) not in done:
                for c in cards:
                    c.update({"type": kind, "list_page": page})
                    append(LIST_FILE, c)
                append(PAGES_FILE, {"slug": slug, "page": page, "count": len(cards), "last": last})
                done.add((slug, page))
            if page % 25 == 0 or page == last:
                log(f"{slug} page {page}/{last}: {len(cards)} cards")
            page += 1


def phase_profiles():
    seen = {}
    for c in read_jsonl(LIST_FILE):
        seen.setdefault(c["profile_url"], c)
    done = {p["profile_url"] for p in read_jsonl(PROFILE_FILE)}
    todo = [u for u in seen if u not in done]
    log(f"profiles: {len(seen)} unique, {len(done)} done, {len(todo)} to go")
    for i, url in enumerate(todo, 1):
        html = fetch(url)
        rec = {"profile_url": url, "fetched": date.today().isoformat()}
        if html is None:
            rec["error"] = "not found or failed"
        else:
            try:
                rec.update(parse_profile(html))
            except Exception as e:  # keep going; record the failure
                rec["error"] = f"parse error: {e}"
        append(PROFILE_FILE, rec)
        if i % 200 == 0:
            log(f"profiles {i}/{len(todo)}")


if __name__ == "__main__":
    try:
        phase_lists()
        phase_profiles()
        log("DONE")
    except Blocked as e:
        log(f"BLOCKED: {e}")
        sys.exit(2)
