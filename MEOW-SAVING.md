# Meow Dialogue persistence

The original AIBoard interface and existing Supabase tables remain the source
for pet-function configuration. No new database migration is required.

Meow saves now compare against the loaded row baseline and update only changed
messages/timing. Existing IDs are retained. Every update/delete checks the old
values; another session's changed row produces a visible conflict instead of
being overwritten. Unknown concurrent additions are left alone.

Saves are debounced and serialized. Failed batches retain their remaining
operations and stable insertion UUIDs, so Retry save can recover partial work
or a lost response without inserting duplicates. Multi-row saves are not an
atomic transaction; the status stays failed until remaining operations succeed.

The editor shows loading, saving, saved and error status. Errors preserve the
local draft. Discard and reload explicitly reloads server data. Loading failures
disable editing, and leaving with pending/failed saves triggers a browser warning.
Account changes cancel pending operations and reset the editor. Already accepted
server requests cannot be cancelled; they remain scoped to their original owner.

Validation (local fake database only, no remote writes):

```sh
node --test tests/persist-meow-changes.test.mjs
npm run lint
npm run build
```

The production account flow still needs a signed-in smoke test after deployment.
Other AIBoard editors (pricing, simulator and responses) are outside this repair.
