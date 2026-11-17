# Review workflow

The raw OCR extraction (`data/source/original-extraction/`) and the generated `data/needles.json` are never edited by hand.
Human decisions are stored separately in `data/review/decisions.json` and applied at load time
(raw → review decisions → locations → application), so every correction is traceable (reviewer, date, reason) and reversible.

## Decisions
| action | effect |
|---|---|
| `accept` | marks the needle `reviewed` |
| `correct` | overrides name / alternative names / Semir ref, marks `reviewed` |
| `reject` | removes it from the dataset (map label, non-needle). Reason required |
| `merge` | removes it; its name becomes an alternative name of `--into` target. Reason required |

## Commands (`npm run review -- <command>`)
- `progress` – per-section counts and overall % done.
- `list [--section s05] [--status unreviewed] [--limit 30]`, `show n0042` (prints the book page to check).
- `accept n0042 n0043 --reviewer "Name"`, `correct n0042 --name "..." --alt "a;b" --semir 12`, `reject n0042 --reason "..."`,
  `merge n0042 --into n0010 --reason "..."`, `undo n0042`.
- `export out.csv [--section s05]` / `import in.csv` – offline review in a spreadsheet: fill the `action` column
  (and `corrected_name`, `alternative_names`, `merge_into`, `reason`), then import.

Set `REVIEWER` or pass `--reviewer`. Every write is validated (`npm run validate` also checks decisions; CI blocks invalid ones).
A needle should only be `accept`ed after comparing it with the book page (`pdftotext -layout -f P -l P book.pdf -`).
Needles with no review decision keep the `unreviewed` badge and a validation warning.
