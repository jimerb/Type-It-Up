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
const loadAppComponent = () => {
  global.localStorage = { getItem: () => null, setItem: () => {} };
  class DCLogic {
    constructor(props) { this.props = props || {}; }
    setState(update, callback) { const patch = typeof update === "function" ? update(this.state) : update; this.state = { ...this.state, ...(patch || {}) }; if (callback) callback(); }
    forceUpdate() {}
  }
  const html = fs.readFileSync("Type It Up App.dc.html", "utf8"), match = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Type It Up app script is missing");
  return new Function("DCLogic", `${match[1]}\nreturn Component;`)(DCLogic);
};
const fixture = {
  title: "Persistence fixture", machine: "travel", size: "a4", age: 67, wear: 72, ink: 58, mwear: 44, markI: 63, inkColor: "purple", autoReturn: true,
  nib: "pen", nibColors: { marker: "green", pen: "red", pencil: "soft" }, nibSizes: { marker: 61, pen: 72, pencil: 29 },
  pages: [{ seed: "first-page", defects: { seed: "scar-one", wornEdges: 64, fold: "quarter", foldStrength: 58, tears: "mixed" }, strikes: [{ r: 6, c: 12, ch: "É", order: 1, off: 0 }, { r: 6, c: 12, ch: "É", order: 1.1, off: .7 }, { r: 6, c: 12, ch: "_", order: 1.2, off: 0 }], whiteouts: [{ r: 6, c0: 14, c1: 15, order: 2 }], highlights: [{ r: 7, c0: 12, c1: 19, order: 3, color: "green", bold: 61 }], strokes: [{ nib: "pen", color: "red", size: 72, order: 4, pts: [[18, 30], [36, 42], [62, 51]] }] }, { seed: "second-page", defects: { seed: "scar-two", wornEdges: 0, fold: "none", foldStrength: 35, tears: "none" }, strikes: [{ r: 8, c: 12, ch: "B", order: 5, off: 0 }], whiteouts: [], highlights: [], strokes: [] }],
};

