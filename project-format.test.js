"use strict";
// Dependency-free regression checks for the portable project contract.
const fs = require("fs");
global.window = global;
if (!global.crypto) global.crypto = require("crypto").webcrypto;
global.fetch = async () => {
  const bytes = fs.readFileSync("assets/fonts/CourierPrime-Regular.ttf");
  return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
};
eval(fs.readFileSync("project-format.js", "utf8"));

const env = {
  sizes: { letter: { w: 8.5, h: 11 }, legal: { w: 8.5, h: 14 }, a4: { w: 8.27, h: 11.69 } },
  machines: { office: { name: "Office Standard", cpi: 10, jit: .55, ink: 1 }, travel: { name: "Travel Portable", cpi: 12, jit: 1.5, ink: .86 } },
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const fixture = {
  title: "Persistence fixture", machine: "travel", size: "a4", age: 67, wear: 72, ink: 58, mwear: 44, markI: 63, inkColor: "purple", autoReturn: true,
  nib: "pen", nibColors: { marker: "green", pen: "red", pencil: "soft" }, nibSizes: { marker: 61, pen: 72, pencil: 29 },
  pages: [{ seed: "first-page", strikes: [{ r: 6, c: 12, ch: "É", order: 1, off: 0 }, { r: 6, c: 12, ch: "É", order: 1.1, off: .7 }, { r: 6, c: 12, ch: "_", order: 1.2, off: 0 }], whiteouts: [{ r: 6, c0: 14, c1: 15, order: 2 }], highlights: [{ r: 7, c0: 12, c1: 19, order: 3, color: "green", bold: 61 }], strokes: [{ nib: "pen", color: "red", size: 72, order: 4, pts: [[18, 30], [36, 42], [62, 51]] }] }, { seed: "second-page", strikes: [{ r: 8, c: 12, ch: "B", order: 5, off: 0 }], whiteouts: [], highlights: [], strokes: [] }],
};

(async () => {
  TypeItUpProject.ensureRuntimeIds(fixture);
  const packageResult = await TypeItUpProject.buildPackage(fixture, { activePageId: fixture.pages[1].id, row: 8, column: 12 }, env);
  const loaded = await TypeItUpProject.importPackage({ arrayBuffer: () => packageResult.blob.arrayBuffer() }, env);
  assert(loaded.runtimeDoc.pages.length === 2, "page count did not survive round trip");
  assert(loaded.runtimeDoc.pages[0].strikes[0].ch === "É", "Unicode strike did not survive round trip");
  assert(loaded.runtimeDoc.pages[0].strikes[0].visual && loaded.runtimeDoc.pages[0].strikes[0].visual.renderer === "classic-v1" && Number.isFinite(loaded.runtimeDoc.pages[0].strikes[0].visual.opacity), "resolved strike visual data is missing");
  assert(loaded.runtimeDoc.pages[0].strokes[0].pts.length === 3, "freehand path did not survive round trip");
  assert(loaded.portable.renderer.assets.length === 1, "appearance-critical typeface is not packaged");
  assert(loaded.portable.pages[0].appearance.resolved.defects.length > 0, "resolved paper wear is not packaged");
  assert(loaded.resume.pageIndex === 1 && loaded.resume.column === 12, "resume location did not survive round trip");

  const tampered = new Uint8Array(await packageResult.blob.arrayBuffer());
  tampered[100] ^= 1;
  let rejected = false;
  try { await TypeItUpProject.importPackage({ arrayBuffer: async () => tampered.buffer }, env); } catch (_) { rejected = true; }
  assert(rejected, "tampered archive was accepted");

  const future = TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env);
  future.schemaVersion = 2;
  rejected = false;
  try { TypeItUpProject.fromPortable(future, env); } catch (_) { rejected = true; }
  assert(rejected, "unsupported future schema was accepted");

  const optional = TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env);
  optional.futureOptionalField = { retained: true };
  optional.pages[0].futurePageField = "retain me";
  optional.pages[0].objects.push({ id: "future-object", type: "future-optional", typeVersion: 1, sequence: 9, payload: { retained: true } });
  const reserialized = TypeItUpProject.toPortable(TypeItUpProject.fromPortable(optional, env).runtimeDoc, { row: 6, column: 12 }, env);
  assert(reserialized.futureOptionalField.retained && reserialized.pages[0].futurePageField === "retain me" && reserialized.pages[0].objects.some(o => o.type === "future-optional"), "unknown optional data was not preserved");
  console.log("project-format tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
