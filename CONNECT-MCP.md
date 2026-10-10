# Connect Pocket Pal's MCP to Claude and other apps

Checked against the official Claude documentation on 10 October 2026. UI labels can vary between account layouts.

## Connection details

| Setting | Existing Pocket Pal |
| --- | --- |
| Name | Pocket Pal |
| Website | https://pocket-pal.thehardway1-yt.chatgpt.site |
| MCP server URL | https://pocket-pal.thehardway1-yt.chatgpt.site/mcp |
| Transport | Streamable HTTP; JSON-RPC POST |
| OAuth resource, if a client explicitly asks | https://pocket-pal.thehardway1-yt.chatgpt.site/mcp |
| Tools | 36; see `MCP-TOOLS.json` |

The `/mcp` suffix matters. The website homepage is not the MCP endpoint.

**Compatibility status:** the current MCP works through the Pocket Pal connection in ChatGPT. Its code implements standard MCP initialization and tools, but Sites handles authentication outside this repository. Connecting this particular private Site to Claude has not been verified. A direct HTTP check from the export environment was blocked with HTTP 403 before MCP authentication could be examined; that does not establish whether Claude's own connection will succeed.

## Claude web, Desktop and mobile: remote connector

For the current Site, try this while you still have access to the ChatGPT account that owns Pebble. For an independent deployment, use its new HTTPS `/mcp` URL instead.

1. In Claude, open **Customize → Connectors** (some layouts put Connectors in Settings).
2. Select **Add custom connector**, or **+ Add → Add custom connector**.
3. Enter **Pocket Pal** and the MCP server URL above.
4. Continue and follow the detected authentication flow. If it offers a supported sign-in, authorize the same account that owns Pebble. Do not guess an OAuth client ID or paste the website's client ID into Claude; those settings are only for a client registered for this connector.
5. Finish adding it, and click **Connect** if that appears separately.
6. In a chat, use **+ → Connectors** to enable Pocket Pal.
7. Ask: **“Use Pocket Pal's get_pet tool and tell me Pebble's name, birthday and current status. Don't hatch or reset a pet.”**

Claude's remote connector is reached from Anthropic's servers, so it needs an internet-reachable endpoint. `http://localhost:5173/mcp` on your laptop will not work in this flow. Set up the remote connector on the web if the mobile app does not show the add screen; the remote connection is usable across supported Claude clients. [1][2]

If the existing Site fails with a sign-in, OAuth, 401 or 403 error, a working ChatGPT plugin does not prove external compatibility. Use the independent hosting route in `MOVE-TO-YOUR-OWN-HOST.md`; it provides an MCP endpoint with authentication designed for external clients. Do not remove authentication to make it connect.

Keeping the existing URL retains the dependency on ChatGPT Sites and your access to that Site. This export does not establish what happens to hosting after a subscription or account change.

## Claude Code

In a terminal:

```bash
claude mcp add --transport http pocket-pal https://pocket-pal.thehardway1-yt.chatgpt.site/mcp
```

Then start Claude Code and use `/mcp` to inspect the connection and complete OAuth if supported. Ask it to run `get_pet`. For a new deployment, replace the URL with your new endpoint. [3]

Alternatively, copy `examples/claude-code-current-site.mcp.json` to `.mcp.json` in the project where you use Claude Code. Merge it into any existing `mcpServers` object rather than overwriting unrelated servers. The example deliberately includes `"type": "http"`.

These are **Claude Code** configurations. Do not assume the same HTTP JSON belongs in Claude Desktop's older `claude_desktop_config.json`; for Desktop chat, use the remote connector screen above.

If a future server uses bearer-token authentication, Claude Code supports an Authorization header. Keep the token out of source control and shell history; an environment reference in a local configuration can supply it:

```json
{
  "mcpServers": {
    "pocket-pal": {
      "type": "http",
      "url": "https://YOUR-NEW-HOST/mcp",
      "headers": {
        "Authorization": "Bearer ${POCKET_PAL_MCP_TOKEN}"
      }
    }
  }
}
```

This example requires an independently implemented token-authenticated server. The exported Sites server does not implement that token scheme. A Claude Code terminal needs the environment variable set before launch. Claude's web connector has different credential settings: request-header authentication is currently a limited beta, so do not build your only web/mobile connection around it unless your account exposes it. OAuth is the more broadly applicable migration target. [2][3]

## Other MCP clients

In an app that supports **remote MCP / Streamable HTTP**, add the same `/mcp` endpoint, complete its supported authentication flow, then list tools and call `get_pet`. Clients use different configuration formats; the Claude Code examples are not universal.

If an app only accepts a local command or stdio server, it needs an HTTP-to-stdio bridge or a separately packaged local server. This export does not include such a bridge. Connecting a ZIP, a GitHub repository URL, or the Pocket Pal homepage will not register the tools.

All clients intended to care for the same Pebble must use the same server database and resolve to the same authenticated owner. A different owner ID can produce an empty home even when the connection itself works.

## A first connection check

- `tools/list` should expose all 36 definitions from `MCP-TOOLS.json`.
- `get_pet` should return Pebble, with ID `697dfc8c-651a-4d76-af43-8ae65c323479`.
- `get_pet_history` should show her old journal. `get_pantry` should show her stock.
- If it says a pet needs hatching, check the signed-in identity and backup import before creating anything.

Read tools apply elapsed time in the existing game, just like opening the website. They do not feed, purchase, wake or reset her. Once connected, requests such as “Give Pebble a cuddle” can invoke care tools using the same save the website reads.

## Official references

1. [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
2. [Add a connector that isn't in the directory](https://claude.com/docs/connectors/custom/add-unlisted)
3. [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
4. [Build an MCP server for Claude](https://claude.com/docs/connectors/building)
