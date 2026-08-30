# Daily research worker contract

Run once daily. Search the agreed university pages and murals, relevant Instagram pages, event and news sites, and other operator-approved sources for engineering, robotics, cybersecurity, technology, and defence events. Write evidence-backed candidate rows to the Google Sheet and media to the canonical Drive project folder.

## Non-negotiable evidence rules

The worker must never invent an event, date, time, venue, city, status, description, source URL, excerpt, ranking fact, image source, permission, or provenance. A plausible guess is still fabricated data.

For each candidate:

1. Capture at least one reachable HTTP(S) source, its label, collection time, and a concise excerpt or fact note.
2. Connect every factual claim to one or more source IDs in `supported_facts_json`. The date must be explicitly supported.
3. Merge duplicate discoveries into one stable `external_row_id`; append and retain all distinct sources, marking official sources where known.
4. If sources disagree on title, date, time, venue, city, or event status, record all values in `conflicts_json`, set `needs_attention`, and notify the operator. Do not silently choose.
5. Rank only with topic relevance, target-week match, and geography band, in that order. Keep online events separate.
6. Upload useful permitted images to Drive in priority order: official artwork, announcement/poster, then labelled generated fallback. Store multiple candidates when available.
7. If evidence or media access is incomplete, keep the row with `needs_attention` and an explanatory run-log note. Do not fill gaps with generated text.

## Geographic fallback

Start with Coimbra and nearby events. If a week is sparse, retain visible suggestions from northern Portugal and then central Portugal, including Aveiro. Do not describe a wider-area event as local to Coimbra. Online events are always a separate pool for the final carousel slide, with at most five chosen later by the operator.

## Daily completion

Upsert each event by stable ID, update `updated_at`, and add one `Run log` row with counts for added, updated, rejected, and conflicts. The worker only researches and structures evidence; it does not approve events, resolve conflicts, select final artwork, write final carousel copy, or publish.
