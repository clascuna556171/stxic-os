import fs from "node:fs";
import yaml from "js-yaml";
const { pathToFileURL } = await import("node:url");
const mod = await import(
  pathToFileURL("C:/Users/Sebaz/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-llm-pi-ai/lib/index.js")
);
const { Config } = mod;

// 1) Validate the whole llm-pi-ai section from settings.yaml
const doc = yaml.load(fs.readFileSync("C:/Users/Sebaz/.dsh/settings.yaml", "utf8"));
const section = doc["llm-pi-ai"];
console.log("settings.yaml llm-pi-ai present:", section !== undefined);
try {
  const resolved = Config(section ?? {});
  const names = Object.keys(resolved.providers);
  console.log("VALID. providers:", names.join(", "));
  const r9 = resolved.providers.router9;
  console.log("router9 api:", r9.api, "| baseURL:", r9.baseURL, "| models:", r9.models.length);
  console.log("router9 models:", JSON.stringify(r9.models.map((m) => m.id)));
} catch (e) {
  console.log("INVALID ->", String(e && e.message ? e.message : e).split("\n").slice(0, 8).join(" | "));
  process.exit(1);
}

// 2) Confirm supportedProtocols includes openai-completions
console.log("supportedProtocols:", mod.supportedProtocols().join(", "));
