# Migrating from agento-patronum


`agento-patronum` and its skills are gone. Clean up by hand:

- `/plugin uninstall agento-patronum@emaarco`, otherwise the hook runs twice.
- Delete `~/.claude/patronum.json`. Keep `~/.claude/patronum.log` if you still want the old entries; the hook keeps writing to it.
