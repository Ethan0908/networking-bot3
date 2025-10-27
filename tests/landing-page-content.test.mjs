import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const landingPath = join(__dirname, "../app/page.js");

async function getLandingPageSource() {
  return readFile(landingPath, "utf8");
}

test("landing page highlights LinkUp hero copy", async () => {
  const source = await getLandingPageSource();
  assert.ok(
    source.includes("Turn every campus connection into career momentum"),
    "expected the hero headline to describe LinkUp's promise"
  );
  assert.ok(
    source.includes("Get started"),
    "expected a primary call-to-action for starting"
  );
});

test("landing page lists core networking features", async () => {
  const source = await getLandingPageSource();
  [
    "Import every contact in minutes",
    "Organize connections effortlessly",
    "AI-assisted outreach",
    "Conversation tracking",
  ].forEach((feature) => {
    assert.ok(
      source.includes(feature),
      `expected to find feature copy for "${feature}"`
    );
  });
});

test("landing page explains data practices", async () => {
  const source = await getLandingPageSource();
  [
    "Gmail metadata only",
    "Selective Drive imports",
    "Your profile, your control",
    "Secure processing",
  ].forEach((item) => {
    assert.ok(source.includes(item), `expected privacy section item: ${item}`);
  });
});
