# Validate annotation text targets in migration 0010

Migrations `0009` and `0010` were introduced together, but `0009` already created
the three text-target columns that `0010` attempted to add. Keep `0009` and both
filenames unchanged; replace `0010` with a zero-row select of the required columns.
This repairs fresh builds and databases that already recorded `0009`, preserves
existing data, and still fails on an unexpected schema with missing columns.

Moving the columns out of `0009` would fix fresh replay but leave databases that
already applied it stuck. An unconditional no-op would hide missing columns.
This is a targeted repair of a broken migration, not a policy of rewriting
successful migration history. New schema changes should use new migrations.
