# Obsidian Setup — Local REST API (Stxic bridge)

Stxic talks to your vault through the **Local REST API with MCP** community
plugin by Adam Coddington. It runs on `127.0.0.1` (your own machine) and is
reachable only while Obsidian is open with the plugin enabled.

## 1. Install the plugin

Community plugins → search **"Local REST API with MCP"** → Install → Enable.

## 2. Find your API key

Obsidian → Settings → **Local REST API** → **API Key** (per-vault). Copy it,
then paste it into **Stxic → Settings → Obsidian sync → API key**. Stxic
encrypts it (AES-GCM) before storing it in your cloud settings — it is never
written to disk or the repo.

> Treat the key like a password. If it ever leaks, regenerate it here and
> paste the new one into Stxic.

## 3. Trust the self-signed certificate (Windows, HTTPS default)

The plugin serves HTTPS on `https://127.0.0.1:27124` with a self-signed cert
generated on first run. Your browser will reject it until you trust it once:

1. Open `https://127.0.0.1:27124/` in your browser.
2. Click **Advanced** → **Proceed to 127.0.0.1 (unsafe)** (or download the
   cert from `https://127.0.0.1:27124/obsidian-local-rest-api.crt`).
3. To make it stick for the Stxic web app, install the cert into
   **Trusted Root Certification Authorities**:
   - Download `obsidian-local-rest-api.crt` → double-click → **Install
     Certificate…** → **Local Machine** → **Place all certificates in the
     following store** → **Trusted Root Certification Authorities**.
4. Fully restart the browser.

## 4. Fallback: insecure HTTP

If cert trust is painful, enable the plugin's **HTTP server** (port `27123`) at
Obsidian → Settings → Local REST API → **Enable HTTP server**, then flip the
**HTTP fallback (port 27123)** switch in Stxic Settings. Loopback HTTP is still
protected by the Bearer API key.

## 5. Test

In Stxic → Settings → Obsidian sync, press **Test Connection**. A green
"Connected to Obsidian (vX.X.X)" means you're ready to push/pull notes and use
the vault graph widget on the dashboard.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Obsidian must be running…" | Open Obsidian and enable the plugin; check it's listening on 27124/27123. |
| Certificate error on HTTPS | Trust the self-signed cert (step 3) or enable HTTP fallback (step 4). |
| "API key incorrect" | Re-copy the key from the plugin settings; regenerate if unsure. |
