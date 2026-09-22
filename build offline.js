#!/usr/bin/env node
/**
 * build-offline.js
 *
 * Downloads the v86 engine files (libv86.js, v86.wasm, seabios.bin, vgabios.bin)
 * plus a small FreeDOS floppy image, base64-encodes the binaries, and injects
 * everything into x86-emulator-offline-template.html to produce a single,
 * fully self-contained x86-emulator-offline.html that needs zero network
 * to boot FreeDOS (KolibriOS/Linux still fetch their larger disk image once,
 * then cache it in the browser — see the running page for details).
 *
 * Requires Node.js 18+ (for built-in fetch). Run with:
 *   node build-offline.js
 */
 
const fs = require("fs");
const path = require("path");
 
const TEMPLATE = path.join(__dirname, "x86-emulator-offline-template.html");
const OUTPUT = path.join(__dirname, "x86-emulator-offline.html");
 
const NPM_BASE = "https://cdn.jsdelivr.net/npm/v86@latest";
const ASSETS = {
  LIBV86_JS: { url: `${NPM_BASE}/build/libv86.js`, binary: false },
  V86_WASM_B64: { url: `${NPM_BASE}/build/v86.wasm`, binary: true },
  SEABIOS_B64: { url: `${NPM_BASE}/bios/seabios.bin`, binary: true },
  VGABIOS_B64: { url: `${NPM_BASE}/bios/vgabios.bin`, binary: true },
  FREEDOS_B64: { url: "https://k.copy.sh/freedos722.img", binary: true },
};
 
async function fetchAsset(name, { url, binary }) {
  process.stdout.write(`Fetching ${name} from ${url} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`${(buf.length / 1024).toFixed(1)} KB`);
  return binary ? buf.toString("base64") : buf.toString("utf8");
}
 
async function main() {
  if (!fs.existsSync(TEMPLATE)) {
    console.error(`Template not found: ${TEMPLATE}`);
    process.exit(1);
  }
 
  let html = fs.readFileSync(TEMPLATE, "utf8");
 
  for (const [placeholder, asset] of Object.entries(ASSETS)) {
    const content = await fetchAsset(placeholder, asset);
    const token = `__${placeholder}__`;
    if (!html.includes(token)) {
      console.warn(`Warning: placeholder ${token} not found in template — skipping.`);
      continue;
    }
    // libv86.js is inserted raw inside a /*__LIBV86_JS__*/ comment placeholder;
    // everything else is a quoted base64 string placeholder.
    html = html.split(token).join(content);
  }
 
  fs.writeFileSync(OUTPUT, html);
  const sizeMB = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(1);
  console.log(`\nWrote ${OUTPUT} (${sizeMB} MB)`);
  console.log("Open it directly in a browser — FreeDOS will boot with zero network.");
}
 
main().catch((err) => {
  console.error("\nBuild failed:", err.message);
  process.exit(1);
});
