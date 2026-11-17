# Editorial policy

This policy governs how text, names and corrections are handled in the atlas.

## Original text is preserved

- The text of the book is kept as written in the original extraction (`data/source/`).
- Canonical records keep the original text in its own field. It is not overwritten by editorial work.
- Original text is never silently trimmed, reflowed or "tidied" in a way that changes its content.

## Corrections are traceable

- Any change to the book's content, including fixing OCR errors, typos or wrong figures, is recorded as a correction.
- Each correction states what was changed, why, and the source used to justify it.
- The original value remains visible in the record history, so the change can be reviewed and reversed.

## No silent replacement

- Editorial content (summaries, notes, translations) is never substituted for original text without a visible marker.
- Placeholder or inferred values are labelled as such and are not presented as book content.
- If a value is unknown, the record says so. It is not guessed.

## Catalan canonical names

- Place names and other proper names are kept in Catalan as their canonical form.
- Catalan canonical names are **never translated** into Spanish, English or any other language.
- Alternative spellings or exonyms may be listed as aliases for search, but they never replace the canonical name and never change an ID.

## Language of the documentation

- Project documentation is written in English.
- Content of the atlas stays in the language of the book, with Catalan names as described above.

## Review

- Every change to canonical data goes through the same validation as code (`npm run validate`).
- Corrections and editorial additions should be reviewed by a second person before merging when possible.
