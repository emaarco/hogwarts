# Migrating from Revelio 0.2


Revelio used to write its own log through hooks. That log is gone:

- The hooks and `/revelio-clear` are removed. Nothing writes `.claude/logs/revelio.jsonl` any more.
- Delete old `.claude/logs/revelio.jsonl` files (and `$HOME/.claude/logs/revelio.jsonl`). The `.claude/logs/` line Revelio added to `.gitignore` can go too, unless something else writes there.
