#!/usr/bin/env node
// Genera todas las fotos de fotos/prompts.json con gpt-image-2.
// Uso: OPENAI_API_KEY=sk-... node fotos/generar-todas.mjs [--calidad low|medium] [--solo id1,id2] [--forzar]
// Salida: fotos/generadas/<id>.jpg. Salta las que ya existen salvo --forzar.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const script = path.join(raiz, ".claude/skills/tienda-shopify-v2/scripts/generar-foto.mjs");
const plan = JSON.parse(fs.readFileSync(path.join(aqui, "prompts.json"), "utf8"));
const salidaDir = path.join(aqui, "generadas");

const arg = (n) => { const i = process.argv.indexOf("--" + n); return i > -1 ? process.argv[i + 1] : null; };
const calidadGlobal = arg("calidad");
const solo = arg("solo")?.split(",");
const forzar = process.argv.includes("--forzar");

const clave = process.env.OPENAI_API_KEY || "";
if (!clave.startsWith("sk-") || clave.length < 40) {
  console.error("ERROR falta OPENAI_API_KEY real en el entorno");
  process.exit(1);
}
const claveArchivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "oa-")), "clave.txt");
fs.writeFileSync(claveArchivo, clave, { mode: 0o600 });
fs.mkdirSync(salidaDir, { recursive: true });

let fallos = 0;
for (const f of plan.fotos) {
  if (solo && !solo.includes(f.id)) continue;
  const salida = path.join(salidaDir, f.id + ".jpg");
  if (fs.existsSync(salida) && !forzar) { console.log("SALTA " + f.id); continue; }

  const desc = f.productos.map((p) => plan.productos[p].descripcion).join("; ");
  const refs = [...new Set(f.productos.flatMap((p) =>
    plan.productos[p].refs.slice(0, f.productos.length > 1 ? 1 : 3)))];
  const prompt = `${plan.estilo}\nProducto(s): ${desc}.\nEscena: ${f.prompt}`;
  const cli = ["--clave", claveArchivo, "--prompt", prompt, "--salida", salida,
    "--calidad", calidadGlobal || f.calidad || "medium", "--tamano", f.tamano || "1024x1024"];
  for (const r of refs) cli.push("--ref", path.join(raiz, "fotos-originales", r));

  for (let intento = 1; intento <= 3; intento++) {
    try {
      console.log(execFileSync("node", [script, ...cli], { encoding: "utf8" }).trim());
      break;
    } catch (e) {
      const msg = (e.stderr || e.message).trim();
      console.error(`${f.id} intento ${intento}: ${msg}`);
      if (!/429|limite de ritmo|5\d\d/.test(msg) || intento === 3) { fallos++; break; }
      await new Promise((r) => setTimeout(r, 45000));
    }
  }
}
fs.rmSync(path.dirname(claveArchivo), { recursive: true, force: true });
process.exit(fallos ? 1 : 0);
