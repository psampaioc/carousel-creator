# Google Drive project layout

Google Drive is the canonical archive for research media and carousel output. Convex stores file IDs, source URLs, provenance, and state; it does not keep a second permanent media library.

```text
Carousel Creator - Coimbra Events/
  research-media/
    YYYY/
      YYYY-MM-DD-run-id/
  exports/
    YYYY/
      YYYY-MM-DD-week-start/
  archive/
  Events Research Queue (Google Sheet)
```

The project folder, Sheet, `research-media`, `exports`, and `archive` IDs are recorded in the private deployment configuration or operator notes, never committed as secrets. Share the project folder and Sheet with the service-account email as narrowly as possible.

## Media rules

- Store multiple eligible images when useful. Prefer official event artwork, then a real announcement/poster, then an explicitly generated fallback.
- Keep the original source URL and collection time with every Drive file reference.
- Do not upload an image unless reuse is permitted or there is a defensible editorial basis for retaining it.
- Never relabel a generated image as official or announcement artwork.
- If a Drive file is moved, deleted, or inaccessible to the service account, the importer records a finding and excludes that image candidate.
- Temporary download or rendering files may exist during a process, but must be deleted when the operation succeeds or fails. No persistent project media belongs on the operator's laptop.

## Retention and cleanup

After publication, move obsolete run folders to `archive` rather than deleting them immediately. Keep the published export and the evidence used for it while the newsletter needs an audit trail. The operator may periodically remove archived, unused media after checking that no active candidate or draft references its Drive file ID. Cleanup starts from this one project folder, making it bounded and inspectable.