(async () => {
  TypeItUpProject.ensureRuntimeIds(fixture);
  const packageResult = await TypeItUpProject.buildPackage(fixture, { activePageId: fixture.pages[1].id, row: 8, column: 12 }, env);
  assert(packageResult.manifest.minimumReader === 2 && packageResult.manifest.documentSchemaVersion === 2, "package manifest did not declare schema version 2");
  const packageText = new TextDecoder().decode(new Uint8Array(await packageResult.blob.arrayBuffer()));
  assert(packageText.includes('stroke="#3f2b19"') && packageText.includes('stroke-dasharray="2.2 1.1 .65 1.5"'), "packaged reference preview did not render natural tear rims");
  assert(packageText.includes("filter:blur(") && !packageText.includes("<ellipse"), "packaged reference preview did not render worn edges as soft burn paths");
  const loaded = await TypeItUpProject.importPackage({ arrayBuffer: () => packageResult.blob.arrayBuffer() }, env);
  assert(loaded.runtimeDoc.pages.length === 2, "page count did not survive round trip");
  assert(loaded.runtimeDoc.pages[0].strikes[0].ch === "É", "Unicode strike did not survive round trip");
  assert(loaded.runtimeDoc.pages[0].strikes[0].visual && loaded.runtimeDoc.pages[0].strikes[0].visual.renderer === "classic-v2" && Number.isFinite(loaded.runtimeDoc.pages[0].strikes[0].visual.opacity), "resolved strike visual data is missing");
  assert(loaded.runtimeDoc.pages[0].strokes[0].pts.length === 3, "freehand path did not survive round trip");
  assert(loaded.portable.renderer.assets.length === 1, "appearance-critical typeface is not packaged");
  assert(loaded.portable.pages[0].appearance.resolved.defects.length > 0, "resolved paper wear is not packaged");
  assert(loaded.runtimeDoc.pages[0].defects.seed === "scar-one" && loaded.runtimeDoc.pages[0].defects.fold === "quarter", "defect settings did not survive round trip");
  assert(loaded.portable.pages[0].appearance.defects.resolved.renderer === "page-defects-v1" && loaded.portable.pages[0].appearance.defects.resolved.tears.length === 2, "resolved defect scene is not packaged");
  assert(loaded.resume.pageIndex === 1 && loaded.resume.column === 12, "resume location did not survive round trip");

  const sceneA = TypeItUpProject.resolvePageDefects(fixture.pages[0].defects, env.sizes.a4.w * 72000000, env.sizes.a4.h * 72000000);
  const sceneB = TypeItUpProject.resolvePageDefects(fixture.pages[0].defects, env.sizes.a4.w * 72000000, env.sizes.a4.h * 72000000);
  assert(JSON.stringify(sceneA) === JSON.stringify(sceneB), "the same defect seed did not produce stable geometry");
  assert(sceneA.tears.length === 2 && sceneA.folds.length === 2 && sceneA.edgeWear.length > 0, "requested defects were not generated within their caps");
  assert(sceneA.edgeWear.every(mark => mark.mode === "edge-burn" && mark.points.length === 7 && mark.widthMicroPt > mark.blurMicroPt && !Object.prototype.hasOwnProperty.call(mark, "tone")), "worn edges were not generated as broad, dark-only perimeter passes");
  const interiorTear = sceneA.tears.find(tear => tear.kind === "interior");
  assert(interiorTear && interiorTear.renderStyle === "natural-rim" && interiorTear.rimClosed && interiorTear.rim.length === interiorTear.points.length && interiorTear.fibers.length === 5, "interior tears did not use an irregular perimeter rim and fiber details");
  sceneA.tears.forEach(tear => tear.points.forEach(point => assert(point.xMicroPt >= 0 && point.xMicroPt <= env.sizes.a4.w * 72000000 && point.yMicroPt >= 0 && point.yMicroPt <= env.sizes.a4.h * 72000000, "tear geometry escaped the page")));
  const sceneRegenerated = TypeItUpProject.resolvePageDefects({ ...fixture.pages[0].defects, seed: "scar-regenerated" }, env.sizes.a4.w * 72000000, env.sizes.a4.h * 72000000);
  assert(JSON.stringify(sceneA.tears) !== JSON.stringify(sceneRegenerated.tears) && JSON.stringify(sceneA.edgeWear) !== JSON.stringify(sceneRegenerated.edgeWear), "regenerating the defect seed did not change the scars or worn-edge placement");
  const gentleWear = TypeItUpProject.resolvePageDefects({ ...fixture.pages[0].defects, wornEdges: 20 }, env.sizes.a4.w * 72000000, env.sizes.a4.h * 72000000).edgeWear;
  const heavyWear = TypeItUpProject.resolvePageDefects({ ...fixture.pages[0].defects, wornEdges: 90 }, env.sizes.a4.w * 72000000, env.sizes.a4.h * 72000000).edgeWear;
  const averageOpacity = marks => marks.reduce((sum, mark) => sum + mark.opacity, 0) / marks.length;
  assert(averageOpacity(heavyWear) > averageOpacity(gentleWear) && heavyWear.length >= gentleWear.length, "the worn-edge intensity slider did not strengthen the burn treatment");
  assert(fixture.pages[0].strikes[0].ch === "É" && fixture.pages[0].seed === "first-page", "defect generation changed page content or the paper seed");

  const legacy = TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env);
  legacy.schemaVersion = 1;
  legacy.renderer = { profile: "classic-v1", version: 1, assets: [] };
  legacy.features.required = ["classic-scene"];
  legacy.pages.forEach(page => { delete page.appearance.defects; page.appearance.resolved.renderer = "classic-v1"; });
  const migrated = TypeItUpProject.fromPortable(legacy, env);
  assert(migrated.runtimeDoc.pages.every(page => page.defects && !TypeItUpProject.hasDefects(page.defects)), "version 1 pages did not migrate to clean defects");
  assert(TypeItUpProject.toPortable(migrated.runtimeDoc, migrated.resume, env).schemaVersion === 2, "migrated project was not upgraded on save");

  const constrained = TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env);
  constrained.pages[0].appearance.defects.semantic = { wornEdges: 1000, fold: "unsafe-fold", foldStrength: -50, tears: "unbounded" };
  const constrainedLoaded = TypeItUpProject.fromPortable(constrained, env).runtimeDoc.pages[0].defects;
  assert(constrainedLoaded.wornEdges === 100 && constrainedLoaded.fold === "none" && constrainedLoaded.foldStrength === 0 && constrainedLoaded.tears === "none", "invalid defect settings were not constrained");
  const unsafeResolved = TypeItUpProject.fromPortable(TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env), env).runtimeDoc;
  unsafeResolved.pages[0]._tiuDefectsResolved.tears.push({}, {}, {});
  const repairedResolved = TypeItUpProject.effectiveResolvedDefects(unsafeResolved, unsafeResolved.pages[0], env);
  assert(repairedResolved.tears.length === 2 && repairedResolved.tears.every(tear => tear.points.length > 0), "unsafe resolved defect geometry was not regenerated");
  const staleWear = TypeItUpProject.fromPortable(TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env), env).runtimeDoc;
  staleWear.pages[0]._tiuDefectsResolved.edgeWear = [{ cxMicroPt: 10, cyMicroPt: 10, rxMicroPt: 10, ryMicroPt: 10, opacity: .2, tone: "light" }];
  const repairedWear = TypeItUpProject.effectiveResolvedDefects(staleWear, staleWear.pages[0], env);
  assert(repairedWear.edgeWear.every(mark => mark.mode === "edge-burn" && Array.isArray(mark.points)), "legacy blotch geometry was not replaced with burn paths");

  const tampered = new Uint8Array(await packageResult.blob.arrayBuffer());
  tampered[100] ^= 1;
  let rejected = false;
  try { await TypeItUpProject.importPackage({ arrayBuffer: async () => tampered.buffer }, env); } catch (_) { rejected = true; }
  assert(rejected, "tampered archive was accepted");

  const future = TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env);
  future.schemaVersion = 3;
  rejected = false;
  try { TypeItUpProject.fromPortable(future, env); } catch (_) { rejected = true; }
  assert(rejected, "unsupported future schema was accepted");

  const optional = TypeItUpProject.toPortable(fixture, { row: 6, column: 12 }, env);
  optional.futureOptionalField = { retained: true };
  optional.pages[0].futurePageField = "retain me";
  optional.pages[0].objects.push({ id: "future-object", type: "future-optional", typeVersion: 1, sequence: 9, payload: { retained: true } });
  const reserialized = TypeItUpProject.toPortable(TypeItUpProject.fromPortable(optional, env).runtimeDoc, { row: 6, column: 12 }, env);
  assert(reserialized.futureOptionalField.retained && reserialized.pages[0].futurePageField === "retain me" && reserialized.pages[0].objects.some(o => o.type === "future-optional"), "unknown optional data was not preserved");

  const AppComponent = loadAppComponent(), component = new AppComponent({});
  component.save = () => {};
  const appDoc = component.normalize(component.blankDoc("office", "letter", "fresh"));
  component.state = { ...component.state, doc: appDoc, pi: 0, r: 6, c: 10, undoStack: [], redoStack: [] };
  assert(!TypeItUpProject.hasDefects(component.page.defects), "a new document page did not start clean");
  const originalPaperSeed = component.page.seed;
  component.setPageDefects({ wornEdges: 50, fold: "pocket", foldStrength: 70, tears: "mixed" });
  component.page.strikes.push({ r: 4, c: 10, ch: "X", order: 1 });
  const configuredDefects = JSON.stringify(component.page.defects);
  component.duplicatePageAt(0);
  assert(JSON.stringify(component.page.defects) === configuredDefects, "duplicating a page did not preserve its exact defect treatment");
  component.addPage();
  assert(!TypeItUpProject.hasDefects(component.page.defects), "a newly added page inherited defects instead of starting clean");
  const cleanPageSeed = component.page.defects.seed;
  component.state.pi = 0;
  component.applyDefectsAll();
  assert(component.d.pages.every(page => page.defects.fold === "pocket" && page.defects.tears === "mixed"), "apply-to-all did not copy defect settings");
  assert(component.d.pages[2].defects.seed === cleanPageSeed, "apply-to-all replaced another page's defect seed");
  const beforeRegenerate = JSON.stringify(component.page.strikes), beforeDefectSeed = component.page.defects.seed;
  component.regenerateDefects();
  assert(component.page.defects.seed !== beforeDefectSeed && component.page.seed === originalPaperSeed && JSON.stringify(component.page.strikes) === beforeRegenerate, "regenerating defects changed paper wear or editable content");
  component.undo();
  assert(component.page.defects.seed === beforeDefectSeed, "defect regeneration was not undoable");
  global.window.innerHeight = 900;
  component.state.vw = 1000;
  const rendered = component.renderVals();
  assert(rendered.railItems.some(item => item.key === "defects"), "Defects was not added to the Document toolbar");
  assert(rendered.defectTears.length === 2 && rendered.defectFolds.length === 3 && rendered.defectEdges.length > 0, "the editor did not receive the active page's defect layers");
  assert(rendered.defectEdges.every(edge => edge.d.startsWith("M") && edge.style.includes("stroke:#51341f") && edge.style.includes("filter:blur(") && !edge.style.includes("screen")), "the editor did not render worn edges as soft dark burn paths");
  assert(rendered.defectTears.every(tear => tear.rimStyle.includes("stroke:#a77b49") && tear.voidStyle.includes("drop-shadow") && !tear.rimStyle.includes("#f1dfbd")), "tear rendering still contains the unnatural pale center line");
  assert(rendered.defectTears.every(tear => tear.voidStyle.includes("fill:#100f0c")) && rendered.printPages[0].defectTears.every(tear => tear.voidStyle.includes("fill:#fff")), "editor and print tear backing colors are not separated");
  console.log("project-format tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
