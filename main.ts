// Starlight Grove — the entry program for best-game-01 (Node 22, standard
// library only). It takes the finished game out of this repository and lays
// it out exactly as the grader expects: game/ and screenshots/ copied into
// the output directory, plus a dossier.json written by the vendored make.fun
// library from those files. The dossier is what the judge reads.
//
// The game itself is plain static files (game/index.html and its ES modules,
// no library, no network request) that any static server can serve. Play it
// locally with `node serve.ts`, then open http://localhost:8080.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps (reference/gate.json). text_max_bytes is the only one
// that shapes the dossier's bytes; the rest mirror what the scorer refuses:
// more than 4 screenshots, any over 256 KiB, more than 993 files or 48 MiB
// under game/, or a path under game/ over 1000 bytes. game/ shares /output's
// own 1000-entry cap with screenshots/ and dossier.json, so check first.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function countTree(directory) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const child = countTree(path);
      files += child.files + 1;
      bytes += child.bytes;
    } else if (stats.isFile()) {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}

function checkGame(root) {
  const game = join(root, 'game');
  const index = join(game, 'index.html');
  if (!existsSync(index)) throw new Error('game/index.html is missing');
  const { files, bytes } = countTree(game);
  if (files > DOSSIER_CAPS.game_max_files) throw new Error(`game/ holds ${files} files, over the 993 cap`);
  if (bytes > DOSSIER_CAPS.game_max_bytes) throw new Error(`game/ holds ${bytes} bytes, over the 48 MiB cap`);
  const shots = join(root, 'screenshots');
  if (existsSync(shots)) {
    const names = readdirSync(shots).filter((name) => !name.startsWith('.'));
    if (names.length > DOSSIER_CAPS.screenshots.max) throw new Error(`screenshots/ holds ${names.length} images, over the 4 cap`);
    for (const name of names) {
      const size = statSync(join(shots, name)).size;
      if (size > DOSSIER_CAPS.screenshots.max_bytes) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
    }
  }
}

function handIn(root, out) {
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(root, 'screenshots'))) {
    cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(out, DOSSIER_CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  return dossier.length;
}

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
checkGame(root);
const dossierBytes = handIn(root, out);
console.log(`Starlight Grove handed in: dossier.json is ${dossierBytes} bytes.`);
