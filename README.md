# Pocket Pal

The complete Pocket Pal application is in [`source/`](source/), including its website, database schema and all 36 MCP tools.

- [Application documentation](source/README.md)
- [Connect to Claude and other MCP apps](CONNECT-MCP.md)
- [Move to your own hosting](MOVE-TO-YOUR-OWN-HOST.md)
- [Claude Code connection examples](examples/)

Use `source/` as the project root for development or hosting configuration:

```bash
cd source
pnpm install --frozen-lockfile
pnpm test
```

This is the original exported application from ChatGPT Sites, not an already migrated independent deployment. Its Sites authentication and database bindings need the adaptation described in the migration guide.

Pebble's private save is in the separately downloaded export ZIP. It is intentionally not uploaded to this public repository. References to `private-backup/` in the export guides refer to that local download.
