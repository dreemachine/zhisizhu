#!/usr/bin/env node
'use strict';

// Dependency-free project integrity checks. This intentionally validates the
// data relationships that a JavaScript syntax check cannot see: HTML asset
// references, sample manifests, and arrangement references to pad/fret IDs.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertFile(relativePath, context) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`${context}: missing ${relativePath}`);
}

function matches(source, regex) {
  return [...source.matchAll(regex)].map((match) => match[1]);
}

function validateJavaScript() {
  const files = fs
    .readdirSync(root)
    .filter((name) => name.endsWith('.js'))
    .concat(['relay/relay-server.js']);

  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    if (result.status !== 0) fail(`${file}: ${result.stderr.trim() || 'JavaScript syntax check failed'}`);
  }
}

function validateHtmlAssets() {
  const html = read('index.html');
  const references = matches(html, /(?:src|href)="([^"#]+)"/g)
    .map((reference) => reference.split('?')[0])
    .filter((reference) => !/^(?:https?:|wss?:|data:)/.test(reference));

  for (const reference of references) assertFile(reference, 'index.html');
}

function flattenManifest(value) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(flattenManifest);
}

function validateSampleManifests() {
  const samplesRoot = path.join(root, 'samples');
  for (const instrument of fs.readdirSync(samplesRoot)) {
    const instrumentDir = path.join(samplesRoot, instrument);
    if (!fs.statSync(instrumentDir).isDirectory()) continue;
    const manifestPath = path.join(instrumentDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      fail(`samples/${instrument}/manifest.json: invalid JSON (${error.message})`);
      continue;
    }

    for (const filename of flattenManifest(manifest)) {
      const samplePath = path.join(instrumentDir, filename);
      if (!fs.existsSync(samplePath)) fail(`samples/${instrument}/manifest.json: missing ${filename}`);
    }
  }
}

function padIds(relativePath) {
  const source = read(relativePath);
  const ids = new Set(matches(source, /\{\s*id:\s*'([^']+)'/g));
  // Dizi creates its pads from a compact note-name array rather than object
  // literals, so include those generated IDs in the same validation set.
  const generatedNotes = source.match(/const notes = \[([^\]]+)\]/)?.[1];
  if (generatedNotes) {
    for (const id of matches(generatedNotes, /'([^']+)'/g)) ids.add(id);
  }
  return ids;
}

const ARRANGEMENT_FILES = ['song-spring-river.js', 'song-mo-li-hua.js'];

function validateArrangement() {
  const diziIds = padIds('dizi.js');
  const banguIds = padIds('bangu.js');
  const erhuIds = padIds('erhu.js');

  for (const file of ARRANGEMENT_FILES) {
    const song = read(file);

    for (const id of matches(song, /diziPad(?:Vibrato)?\('([^']+)'\)/g)) {
      if (!diziIds.has(id)) fail(`${file}: dizi pad "${id}" does not exist`);
    }
    for (const id of matches(song, /banguPad\('([^']+)'\)/g)) {
      if (!banguIds.has(id)) fail(`${file}: bangu pad "${id}" does not exist`);
    }
    for (const id of matches(song, /erhuExpressive\.playPad\('([^']+)'\)/g)) {
      if (!erhuIds.has(id)) fail(`${file}: erhu expressive pad "${id}" does not exist`);
    }

    for (const fret of matches(song, /erhuNote\((\d+)\)/g).map(Number)) {
      if (fret < 0 || fret >= 20) fail(`${file}: erhu fret ${fret} is outside 0-19`);
    }
    for (const fret of matches(song, /yq(?:Low|High)\((\d+)/g).map(Number)) {
      if (fret < 0 || fret >= 12) fail(`${file}: yueqin fret ${fret} is outside 0-11`);
    }
  }

  // Specific to song-spring-river.js: its E5 vibrato cue broke once already
  // (see docs/reliability-pass-2026-07-31.md) by pointing at the wrong
  // board id, so this arrangement in particular is checked to keep
  // resolving vibrato through erhu-expressive rather than erhu-fx.
  if (!read('song-spring-river.js').includes("instrumentAPIs['erhu-expressive']")) {
    fail('song-spring-river.js: arrangement must resolve vibrato notes through erhu-expressive');
  }
}

validateJavaScript();
validateHtmlAssets();
validateSampleManifests();
validateArrangement();

if (errors.length) {
  console.error(`Project validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Project validation passed: JavaScript, HTML assets, sample manifests, and arrangement references are consistent.');
