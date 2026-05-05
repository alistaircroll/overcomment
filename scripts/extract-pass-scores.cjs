#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const target = args.find((arg) => arg !== '--json') || '.';
const skipDirs = new Set([
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'vendor',
]);
const includeExts = new Set([
  '.cjs',
  '.cs',
  '.go',
  '.java',
  '.js',
  '.jsx',
  '.kt',
  '.md',
  '.mjs',
  '.php',
  '.py',
  '.rb',
  '.rs',
  '.swift',
  '.ts',
  '.tsx',
]);

function walk(targetPath, files = []) {
  if (!fs.existsSync(targetPath)) return files;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (includeExts.has(path.extname(targetPath))) files.push(targetPath);
    return files;
  }

  for (const entry of fs.readdirSync(targetPath)) {
    if (skipDirs.has(entry)) continue;
    walk(path.join(targetPath, entry), files);
  }
  return files;
}

function parseMetadata(line) {
  const metadata = {};
  for (const match of line.matchAll(/(\w+)=(".*?"|'.*?'|\S+)/g)) {
    const key = match[1];
    const value = match[2].replace(/^['"]|['"]$/g, '');
    metadata[key] = value;
  }
  return metadata;
}

function scoreLine(block, label) {
  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:[-*]\\s*)?${label}:\\s*(\\d{1,2})\\s*\\/\\s*10\\s*(.*)`,
    'i',
  );
  const match = block.match(regex);
  if (!match) return null;
  const score = Number.parseInt(match[1], 10);
  const reason = match[2]
    .replace(/^[-:]\s*/, '')
    .replace(/^\(|\)$/g, '')
    .trim();
  return { score, reason };
}

function nextCodepoint(content, startIndex) {
  const tail = content.slice(startIndex, startIndex + 1500);
  const declaration = tail.match(
    /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var|def|func|fn|struct|enum)\s+([A-Za-z_$][\w$-]*)/,
  );
  return declaration ? declaration[1] : undefined;
}

function lineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = [];

  for (const match of content.matchAll(/@PASS_SCORE([^\n\r]*)/g)) {
    const firstLine = match[1] || '';
    const metadata = parseMetadata(firstLine);
    const blockStart = match.index || 0;
    const commentEnd = content.indexOf('*/', blockStart);
    const blankEnd = content.slice(blockStart).search(/\n\s*\n/);
    const softEnd = blankEnd >= 0 ? blockStart + blankEnd : blockStart + 1200;
    const blockEnd = commentEnd >= 0 && commentEnd < softEnd ? commentEnd + 2 : softEnd;
    const block = content.slice(blockStart, blockEnd);

    const performance = scoreLine(block, 'Performance');
    const availability = scoreLine(block, 'Availability');
    const scalability = scoreLine(block, 'Scalability');
    const security = scoreLine(block, 'Security');
    if (!performance || !availability || !scalability || !security) continue;

    const sourceFile = metadata.file || metadata.path || filePath;
    const symbol =
      metadata.symbol ||
      metadata.codepoint ||
      metadata.identifier ||
      nextCodepoint(content, blockEnd) ||
      '(unknown)';
    const sourceLine = metadata.line || lineNumber(content, blockStart);
    const total =
      performance.score + availability.score + scalability.score + security.score;

    results.push({
      file: sourceFile,
      symbol,
      line: Number.parseInt(sourceLine, 10) || sourceLine,
      performance,
      availability,
      scalability,
      security,
      total,
      source: filePath,
    });
  }

  return results;
}

function markdown(results) {
  if (results.length === 0) {
    return '## PASS Score Rankings\n\nNo @PASS_SCORE blocks found.\n';
  }

  let output = '## PASS Score Rankings\n\n';
  for (const [index, item] of results.slice(0, 20).entries()) {
    output += `### ${index + 1}. \`${item.symbol}\` (${item.file}:${item.line})\n`;
    output += `- **Total:** ${item.total}/40\n`;
    output += `- **Performance:** ${item.performance.score}/10 - ${item.performance.reason}\n`;
    output += `- **Availability:** ${item.availability.score}/10 - ${item.availability.reason}\n`;
    output += `- **Scalability:** ${item.scalability.score}/10 - ${item.scalability.reason}\n`;
    output += `- **Security:** ${item.security.score}/10 - ${item.security.reason}\n\n`;
  }

  output += '## All Audited Codepoints\n\n';
  output += '| File | Codepoint | P | A | S | Sec | Total |\n';
  output += '|---|---|---:|---:|---:|---:|---:|\n';
  for (const item of results) {
    output += `| \`${item.file}:${item.line}\` | \`${item.symbol}\` | ${item.performance.score} | ${item.availability.score} | ${item.scalability.score} | ${item.security.score} | **${item.total}** |\n`;
  }
  return output;
}

const files = walk(path.resolve(target));
const results = files.flatMap(parseFile).sort((a, b) => a.total - b.total);

if (jsonMode) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(markdown(results));
}
