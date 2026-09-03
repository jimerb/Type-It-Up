/* Type It Up portable project format. Kept dependency-free so projects work offline. */
(function (global) {
  "use strict";

  const FORMAT = "typeitup-project";
  const MIME = "application/vnd.typeitup.project+zip";
  const CONTAINER_VERSION = 1;
  const SCHEMA_VERSION = 2;
  const RENDERER_PROFILE = "classic-v2";
  const LEGACY_RENDERER_PROFILE = "classic-v1";
  const DEFECT_RENDERER_PROFILE = "page-defects-v1";
  const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
  const MAX_UNPACKED_BYTES = 150 * 1024 * 1024;
  const MAX_ENTRIES = 256;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function id() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    return [...bytes].map((v, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? "-" : "") + v.toString(16).padStart(2, "0")).join("");
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clampNumber(n, fallback) { return Number.isFinite(Number(n)) ? Number(n) : fallback; }
  function inkProfile(value) {
    const notch = Math.max(1, Math.min(8, Math.round(Math.max(0, Math.min(70, clampNumber(value, 10))) / 10) + 1));
    return { value: (notch - 1) * 10, mistypeMultiplier: [0, 0.5, 1, 1, 1.1, 1.1, 1, 1.05][notch - 1] };
  }
  function seedHash(seed) { let h = 2166136261; for (const ch of String(seed || "")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
  function rnd(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  const FOLD_PRESETS = new Set(["none", "half-horizontal", "half-vertical", "quarter", "letter-trifold", "pocket"]);
  const TEAR_PRESETS = new Set(["none", "edge-one", "edge-two", "interior-one", "interior-two", "mixed"]);
  const defectCache = new Map();
  function boundedNumber(value, fallback, min, max) { return Math.max(min, Math.min(max, clampNumber(value, fallback))); }
  function normalizeDefects(value, fallbackSeed) {
    const input = value && typeof value === "object" ? value : {};
    return {
      seed: String(input.seed || fallbackSeed || id()).slice(0, 128),
      wornEdges: Math.round(boundedNumber(input.wornEdges, 0, 0, 100)),
      fold: FOLD_PRESETS.has(input.fold) ? input.fold : "none",
      foldStrength: Math.round(boundedNumber(input.foldStrength, 35, 0, 100)),
      tears: TEAR_PRESETS.has(input.tears) ? input.tears : "none",
    };
  }
  function hasDefects(value) {
    const d = normalizeDefects(value, "clean");
    return d.wornEdges > 0 || d.fold !== "none" || d.tears !== "none";
  }
  function point(xMicroPt, yMicroPt) { return { xMicroPt: Math.round(xMicroPt), yMicroPt: Math.round(yMicroPt) }; }
  function pathData(points, scale, close) {
    if (!points || !points.length) return "";
    const d = points.map((p, i) => `${i ? "L" : "M"}${(p.xMicroPt * scale).toFixed(2)} ${(p.yMicroPt * scale).toFixed(2)}`).join(" ");
    return close ? `${d} Z` : d;
  }
  function resolvePageDefects(value, widthMicroPt, heightMicroPt) {
    const defects = normalizeDefects(value, "clean"), width = Math.max(1, clampNumber(widthMicroPt, 612000000)), height = Math.max(1, clampNumber(heightMicroPt, 792000000));
    const source = { size: `${Math.round(width)}x${Math.round(height)}`, wornEdges: defects.wornEdges, fold: defects.fold, foldStrength: defects.foldStrength, tears: defects.tears };
    const cacheKey = `${defects.seed}|${source.size}|${source.wornEdges}|${source.fold}|${source.foldStrength}|${source.tears}`;
    if (defectCache.has(cacheKey)) return clone(defectCache.get(cacheKey));
    const key = seedHash(defects.seed), inch = 72000000, edgeWear = [], folds = [], tears = [];
    const wearRatio = defects.wornEdges / 100;
    const edgeNames = ["top", "bottom", "left", "right"];
    const addEdgeBurn = (side, startRatio, endRatio, index, accent) => {
      const horizontal = side < 2, axis = horizontal ? width : height, points = [];
      const depth = inch * (accent ? .23 + wearRatio * .23 + rnd(index, 104, key) * .14 : .16 + wearRatio * .16 + rnd(index, 104, key) * .08);
      const blur = inch * (accent ? .075 + wearRatio * .07 + rnd(index, 105, key) * .055 : .055 + wearRatio * .045 + rnd(index, 105, key) * .035);
      for (let j = 0; j <= 6; j++) {
        const t = j / 6, along = axis * (startRatio + (endRatio - startRatio) * t);
        const envelope = Math.sin(Math.PI * t), uneven = inch * (.003 + rnd(index * 13 + j, 106, key) * (accent ? .022 : .012)) * envelope;
        if (side === 0) points.push(point(along, uneven));
        else if (side === 1) points.push(point(along, height - uneven));
        else if (side === 2) points.push(point(uneven, along));
        else points.push(point(width - uneven, along));
      }
      edgeWear.push({
        mode: "edge-burn",
        side: edgeNames[side],
        points,
        widthMicroPt: Math.round(depth * 2),
        blurMicroPt: Math.round(blur),
        opacity: Number((accent ? .025 + wearRatio * (.065 + rnd(index, 107, key) * .085) : .012 + wearRatio * (.025 + rnd(index, 107, key) * .035)).toFixed(4)),
      });
    };
    if (wearRatio) {
      // A faint, long pass on each edge creates a continuous burn-tool effect;
      // seeded accent passes make only some stretches noticeably darker.
      for (let side = 0; side < 4; side++) {
        const start = .01 + rnd(side, 101, key) * .09, end = .9 + rnd(side, 102, key) * .09;
        addEdgeBurn(side, start, end, side, false);
      }
      for (let i = 0, count = 1 + Math.round(wearRatio * 4); i < count; i++) {
        const side = Math.floor(rnd(i, 111, key) * 4), span = .2 + rnd(i, 112, key) * (.24 + wearRatio * .2);
        const start = .02 + rnd(i, 113, key) * Math.max(.02, .96 - span);
        addEdgeBurn(side, start, Math.min(.98, start + span), i + 10, true);
      }
    }

    const foldRatio = defects.foldStrength / 100;
    const addFold = (x1, y1, x2, y2, index) => {
      const dx = x2 - x1, dy = y2 - y1, len = Math.max(1, Math.hypot(dx, dy)), nx = -dy / len, ny = dx / len, points = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, envelope = Math.sin(Math.PI * t), wobble = (rnd(index * 17 + i, 111, key) - .5) * inch * .035 * envelope;
        points.push(point(x1 + dx * t + nx * wobble, y1 + dy * t + ny * wobble));
      }
      folds.push({ points, widthMicroPt: Math.round(inch * (.018 + foldRatio * .035)), opacity: Number((.08 + foldRatio * .24).toFixed(4)) });
    };
    const jitter = (index, range) => (rnd(index, 112, key) - .5) * range;
    if (defects.fold === "half-horizontal" || defects.fold === "quarter") addFold(0, height * (.5 + jitter(1, .018)), width, height * (.5 + jitter(1, .018)), 1);
    if (defects.fold === "half-vertical" || defects.fold === "quarter") addFold(width * (.5 + jitter(2, .018)), 0, width * (.5 + jitter(2, .018)), height, 2);
    if (defects.fold === "letter-trifold") {
      addFold(0, height * (1 / 3 + jitter(3, .014)), width, height * (1 / 3 + jitter(3, .014)), 3);
      addFold(0, height * (2 / 3 + jitter(4, .014)), width, height * (2 / 3 + jitter(4, .014)), 4);
    }
    if (defects.fold === "pocket") {
      addFold(width * .04, height * (.7 + jitter(5, .035)), width * (.54 + jitter(6, .04)), height * (.46 + jitter(7, .04)), 5);
      addFold(width * (.96 + jitter(8, .015)), height * (.9 + jitter(9, .03)), width * (.54 + jitter(10, .04)), height * (.46 + jitter(7, .04)), 6);
      addFold(width * (.16 + jitter(11, .03)), height * (.98 + jitter(12, .01)), width * (.54 + jitter(10, .04)), height * (.46 + jitter(7, .04)), 7);
    }

    const tearCounts = { "edge-one": [1, 0], "edge-two": [2, 0], "interior-one": [0, 1], "interior-two": [0, 2], mixed: [1, 1] }[defects.tears] || [0, 0];
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    for (let i = 0; i < tearCounts[0]; i++) {
      const side = Math.floor(rnd(i, 121, key) * 4), horizontal = side < 2, axis = horizontal ? width : height;
      const span = Math.min(axis * .18, inch * (.34 + rnd(i, 122, key) * .42)), depth = inch * (.055 + rnd(i, 123, key) * .12);
      const start = inch * .12 + rnd(i, 124, key) * Math.max(1, axis - span - inch * .24), end = start + span, inner = [];
      for (let j = 0; j <= 6; j++) {
        const at = start + span * (j / 6), bite = depth * (.35 + Math.sin(Math.PI * j / 6) * (.45 + rnd(i * 9 + j, 125, key) * .45));
        if (horizontal) inner.push(point(at, side === 0 ? bite : height - bite));
        else inner.push(point(side === 2 ? bite : width - bite, at));
      }
      let polygon;
      if (side === 0) polygon = [point(start, 0), point(end, 0), ...inner.slice().reverse()];
      else if (side === 1) polygon = [point(start, height), ...inner, point(end, height)];
      else if (side === 2) polygon = [point(0, start), ...inner, point(0, end)];
      else polygon = [point(width, start), point(width, end), ...inner.slice().reverse()];
      tears.push({ kind: "edge", points: polygon, rim: inner, rimClosed: false, fibers: [], renderStyle: "natural-rim", opacity: Number((.58 + rnd(i, 126, key) * .22).toFixed(4)) });
    }
    for (let i = 0; i < tearCounts[1]; i++) {
      const margin = inch * .55, cx = margin + rnd(i, 131, key) * Math.max(1, width - margin * 2), cy = margin + rnd(i, 132, key) * Math.max(1, height - margin * 2);
      const length = inch * (.38 + rnd(i, 133, key) * .34), opening = inch * (.15 + rnd(i, 134, key) * .16), angle = -.9 + rnd(i, 135, key) * 1.8;
      const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux, polygon = [];
      for (let j = 0; j < 12; j++) {
        const theta = Math.PI * 2 * j / 12, majorJitter = .8 + rnd(i * 17 + j, 136, key) * .34, minorJitter = .74 + rnd(i * 19 + j, 137, key) * .48;
        const major = Math.cos(theta) * length * .5 * majorJitter, minor = Math.sin(theta) * opening * .5 * minorJitter;
        polygon.push(point(clamp(cx + ux * major + nx * minor, inch * .08, width - inch * .08), clamp(cy + uy * major + ny * minor, inch * .08, height - inch * .08)));
      }
      const fibers = [];
      for (let j = 0; j < 5; j++) {
        const vertex = Math.floor(rnd(i * 23 + j, 139, key) * polygon.length), start = polygon[vertex];
        const dx = start.xMicroPt - cx, dy = start.yMicroPt - cy, distance = Math.max(1, Math.hypot(dx, dy)), fiberLength = inch * (.025 + rnd(i * 29 + j, 140, key) * .045);
        fibers.push([start, point(clamp(start.xMicroPt + dx / distance * fiberLength, inch * .06, width - inch * .06), clamp(start.yMicroPt + dy / distance * fiberLength, inch * .06, height - inch * .06))]);
      }
      tears.push({ kind: "interior", points: polygon, rim: polygon, rimClosed: true, fibers, renderStyle: "natural-rim", opacity: Number((.62 + rnd(i, 138, key) * .2).toFixed(4)) });
    }
    const resolved = { renderer: DEFECT_RENDERER_PROFILE, seed: defects.seed, source, edgeWear, folds, tears };
    defectCache.set(cacheKey, clone(resolved));
    if (defectCache.size > 128) defectCache.delete(defectCache.keys().next().value);
    return clone(resolved);
  }
  function xml(value) { return String(value == null ? "" : value).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c])); }
  function safeFilename(title) { return String(title || "Untitled document").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled document"; }

  // CRC32 is used by ZIP itself. SHA-256 in the manifest protects the payload.
  const crcTable = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  async function sha256(bytes) {
    if (global.crypto && global.crypto.subtle) {
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
    }
    // LAN HTTP is not a secure context, so Chrome hides crypto.subtle there. This deterministic fallback keeps local-only projects usable.
    const dataLength = bytes.length + 1 + ((64 - ((bytes.length + 1 + 8) % 64)) % 64) + 8, data = new Uint8Array(dataLength), words = new Uint32Array(64);
    data.set(bytes); data[bytes.length] = 128;
    const bits = bytes.length * 8, high = Math.floor(bits / 4294967296), low = bits >>> 0;
    data[dataLength - 8] = (high >>> 24) & 255; data[dataLength - 7] = (high >>> 16) & 255; data[dataLength - 6] = (high >>> 8) & 255; data[dataLength - 5] = high & 255;
    data[dataLength - 4] = (low >>> 24) & 255; data[dataLength - 3] = (low >>> 16) & 255; data[dataLength - 2] = (low >>> 8) & 255; data[dataLength - 1] = low & 255;
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const rotr = (value, shift) => (value >>> shift) | (value << (32 - shift));
    for (let base = 0; base < data.length; base += 64) {
      for (let i = 0; i < 16; i++) words[i] = ((data[base + i * 4] << 24) | (data[base + i * 4 + 1] << 16) | (data[base + i * 4 + 2] << 8) | data[base + i * 4 + 3]) >>> 0;
      for (let i = 16; i < 64; i++) { const a = words[i - 15], b = words[i - 2]; words[i] = (words[i - 16] + (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) + words[i - 7] + (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10))) >>> 0; }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) { const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), choose = (e & f) ^ (~e & g), t1 = (h + s1 + choose + constants[i] + words[i]) >>> 0, s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), majority = (a & b) ^ (a & c) ^ (b & c), t2 = (s0 + majority) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0; }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map(value => value.toString(16).padStart(8, "0")).join("");
  }
  function u16(view, at) { return view[at] | (view[at + 1] << 8); }
  function u32(view, at) { return (view[at] | (view[at + 1] << 8) | (view[at + 2] << 16) | (view[at + 3] << 24)) >>> 0; }
  function put16(view, at, value) { view[at] = value & 255; view[at + 1] = (value >>> 8) & 255; }
  function put32(view, at, value) { view[at] = value & 255; view[at + 1] = (value >>> 8) & 255; view[at + 2] = (value >>> 16) & 255; view[at + 3] = (value >>> 24) & 255; }
  function join(parts, length) { const result = new Uint8Array(length); let at = 0; parts.forEach(p => { result.set(p, at); at += p.length; }); return result; }

  // Produces standards-compliant ZIP files with stored entries. Reading additionally supports normal deflated ZIP entries.
  function zipStore(entries) {
    let offset = 0;
    const local = [], central = [];
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const entry of entries) {
      const name = enc.encode(entry.path), data = entry.data instanceof Uint8Array ? entry.data : enc.encode(entry.data);
      const crc = crc32(data), h = new Uint8Array(30 + name.length);
      put32(h, 0, 0x04034b50); put16(h, 4, 20); put16(h, 6, 0x0800); put16(h, 8, 0);
      put16(h, 10, dosTime); put16(h, 12, dosDate); put32(h, 14, crc); put32(h, 18, data.length); put32(h, 22, data.length); put16(h, 26, name.length); put16(h, 28, 0); h.set(name, 30);
      local.push(h, data);
      const c = new Uint8Array(46 + name.length);
      put32(c, 0, 0x02014b50); put16(c, 4, 20); put16(c, 6, 20); put16(c, 8, 0x0800); put16(c, 10, 0); put16(c, 12, dosTime); put16(c, 14, dosDate);
      put32(c, 16, crc); put32(c, 20, data.length); put32(c, 24, data.length); put16(c, 28, name.length); put16(c, 30, 0); put16(c, 32, 0); put16(c, 34, 0); put16(c, 36, 0); put32(c, 38, 0); put32(c, 42, offset); c.set(name, 46);
      central.push(c); offset += h.length + data.length;
    }
    const centralSize = central.reduce((n, p) => n + p.length, 0), end = new Uint8Array(22);
    put32(end, 0, 0x06054b50); put16(end, 4, 0); put16(end, 6, 0); put16(end, 8, entries.length); put16(end, 10, entries.length); put32(end, 12, centralSize); put32(end, 16, offset); put16(end, 20, 0);
    return join([...local, ...central, end], offset + centralSize + end.length);
  }
  function safePath(path) { return typeof path === "string" && path.length > 0 && path.length < 240 && !path.includes("\\") && !path.startsWith("/") && !path.split("/").includes(".."); }
  async function inflateRaw(bytes) {
    if (!global.DecompressionStream) throw new Error("This browser cannot open compressed Type It Up packages.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer);
    if (!bytes.length || bytes.length > MAX_ARCHIVE_BYTES) throw new Error("Project package is empty or exceeds the 50 MB safety limit.");
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("Not a valid Type It Up ZIP package.");
    const count = u16(bytes, eocd + 10), centralOffset = u32(bytes, eocd + 16);
    if (!count || count > MAX_ENTRIES || centralOffset >= bytes.length) throw new Error("Project package has an unsafe ZIP directory.");
    let at = centralOffset, total = 0; const entries = new Map();
    for (let i = 0; i < count; i++) {
      if (u32(bytes, at) !== 0x02014b50 || at + 46 > bytes.length) throw new Error("Project package ZIP directory is corrupt.");
      const flags = u16(bytes, at + 8), method = u16(bytes, at + 10), crc = u32(bytes, at + 16), compressed = u32(bytes, at + 20), uncompressed = u32(bytes, at + 24), nameLen = u16(bytes, at + 28), extraLen = u16(bytes, at + 30), commentLen = u16(bytes, at + 32), localOffset = u32(bytes, at + 42);
      const name = dec.decode(bytes.slice(at + 46, at + 46 + nameLen)); at += 46 + nameLen + extraLen + commentLen;
      if ((flags & 1) || !safePath(name) || entries.has(name) || uncompressed > MAX_UNPACKED_BYTES || compressed > MAX_ARCHIVE_BYTES) throw new Error("Project package contains an unsafe ZIP entry.");
      if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) throw new Error("Project package ZIP entry is corrupt.");
      const localNameLen = u16(bytes, localOffset + 26), localExtraLen = u16(bytes, localOffset + 28), dataAt = localOffset + 30 + localNameLen + localExtraLen;
      if (dataAt + compressed > bytes.length) throw new Error("Project package ZIP entry is truncated.");
      let data = bytes.slice(dataAt, dataAt + compressed);
      if (method === 8) data = await inflateRaw(data); else if (method !== 0) throw new Error("Project package uses an unsupported ZIP compression method.");
      if (data.length !== uncompressed || crc32(data) !== crc) throw new Error("Project package entry failed its integrity check.");
      total += data.length; if (total > MAX_UNPACKED_BYTES) throw new Error("Project package exceeds the unpacked safety limit.");
      entries.set(name, data);
    }
    return entries;
  }

  function required(value, name) { if (!value) throw new Error(`Project document is missing ${name}.`); return value; }
  function validateJson(value, depth = 0) {
    if (depth > 32) throw new Error("Project JSON is nested too deeply.");
    if (value == null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("Project JSON contains an invalid number."); return; }
    if (Array.isArray(value)) { if (value.length > 100000) throw new Error("Project contains too many objects."); value.forEach(v => validateJson(v, depth + 1)); return; }
    if (typeof value === "object") { Object.keys(value).forEach(k => { if (k === "__proto__" || k === "constructor" || k === "prototype") throw new Error("Project JSON contains an unsafe key."); validateJson(value[k], depth + 1); }); return; }
    throw new Error("Project JSON contains an unsupported value.");
  }
  function validatePortable(doc) {
    validateJson(doc);
    if (!doc || doc.type !== FORMAT) throw new Error("This is not a Type It Up project.");
    if (doc.schemaVersion > SCHEMA_VERSION) throw new Error("This project needs a newer version of Type It Up.");
    if (doc.schemaVersion < 1) throw new Error("This project format is too old to migrate safely.");
    if (!Array.isArray(doc.pages) || !doc.pages.length) throw new Error("Project has no pages.");
    const expectedRenderer = doc.schemaVersion === 1 ? LEGACY_RENDERER_PROFILE : RENDERER_PROFILE;
    if (!doc.renderer || doc.renderer.profile !== expectedRenderer) throw new Error("This project uses an unsupported renderer profile.");
    const requiredFeatures = (doc.features && doc.features.required) || [];
    const supported = new Set(["classic-scene", DEFECT_RENDERER_PROFILE]);
    const unknown = requiredFeatures.find(f => !supported.has(f));
    if (unknown) throw new Error(`This project requires the unsupported feature: ${unknown}.`);
    doc.pages.forEach((p, i) => { required(p.id, `page ${i + 1} ID`); if (!Array.isArray(p.objects)) throw new Error(`Page ${i + 1} has invalid objects.`); });
    return doc;
  }
  function ensureRuntimeIds(doc) {
    if (!doc || !Array.isArray(doc.pages)) return doc;
    doc._tiu = doc._tiu || {};
    if (!doc._tiu.projectId) doc._tiu.projectId = id();
    if (!Number.isFinite(doc._tiu.revision)) doc._tiu.revision = 0;
    const seen = new Set();
    doc.pages.forEach(page => {
      if (!page.id || seen.has(page.id)) page.id = id(); seen.add(page.id);
      ["strikes", "whiteouts", "highlights", "strokes"].forEach(list => {
        page[list] = Array.isArray(page[list]) ? page[list] : [];
        page[list].forEach(object => { if (!object.id || seen.has(object.id)) object.id = id(); seen.add(object.id); });
      });
    });
    return doc;
  }
  function maxSequence(doc) {
    let max = 0;
    (doc.pages || []).forEach(page => ["strikes", "whiteouts", "highlights", "strokes"].forEach(k => (page[k] || []).forEach(o => { max = Math.max(max, Number(o.order) || 0); })));
    return Math.ceil(max) + 1;
  }
  function strikeVisual(doc, page, strike, env) {
    if (strike.visual) return clone(strike.visual);
    const machine = (env.machines || {})[doc.machine] || { jit: 0.55, ink: 1 };
    const wear = Math.max(0, Math.min(100, clampNumber(doc.mwear, 10))) / 100, seed = seedHash(page.seed), order = Math.floor((strike.order || 0) * 1000);
    const ink = inkProfile(doc.ink), jit = machine.jit * (0.3 + wear * 4), drop = rnd(strike.r, strike.c, seed + order + 29) < (ink.value / 420 + wear * 0.45) * ink.mistypeMultiplier ? 0.36 : 1;
    const pressure = 1 - wear * 0.16 + rnd(strike.r, strike.c, seed + order + 41) * wear * 0.24;
    const opacity = Math.max(.2, .72 + .28 * machine.ink - ink.value / 100 * .28) * drop * pressure;
    return { dx: (rnd(strike.r, strike.c, seed + order + 7) - .5) * jit, dy: (rnd(strike.r, strike.c, seed + order + 13) - .5) * jit, dropout: drop, pressure, opacity, renderer: RENDERER_PROFILE };
  }
  function resolvedPaper(doc, page, env) {
    const size = (env.sizes || {})[doc.size] || { w: 8.5, h: 11 }, width = size.w * 72000000, height = size.h * 72000000;
    const wear = Math.max(0, Math.min(100, clampNumber(doc.wear, 4))) / 100, machineWear = Math.max(0, Math.min(100, clampNumber(doc.mwear, 10))) / 100, seed = seedHash(page.seed);
    const defects = [];
    for (let i = 0, count = Math.round(wear * 72); i < count; i++) defects.push({ kind: Math.floor(rnd(i, 4, seed + 5) * 4), xMicroPt: Math.round(rnd(i, 1, seed) * width), yMicroPt: Math.round(rnd(i, 2, seed + 3) * height), size: Number((1 + rnd(i, 8, seed) * (2 + wear * 5)).toFixed(4)), strength: Number(((.45 + rnd(i, 6, seed + 7) * .8) * (.04 + wear * .2)).toFixed(6)) });
    const machineMarks = [];
    for (let i = 0, count = Math.round(machineWear * 14); i < count; i++) machineMarks.push({ xMicroPt: Math.round(rnd(i, 11, seed) * width), yMicroPt: Math.round(rnd(i, 12, seed + 3) * height), widthMicroPt: Math.round((44 + rnd(i, 13, seed) * (72 + machineWear * 170)) * 900000), angle: Number((-5 + rnd(i, 14, seed) * 10).toFixed(4)) });
    const age = clampNumber(doc.age, 50) / 100;
    return { renderer: RENDERER_PROFILE, seed: page.seed, source: { age: clampNumber(doc.age, 50), wear: clampNumber(doc.wear, 4), machineWear: clampNumber(doc.mwear, 10), size: doc.size }, paperColors: [[252 - age * 20, 247 - age * 27, 238 - age * 42], [248 - age * 22, 240 - age * 28, 226 - age * 44], [243 - age * 26, 233 - age * 30, 215 - age * 46]].map(c => c.map(Math.round)), noiseOpacity: Number((.035 + wear * .26).toFixed(6)), defects, machineMarks };
  }
  function effectiveResolvedPaper(doc, page, env) {
    const current = page._tiuAppearance;
    if (current && current.renderer === RENDERER_PROFILE && current.seed === page.seed && current.source && current.source.age === clampNumber(doc.age, 50) && current.source.wear === clampNumber(doc.wear, 4) && current.source.machineWear === clampNumber(doc.mwear, 10) && current.source.size === doc.size) return clone(current);
    return resolvedPaper(doc, page, env);
  }
  function effectiveResolvedDefects(doc, page, env) {
    const size = (env.sizes || {})[doc.size] || { w: 8.5, h: 11 }, width = size.w * 72000000, height = size.h * 72000000;
    const defects = normalizeDefects(page.defects, `${page.seed || "page"}-defects`), current = page._tiuDefectsResolved;
    const expected = { size: `${Math.round(width)}x${Math.round(height)}`, wornEdges: defects.wornEdges, fold: defects.fold, foldStrength: defects.foldStrength, tears: defects.tears };
    const finite = value => Number.isFinite(Number(value)), edgeNames = new Set(["top", "bottom", "left", "right"]);
    const validPoint = value => value && finite(value.xMicroPt) && finite(value.yMicroPt) && value.xMicroPt >= 0 && value.xMicroPt <= width && value.yMicroPt >= 0 && value.yMicroPt <= height;
    const validResolved = current && current.renderer === DEFECT_RENDERER_PROFILE && current.seed === defects.seed && current.source && Object.keys(expected).every(key => current.source[key] === expected[key]) &&
      Array.isArray(current.edgeWear) && current.edgeWear.length <= 12 && current.edgeWear.every(mark => mark && mark.mode === "edge-burn" && edgeNames.has(mark.side) && Array.isArray(mark.points) && mark.points.length >= 2 && mark.points.length <= 8 && mark.points.every(validPoint) && finite(mark.widthMicroPt) && mark.widthMicroPt >= 0 && mark.widthMicroPt <= 108000000 && finite(mark.blurMicroPt) && mark.blurMicroPt >= 0 && mark.blurMicroPt <= 18000000 && finite(mark.opacity) && mark.opacity >= 0 && mark.opacity <= 1) &&
      Array.isArray(current.folds) && current.folds.length <= 3 && current.folds.every(fold => Array.isArray(fold.points) && fold.points.length <= 8 && fold.points.every(validPoint) && finite(fold.widthMicroPt) && fold.widthMicroPt >= 0 && fold.widthMicroPt <= 7200000 && finite(fold.opacity) && fold.opacity >= 0 && fold.opacity <= 1) &&
      Array.isArray(current.tears) && current.tears.length <= 2 && current.tears.every(tear => tear && tear.renderStyle === "natural-rim" && Array.isArray(tear.points) && tear.points.length <= 20 && tear.points.every(validPoint) && Array.isArray(tear.rim) && tear.rim.length <= 20 && tear.rim.every(validPoint) && Array.isArray(tear.fibers) && tear.fibers.length <= 6 && tear.fibers.every(fiber => Array.isArray(fiber) && fiber.length === 2 && fiber.every(validPoint)) && finite(tear.opacity) && tear.opacity >= 0 && tear.opacity <= 1);
    if (validResolved) return clone(current);
    return resolvePageDefects(defects, width, height);
  }
  function microPointsForCell(column, machine) { return Math.round((Number(column) || 0) * 72000000 / machine.cpi); }
  function makeMachineProfiles(env) {
    return Object.entries(env.machines || {}).map(([profileId, m]) => ({ id: profileId, version: 1, name: m.name, cpi: m.cpi, lineSpacingMicroPt: 12000000, margins: { leftMicroPt: 7200000, rightMicroPt: 7200000 }, bell: { columnsBeforeRight: 8 }, imprint: { jitter: m.jit, density: m.ink }, typeface: { family: "Courier Prime", asset: null } }));
  }
  async function embeddedTypefaceAssets() {
    const source = "./assets/fonts/CourierPrime-Regular.ttf";
    let response;
    try { response = await fetch(source, { cache: "no-store" }); } catch (_) { throw new Error("The required Courier Prime typeface could not be bundled. Serve Type It Up from its project folder and try again."); }
    if (!response.ok) throw new Error("The required Courier Prime typeface could not be bundled.");
    const data = new Uint8Array(await response.arrayBuffer());
    if (!data.length || data.length > 2 * 1024 * 1024) throw new Error("The bundled typeface is invalid.");
    const digest = await sha256(data), assetId = `sha256:${digest}`;
    return [{ id: assetId, path: `assets/${digest}.ttf`, mediaType: "font/ttf", role: "typeface", sha256: digest, data }];
  }
  function makePreview(page, runtime, env) {
    const size = (env.sizes || {})[runtime.size] || { w: 8.5, h: 11 }, machine = (env.machines || {})[runtime.machine] || { cpi: 10 };
    const width = Math.round(size.w * 96), height = Math.round(size.h * 96), cell = 96 / machine.cpi, line = 16, age = clampNumber(runtime.age, 0) / 100;
    const background = `rgb(${Math.round(252 - age * 20)},${Math.round(247 - age * 27)},${Math.round(238 - age * 42)})`;
    const objs = [], resolvedDefects = effectiveResolvedDefects(runtime, page, env), unit = 96 / 72000000;
    const under = [];
    (resolvedDefects.edgeWear || []).forEach(mark => {
      const strokeWidth = Math.max(1, mark.widthMicroPt * unit), blur = Math.max(.5, mark.blurMicroPt * unit);
      under.push(`<path d="${pathData(mark.points, unit, false)}" fill="none" stroke="#51341f" stroke-opacity="${mark.opacity}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" style="filter:blur(${blur.toFixed(2)}px);mix-blend-mode:multiply"/>`);
    });
    (resolvedDefects.folds || []).forEach(fold => {
      const d = pathData(fold.points, unit, false), strokeWidth = Math.max(.5, fold.widthMicroPt * unit);
      under.push(`<path d="${d}" fill="none" stroke="#6f5335" stroke-opacity="${fold.opacity}" stroke-width="${strokeWidth.toFixed(2)}"/><path d="${d}" fill="none" stroke="#fffaf0" stroke-opacity="${(fold.opacity * .72).toFixed(4)}" stroke-width="${Math.max(.35, strokeWidth * .42).toFixed(2)}" transform="translate(0 ${(strokeWidth * .42).toFixed(2)})"/>`);
    });
    (page.whiteouts || []).forEach(w => objs.push(`<rect x="${w.c0 * cell}" y="${w.r * line}" width="${(w.c1 - w.c0 + 1) * cell}" height="${line}" fill="#f7f1e5"/>`));
    (page.strikes || []).forEach(s => objs.push(`<text x="${s.c * cell}" y="${s.r * line + line * .78}" font-family="Courier Prime,monospace" font-size="${cell / .6}" fill="#26201a">${xml(s.ch)}</text>`));
    (page.highlights || []).forEach(h => objs.push(`<rect x="${h.c0 * cell}" y="${h.r * line + 3}" width="${(h.c1 - h.c0 + 1) * cell}" height="${line - 6}" fill="#f0d658" fill-opacity=".55"/>`));
    (page.strokes || []).forEach(st => { const points = (st.pts || []).map(p => `${p[0]},${p[1]}`).join(" "); if (points) objs.push(`<polyline points="${points}" fill="none" stroke="#2b2824" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`); });
    const over = (resolvedDefects.tears || []).map(tear => {
      const fiberPath = (tear.fibers || []).map(fiber => pathData(fiber, unit, false)).join(" ");
      return `<path d="${pathData(tear.points, unit, true)}" fill="#fff" stroke="#3f2b19" stroke-opacity="${tear.opacity}" stroke-width="1.15" stroke-linejoin="round" style="filter:drop-shadow(1.2px 1.5px 1.1px rgba(42,25,12,.58))"/><path d="${pathData(tear.rim, unit, !!tear.rimClosed)}" fill="none" stroke="#a77b49" stroke-opacity=".78" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2.2 1.1 .65 1.5"/><path d="${fiberPath}" fill="none" stroke="#79512e" stroke-opacity=".62" stroke-width=".45" stroke-linecap="round"/>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${background}"/>${under.join("")}${objs.join("")}${over.join("")}</svg>`;
  }
  function toPortable(runtimeDoc, resume, env) {
    const doc = ensureRuntimeIds(runtimeDoc), sizes = env.sizes || {}, machine = (env.machines || {})[doc.machine] || { cpi: 10 };
    const now = new Date().toISOString(), next = Math.max(maxSequence(doc), Number(doc._tiu.nextObjectSequence) || 1);
    doc._tiu.nextObjectSequence = next;
    const portable = {
      type: FORMAT, schemaVersion: SCHEMA_VERSION, id: doc._tiu.projectId, title: doc.title || "Untitled document", createdAt: doc._tiu.createdAt || (doc._tiu.createdAt = now), modifiedAt: now, revision: (doc._tiu.revision = (Number(doc._tiu.revision) || 0) + 1),
      renderer: { profile: RENDERER_PROFILE, version: 2, assets: [] }, features: { required: ["classic-scene", ...(doc.pages.some(page => hasDefects(page.defects)) ? [DEFECT_RENDERER_PROFILE] : [])], optional: [] }, units: "micro-point",
      defaults: {
        machineProfileId: doc.machine, paper: { presetId: doc.size, age: clampNumber(doc.age, 50), wear: clampNumber(doc.wear, 4), resolved: { seedStrategy: "per-page", renderer: RENDERER_PROFILE } },
        ribbon: { color: doc.inkColor || "black", condition: clampNumber(doc.ink, 10) }, machineWear: clampNumber(doc.mwear, 10), correction: { intensity: clampNumber(doc.markI, 50), showMarks: true },
        drawing: { activeNib: doc.nib || "pen", colors: clone(doc.nibColors || {}), sizes: clone(doc.nibSizes || {}) }, carriage: { autoReturn: !!doc.autoReturn, margins: { leftMicroPt: 7200000, rightMicroPt: 7200000 }, tabStopsColumns: [] }
      },
      machineProfiles: makeMachineProfiles(env), nextObjectSequence: next,
      pages: doc.pages.map((page, index) => {
        const preset = sizes[doc.size] || { w: 8.5, h: 11 };
        const objects = [];
        (page.strikes || []).forEach(o => objects.push({ id: o.id, type: "strike", typeVersion: 1, sequence: o.order || 0, character: o.ch, grid: { row: o.r, column: o.c }, position: { xMicroPt: microPointsForCell(o.c, machine), yMicroPt: Math.round((o.r || 0) * 12000000) }, machineProfileId: doc.machine, ribbon: { color: doc.inkColor || "black" }, style: { offset: o.off || 0 }, resolved: strikeVisual(doc, page, o, env) }));
        (page.whiteouts || []).forEach(o => objects.push({ id: o.id, type: "correction", typeVersion: 1, sequence: o.order || 0, grid: { row: o.r, startColumn: o.c0, endColumn: o.c1 }, style: { intensity: clampNumber(doc.markI, 50), material: "whiteout", visible: true, blend: "normal" }, resolved: { renderer: RENDERER_PROFILE } }));
        (page.highlights || []).forEach(o => objects.push({ id: o.id, type: "highlight", typeVersion: 1, sequence: o.order || 0, grid: { row: o.r, startColumn: o.c0, endColumn: o.c1 }, style: { color: o.color, weight: o.bold, opacity: 0.6, blend: "multiply" }, resolved: { renderer: RENDERER_PROFILE } }));
        (page.strokes || []).forEach(o => objects.push({ id: o.id, type: "freehand", typeVersion: 1, sequence: o.order || 0, nib: o.nib, color: o.color, size: o.size, points: (o.pts || []).map(p => ({ xMicroPt: Math.round(p[0] * 900000), yMicroPt: Math.round(p[1] * 900000) })), resolved: { opacity: o.nib === "pencil" ? 0.62 : 0.92, blend: "normal", renderer: RENDERER_PROFILE } }));
        (page._tiuUnknownObjects || []).forEach(o => objects.push(clone(o)));
        const defects = normalizeDefects(page.defects, `${page.seed || page.id}-defects`);
        return { ...clone(page._tiuUnknown || {}), id: page.id, index, format: { presetId: doc.size, widthMicroPt: Math.round(preset.w * 72000000), heightMicroPt: Math.round(preset.h * 72000000), orientation: "portrait" }, appearance: { seed: page.seed, semantic: { age: clampNumber(doc.age, 50), wear: clampNumber(doc.wear, 4) }, resolved: effectiveResolvedPaper(doc, page, env), defects: { seed: defects.seed, semantic: { wornEdges: defects.wornEdges, fold: defects.fold, foldStrength: defects.foldStrength, tears: defects.tears }, resolved: effectiveResolvedDefects(doc, page, env) } }, objects: objects.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)), extensions: clone(page.extensions || {}) };
      }),
      resume: { activePageId: (resume && resume.activePageId) || doc.pages[0].id, caret: { row: clampNumber(resume && resume.row, 6), column: clampNumber(resume && resume.column, machine.cpi), xMicroPt: microPointsForCell(clampNumber(resume && resume.column, machine.cpi), machine), yMicroPt: Math.round(clampNumber(resume && resume.row, 6) * 12000000) } }, extensions: clone(doc._tiuExtensions || {})
    };
    Object.assign(portable, clone(doc._tiuUnknown || {}));
    return portable;
  }
  function fromPortable(input, env) {
    const doc = validatePortable(clone(input));
    const defaults = doc.defaults || {}, paper = defaults.paper || {}, drawing = defaults.drawing || {}, correction = defaults.correction || {}, sizes = env.sizes || {};
    const size = sizes[paper.presetId] ? paper.presetId : "letter";
    const knownDocumentKeys = new Set(["type", "schemaVersion", "id", "title", "createdAt", "modifiedAt", "revision", "renderer", "features", "units", "defaults", "machineProfiles", "nextObjectSequence", "pages", "resume", "extensions"]);
    const unknownDocument = Object.fromEntries(Object.entries(doc).filter(([key]) => !knownDocumentKeys.has(key)));
    const runtime = { title: doc.title || "Untitled document", machine: defaults.machineProfileId || "office", size, pages: [], age: clampNumber(paper.age, 50), wear: clampNumber(paper.wear, 4), ink: clampNumber(defaults.ribbon && defaults.ribbon.condition, 10), mwear: clampNumber(defaults.machineWear, 10), markI: clampNumber(correction.intensity, 50), inkColor: (defaults.ribbon && defaults.ribbon.color) || "black", hiColor: (drawing.colors && drawing.colors.marker) || "yellow", hiBold: clampNumber(drawing.sizes && drawing.sizes.marker, 50), autoReturn: !!(defaults.carriage && defaults.carriage.autoReturn), nib: drawing.activeNib || "pen", nibColors: clone(drawing.colors || { marker: "yellow", pen: "black", pencil: "graphite" }), nibSizes: clone(drawing.sizes || { marker: 50, pen: 45, pencil: 40 }), _tiu: { projectId: doc.id, createdAt: doc.createdAt, revision: doc.revision, nextObjectSequence: doc.nextObjectSequence || 1 }, _tiuExtensions: clone(doc.extensions || {}), _tiuUnknown: clone(unknownDocument) };
    doc.pages.forEach(page => {
      const knownPageKeys = new Set(["id", "index", "format", "appearance", "objects", "extensions"]);
      const appearance = page.appearance || {}, portableDefects = appearance.defects || {}, semanticDefects = portableDefects.semantic || {};
      const p = { id: page.id, seed: appearance.seed, defects: normalizeDefects({ seed: portableDefects.seed, ...semanticDefects }, `${appearance.seed || page.id}-defects`), strikes: [], whiteouts: [], highlights: [], strokes: [], extensions: clone(page.extensions || {}), _tiuAppearance: clone(appearance.resolved || null), _tiuDefectsResolved: clone(portableDefects.resolved || null), _tiuUnknown: Object.fromEntries(Object.entries(page).filter(([key]) => !knownPageKeys.has(key))), _tiuUnknownObjects: [] };
      page.objects.forEach(o => {
        if (o.type === "strike") p.strikes.push({ id: o.id, r: o.grid.row, c: o.grid.column, ch: o.character, order: o.sequence, off: o.style && o.style.offset || 0, visual: clone(o.resolved || {}) });
        else if (o.type === "correction") p.whiteouts.push({ id: o.id, r: o.grid.row, c0: o.grid.startColumn, c1: o.grid.endColumn, order: o.sequence, fresh: 0 });
        else if (o.type === "highlight") p.highlights.push({ id: o.id, r: o.grid.row, c0: o.grid.startColumn, c1: o.grid.endColumn, order: o.sequence, color: o.style && o.style.color, bold: o.style && o.style.weight });
        else if (o.type === "freehand") p.strokes.push({ id: o.id, nib: o.nib, color: o.color, size: o.size, order: o.sequence, pts: (o.points || []).map(point => [point.xMicroPt / 900000, point.yMicroPt / 900000]) });
        else p._tiuUnknownObjects.push(clone(o));
      });
      runtime.pages.push(p);
    });
    ensureRuntimeIds(runtime);
    const pi = Math.max(0, runtime.pages.findIndex(p => p.id === (doc.resume && doc.resume.activePageId)));
    return { runtimeDoc: runtime, resume: { pageIndex: pi, row: clampNumber(doc.resume && doc.resume.caret && doc.resume.caret.row, 6), column: clampNumber(doc.resume && doc.resume.caret && doc.resume.caret.column, (env.machines || {}).office.cpi || 10) }, portable: doc };
  }
  async function buildPackage(runtimeDoc, resume, env) {
    const portable = toPortable(runtimeDoc, resume, env), bundledAssets = await embeddedTypefaceAssets(), entries = [];
    portable.renderer.assets = bundledAssets.map(({ data, ...asset }) => asset);
    portable.machineProfiles.forEach(profile => { profile.typeface.asset = bundledAssets[0].id; });
    const documentBytes = enc.encode(JSON.stringify(portable));
    entries.push({ path: "document.json", data: documentBytes });
    for (const page of runtimeDoc.pages) entries.push({ path: `previews/page-${page.id}.svg`, data: enc.encode(makePreview(page, runtimeDoc, env)) });
    bundledAssets.forEach(asset => entries.push({ path: asset.path, data: asset.data }));
    const integrity = {};
    for (const entry of entries) integrity[entry.path] = { sha256: await sha256(entry.data), bytes: entry.data.length };
    const manifest = { type: FORMAT, contentType: MIME, containerVersion: CONTAINER_VERSION, documentSchemaVersion: SCHEMA_VERSION, rendererProfile: RENDERER_PROFILE, minimumReader: 2, document: "document.json", entries: integrity, createdAt: new Date().toISOString() };
    const zip = zipStore([{ path: "mimetype", data: MIME }, { path: "manifest.json", data: JSON.stringify(manifest) }, ...entries]);
    return { blob: new Blob([zip], { type: MIME }), filename: `${safeFilename(portable.title)}.tiu`, portable, manifest };
  }
  async function importPackage(file, env) {
    const entries = await unzip(await file.arrayBuffer());
    const mime = dec.decode(required(entries.get("mimetype"), "mimetype"));
    if (mime !== MIME) throw new Error("This ZIP file is not a Type It Up project.");
    let manifest; try { manifest = JSON.parse(dec.decode(required(entries.get("manifest.json"), "manifest.json"))); } catch (_) { throw new Error("Project manifest is not valid JSON."); }
    if (!manifest || manifest.type !== FORMAT || manifest.contentType !== MIME || manifest.containerVersion > CONTAINER_VERSION) throw new Error("This project package needs a newer version of Type It Up.");
    for (const [path, check] of Object.entries(manifest.entries || {})) {
      const data = entries.get(path); if (!data) throw new Error(`Project is missing ${path}.`);
      if (!check || check.bytes !== data.length || check.sha256 !== await sha256(data)) throw new Error(`Project integrity check failed for ${path}.`);
    }
    let portable; try { portable = JSON.parse(dec.decode(required(entries.get(manifest.document || "document.json"), "document.json"))); } catch (_) { throw new Error("Project document is not valid JSON."); }
    const assets = portable.renderer && portable.renderer.assets || [];
    for (const asset of assets) {
      const data = entries.get(asset.path);
      if (!data || !asset.sha256 || asset.sha256 !== await sha256(data)) throw new Error("Project is missing or has altered an appearance-critical asset.");
    }
    return fromPortable(portable, env);
  }

  const DB = "typeitup.projects.v1", STORE_REVISIONS = "revisions", STORE_META = "meta";
  function dbOpen() { return new Promise((resolve, reject) => { if (!global.indexedDB) return reject(new Error("IndexedDB is unavailable.")); const req = indexedDB.open(DB, 1); req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE_REVISIONS)) db.createObjectStore(STORE_REVISIONS, { keyPath: "key" }); if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: "key" }); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  async function autosave(runtimeDoc, resume, env) {
    const portable = toPortable(runtimeDoc, resume, env), db = await dbOpen(), key = `${portable.id}:${portable.revision}:${Date.now()}`;
    await new Promise((resolve, reject) => { const tx = db.transaction([STORE_REVISIONS, STORE_META], "readwrite"), revisions = tx.objectStore(STORE_REVISIONS), meta = tx.objectStore(STORE_META); const active = { key: "active", projectId: portable.id, revisions: [key], savedAt: Date.now() }; const old = meta.get("active"); old.onsuccess = () => { const previous = old.result; if (previous && previous.projectId === portable.id) active.revisions = [key, ...(previous.revisions || [])].slice(0, 2); revisions.put({ key, projectId: portable.id, document: portable, savedAt: active.savedAt }); meta.put(active); }; old.onerror = () => reject(old.error); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close(); return portable;
  }
  async function loadAutosave(env) {
    const db = await dbOpen(), active = await new Promise((resolve, reject) => { const tx = db.transaction(STORE_META, "readonly"), req = tx.objectStore(STORE_META).get("active"); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    if (!active || !active.revisions || !active.revisions.length) { db.close(); return null; }
    for (const key of active.revisions) { const stored = await new Promise((resolve, reject) => { const tx = db.transaction(STORE_REVISIONS, "readonly"), req = tx.objectStore(STORE_REVISIONS).get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); try { if (stored) { db.close(); return fromPortable(stored.document, env); } } catch (_) {} }
    db.close(); return null;
  }
  async function download(runtimeDoc, resume, env) { const result = await buildPackage(runtimeDoc, resume, env); const url = URL.createObjectURL(result.blob), a = document.createElement("a"); a.href = url; a.download = result.filename; a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); return result; }

  global.TypeItUpProject = { MIME, FORMAT, SCHEMA_VERSION, id, ensureRuntimeIds, maxSequence, normalizeDefects, hasDefects, resolvePageDefects, effectiveResolvedDefects, toPortable, fromPortable, buildPackage, importPackage, download, autosave, loadAutosave };
})(window);
