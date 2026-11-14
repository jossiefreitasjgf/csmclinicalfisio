import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("firebase-applet-config.json targets expected project and named database", () => {
  const cfg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "firebase-applet-config.json"), "utf8")
  );
  assert.equal(cfg.projectId, "zany-tribute-fw2h4");
  assert.equal(cfg.firestoreDatabaseId, "ai-studio-091de9b3-9e63-4295-9e14-b485f5ad1ce9");
});

test("firebase.json configures named database rules and hosting rewrite", () => {
  const fb = JSON.parse(fs.readFileSync(path.join(rootDir, "firebase.json"), "utf8"));
  assert.equal(fb.firestore[0].database, "ai-studio-091de9b3-9e63-4295-9e14-b485f5ad1ce9");
  assert.equal(fb.firestore[0].rules, "firestore.rules");
});

test("vite.config.ts does not alias firebase to mockFirebase", () => {
  const viteCfg = fs.readFileSync(path.join(rootDir, "vite.config.ts"), "utf8");
  assert.equal(viteCfg.includes("mockFirebase"), false);
});

test("firestore.rules enforces zero-trust default deny and blocks plaintext password storage", () => {
  const rules = fs.readFileSync(path.join(rootDir, "firestore.rules"), "utf8");
  assert.ok(rules.includes("allow create, delete: if false;"));
  assert.ok(rules.includes("!('password' in request.resource.data)"));
  assert.ok(rules.includes("match /{document=**} { allow read, write: if false; }"));
});

test("vercel.json keeps API routes outside SPA fallback", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(rootDir, "vercel.json"), "utf8"));
  assert.equal(vercel.outputDirectory, "dist");
  assert.equal(vercel.rewrites[0].source, "/((?!api/).*)");
});
