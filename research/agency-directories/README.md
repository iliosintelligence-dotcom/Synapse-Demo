# Nigerian real-estate agency & developer directory research

Lead list for Synapse outreach, built from the public agent and developer directories of Nigerian listing platforms.

## Files

| File | What it is |
|---|---|
| `nigeria_agency_developer_directory.xlsx` | Workbook with three tabs: **All rows**, **Deduplicated**, **Summary** |
| `all_rows.csv` | One row per company per platform |
| `deduplicated.csv` | Companies merged across platforms (same normalised name plus a shared phone, email or website domain) |
| `summary.csv` | Source status, totals, and counts per platform, state and city |
| `scripts/scrape_npc.py` | Resumable, rate-limited scraper (1 request at a time, ~1 s apart, browser User-Agent) |
| `scripts/build_outputs.py` | Builds the CSVs and workbook from the scraped JSONL |

## Results (collected 2026-11-25)

- 19,116 rows from Nigeria Property Centre: 17,194 agencies and 1,922 developers. All 19,116 profiles were opened.
- 18,469 unique companies after deduplication.
- 0 companies have an email address, because NPC does not publish them. 18,940 rows have a phone number, 18,332 have WhatsApp and 3,730 have a website.

## Sources

| Platform | Result |
|---|---|
| Nigeria Property Centre (`/agents`, `/developers`) | Collected: every directory page walked and every profile opened. robots.txt allows these paths. NPC does not publish email addresses (it uses an on-site contact form), so the email column is empty. |
| PropertyPro (`propertypro.ng`) | **Not collected.** Every request, including `/robots.txt`, gets a Cloudflare JavaScript bot challenge (HTTP 403). It was not worked around. |
| Private Property Nigeria (`privateproperty.com.ng`) | **Not collected.** It redirects to `privateproperty.ng`, which this environment's network allowlist refuses. |
| Expert Listing (`expertlisting.ng/professionals`) | **Not collected.** The directory is rendered client-side from `api.expertlisting.ng`, which this environment's network allowlist refuses, so the page shows "No Professionals Found". |

## Notes for outreach

- Values are copied exactly as the sites show them. Nothing is guessed. Phone numbers are normalised to the local `0XXXXXXXXXX` form, and multiple values are comma-separated.
- `city` and `state` come from the profile's structured address (schema.org `addressLocality` / `addressRegion`). When that is missing they come from the trailing parts of the listed address.
- `type` is the directory the company appears in: `/agents` gives `agency` and `/developers` gives `developer`.
- Check consent and anti-spam rules (e.g. NDPA 2023) before emailing or messaging these contacts.
