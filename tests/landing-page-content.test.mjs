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

test("landing page contains Linkmation hero copy", async () => {
  const source = await getLandingPageSource();
  assert.ok(
    source.includes("Automate and manage your links with ease."),
    "expected the hero headline to describe Linkmation's value"
  );
  assert.ok(
    source.includes("Try Linkmation Free"),
    "expected a primary call-to-action for trying Linkmation"
  );
});

test("landing page lists core Linkmation features", async () => {
  const source = await getLandingPageSource();
  [
    "Automated Link Management",
    "Real-Time Analytics",
    "Smart Integrations",
    "Privacy First",
  ].forEach((feature) => {
    assert.ok(source.includes(feature), `expected feature card copy for "${feature}"`);
  });
});

test("landing page explains Google data usage", async () => {
  const source = await getLandingPageSource();
  assert.ok(
    source.includes("Linkmation uses Google user data only to identify your account"),
    "expected explanation of limited Google data usage"
  );
  assert.ok(
    source.includes("View our Privacy Policy"),
    "expected privacy policy link copy"
  );
});
