const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 7780);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const ANALYSES_PATH = path.join(DATA_DIR, 'analyses.json');
const STATS_PATH = path.join(DATA_DIR, 'stats.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const HEDGING_WORDS = [
  'maybe','perhaps','possibly','probably','generally','typically','often','sometimes','somewhat','fairly','rather','quite','relatively','arguably','sort of','kind of','seems','appears','might','could','may'
];
const JARGON_WORDS = [
  'synergy','leverage','robust','innovative','cutting-edge','best-in-class','world-class','seamless','transformative','revolutionary','scalable','paradigm','ecosystem','solution','enable','empower','optimize','streamline','holistic','disruptive','next-generation','mission-critical','frictionless','stakeholders','verticals','bandwidth','granular','alignment','value-add'
];
const VAGUE_WORDS = [
  'very','really','things','stuff','nice','good','bad','great','some','many','various','several','improve','better','soon','fast','easy','simple','powerful','effective','efficient','quality'
];
const STRONG_WORDS = [
  'builds','measures','reduces','increases','ships','tracks','prevents','automates','detects','converts','secures','deploys','analyzes','generates','integrates','improves','cuts'
];
const REDUNDANT_PHRASES = [
  ['in order to', 'to'],
  ['due to the fact that', 'because'],
  ['at this point in time', 'now'],
  ['has the ability to', 'can'],
  ['in the event that', 'if'],
  ['a number of', 'many'],
  ['for the purpose of', 'for'],
  ['it is important to note that', ''],
  ['needless to say', ''],
  ['each and every', 'each']
];
const PRESETS = [
  {
    id: 'developer-tools',
    name: 'Developer infrastructure',
    description: 'We provide an innovative platform that leverages AI to help engineering teams improve their workflows and unlock scalable productivity across the organization.'
  },
  {
    id: 'healthcare-ai',
    name: 'Healthcare AI',
    description: 'Our solution empowers providers with cutting-edge intelligence that streamlines patient communication and enables better outcomes through a robust digital experience.'
  },
  {
    id: 'fintech-risk',
    name: 'Fintech risk platform',
    description: 'We help fintech companies detect fraud faster by analyzing transaction behavior, flagging anomalies, and routing high-risk events for review.'
  },
  {
    id: 'manufacturing-ops',
    name: 'Manufacturing operations',
    description: 'The company gives plant operators a clearer view of downtime by tracking machine events, surfacing root causes, and highlighting the shifts losing the most output.'
  }
];

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

if (!fs.existsSync(ANALYSES_PATH)) writeJson(ANALYSES_PATH, []);
if (!fs.existsSync(STATS_PATH)) writeJson(STATS_PATH, { analyzeCount: 0, refineCount: 0, diffCount: 0, lastActivityAt: null });

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) || [];
}

function splitWords(text) {
  return (text.toLowerCase().match(/[a-zA-Z][a-zA-Z'-]*/g) || []);
}

function countPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unique(arr) {
  return [...new Set(arr)];
}

function findPassiveVoice(text) {
  const matches = [];
  const passivePatterns = [
    /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi,
    /\b(am|is|are|was|were|be|been|being)\s+\w+\s+by\b/gi
  ];
  for (const pattern of passivePatterns) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      matches.push(m[0]);
    }
  }
  return unique(matches);
}

function analyzeText(text) {
  const cleaned = normalizeWhitespace(text);
  const sentences = splitSentences(cleaned);
  const words = splitWords(cleaned);
  const wordCount = words.length || 1;
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);

  const hedgingHits = HEDGING_WORDS.flatMap((word) => Array(countPhrase(cleaned, word)).fill(word));
  const jargonHits = JARGON_WORDS.flatMap((word) => Array(countPhrase(cleaned, word)).fill(word));
  const vagueHits = VAGUE_WORDS.flatMap((word) => Array(countPhrase(cleaned, word)).fill(word));
  const passiveHits = findPassiveVoice(cleaned);
  const redundancyHits = REDUNDANT_PHRASES.flatMap(([phrase]) => Array(countPhrase(cleaned, phrase)).fill(phrase));
  const longSentences = sentences.filter((sentence) => splitWords(sentence).length > 24);
  const strongHits = STRONG_WORDS.flatMap((word) => Array(countPhrase(cleaned, word)).fill(word));

  const vaguenessPenalty = hedgingHits.length * 8 + vagueHits.length * 5;
  const jargonPenalty = jargonHits.length * 7;
  const passivePenalty = passiveHits.length * 10;
  const redundancyPenalty = redundancyHits.length * 10 + Math.max(0, words.length - unique(words).length - 8) * 1.5;
  const clarityPenalty = Math.max(0, avgSentenceLength - 16) * 3 + longSentences.length * 6;
  const strengthBonus = Math.min(12, strongHits.length * 2);

  const vagueness = clamp(100 - vaguenessPenalty, 0, 100);
  const jargon = clamp(100 - jargonPenalty, 0, 100);
  const passiveVoice = clamp(100 - passivePenalty, 0, 100);
  const redundancy = clamp(100 - redundancyPenalty, 0, 100);
  const clarity = clamp(100 - clarityPenalty, 0, 100);
  const precision = clamp(Math.round((vagueness + jargon + passiveVoice + redundancy + clarity) / 5 + strengthBonus), 0, 100);

  return {
    overallScore: precision,
    breakdown: {
      vagueness: Math.round(vagueness),
      jargon: Math.round(jargon),
      passiveVoice: Math.round(passiveVoice),
      redundancy: Math.round(redundancy),
      clarity: Math.round(clarity)
    },
    metrics: {
      sentences: sentences.length,
      words: words.length,
      avgSentenceLength: Number(avgSentenceLength.toFixed(1)),
      longSentenceCount: longSentences.length,
      hedgingCount: hedgingHits.length,
      jargonCount: jargonHits.length,
      passiveCount: passiveHits.length,
      redundancyCount: redundancyHits.length
    },
    highlights: {
      vague: unique([...hedgingHits, ...vagueHits]).slice(0, 20),
      jargon: unique(jargonHits).slice(0, 20),
      passive: passiveHits.slice(0, 20),
      strong: unique(strongHits).slice(0, 20)
    },
    findings: buildFindings({ hedgingHits, jargonHits, passiveHits, redundancyHits, longSentences, avgSentenceLength, strongHits })
  };
}

function buildFindings({ hedgingHits, jargonHits, passiveHits, redundancyHits, longSentences, avgSentenceLength, strongHits }) {
  const findings = [];
  if (hedgingHits.length) findings.push({ type: 'vagueness', title: 'Hedging weakens the claim', detail: `Found ${hedgingHits.length} hedge words like ${unique(hedgingHits).slice(0, 3).join(', ')}.` });
  if (jargonHits.length) findings.push({ type: 'jargon', title: 'Jargon hides the point', detail: `Found ${jargonHits.length} jargon terms like ${unique(jargonHits).slice(0, 3).join(', ')}.` });
  if (passiveHits.length) findings.push({ type: 'passive', title: 'Passive voice slows the sentence', detail: `Examples: ${passiveHits.slice(0, 2).join('; ')}.` });
  if (redundancyHits.length) findings.push({ type: 'redundancy', title: 'Redundant phrasing adds drag', detail: `Repeated filler includes ${unique(redundancyHits).slice(0, 3).join(', ')}.` });
  if (longSentences.length || avgSentenceLength > 18) findings.push({ type: 'clarity', title: 'Sentence length hurts readability', detail: `Average sentence length is ${avgSentenceLength.toFixed(1)} words.` });
  if (strongHits.length) findings.push({ type: 'strength', title: 'Some language is already concrete', detail: `Strong verbs found: ${unique(strongHits).slice(0, 4).join(', ')}.` });
  if (!findings.length) findings.push({ type: 'clean', title: 'The text is already fairly sharp', detail: 'Few vague, passive, or redundant patterns were detected.' });
  return findings;
}

function sentenceCase(sentence) {
  if (!sentence) return sentence;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function refineText(text, tone = 'formal') {
  let refined = ` ${normalizeWhitespace(text)} `;
  for (const [from, to] of REDUNDANT_PHRASES) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    refined = refined.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ` ${to} `);
  }

  refined = refined
    .replace(/\bvery\b/gi, '')
    .replace(/\breally\b/gi, '')
    .replace(/\bquite\b/gi, '')
    .replace(/\bkind of\b/gi, '')
    .replace(/\bsort of\b/gi, '')
    .replace(/\bthere (is|are)\b/gi, '$1')
    .replace(/\bwe provide\b/gi, 'we build')
    .replace(/\bhelp(s|)\b/gi, 'enable$1');

  const jargonReplacements = {
    'leverage': 'use',
    'utilize': 'use',
    'empower': 'help',
    'streamline': 'speed up',
    'optimize': 'improve',
    'solution': 'product',
    'cutting-edge': 'advanced',
    'best-in-class': 'high-performing',
    'world-class': 'high-quality',
    'synergy': 'coordination',
    'robust': 'reliable',
    'seamless': 'simple',
    'transformative': 'meaningful',
    'revolutionary': 'new',
    'scalable': 'able to grow'
  };

  for (const [from, to] of Object.entries(jargonReplacements)) {
    refined = refined.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), to);
  }

  refined = refined.replace(/\s+/g, ' ').trim();

  let sentences = splitSentences(refined).map((sentence) => sentence.trim()).filter(Boolean);
  sentences = sentences.flatMap((sentence) => {
    const words = splitWords(sentence);
    if (words.length <= 24) return [sentenceCase(sentence)];
    const midpoint = Math.ceil(words.length / 2);
    const rawWords = sentence.split(/\s+/);
    return [
      sentenceCase(rawWords.slice(0, midpoint).join(' ').replace(/[,;:]$/, '') + '.'),
      sentenceCase(rawWords.slice(midpoint).join(' ').replace(/^[,;:]+/, ''))
    ];
  });

  let output = sentences.join(' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\.\./g, '.')
    .trim();

  const toneRules = {
    formal: (value) => value
      .replace(/\bwe build\b/gi, 'we provide')
      .replace(/\bhelp\b/gi, 'support'),
    casual: (value) => value
      .replace(/\bOur\b/g, 'Our team')
      .replace(/\bWe\b/g, 'We')
      .replace(/\bprovide\b/gi, 'give')
      .replace(/\bhigh-quality\b/gi, 'solid'),
    bold: (value) => value
      .replace(/\bhelp\b/gi, 'drive')
      .replace(/\bimprove\b/gi, 'sharpen')
      .replace(/\bable to grow\b/gi, 'built to scale'),
    technical: (value) => value
      .replace(/\bhelp\b/gi, 'assist')
      .replace(/\bproduct\b/gi, 'system')
      .replace(/\bspeed up\b/gi, 'reduce latency in')
  };

  if (toneRules[tone]) {
    output = toneRules[tone](output);
  }

  output = output.replace(/\s+/g, ' ').trim();
  if (output && !/[.!?]$/.test(output)) output += '.';
  return output;
}

function diffWords(before, after) {
  const a = before.trim() ? before.trim().split(/\s+/) : [];
  const b = after.trim() ? after.trim().split(/\s+/) : [];
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const chunks = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      chunks.push({ type: 'unchanged', value: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      chunks.push({ type: 'removed', value: a[i] });
      i++;
    } else {
      chunks.push({ type: 'added', value: b[j] });
      j++;
    }
  }
  while (i < n) chunks.push({ type: 'removed', value: a[i++] });
  while (j < m) chunks.push({ type: 'added', value: b[j++] });
  return chunks;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname.slice(1));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

function saveAnalysis(entry) {
  const analyses = readJson(ANALYSES_PATH, []);
  analyses.unshift(entry);
  writeJson(ANALYSES_PATH, analyses.slice(0, 100));
}

function updateStats(kind) {
  const stats = readJson(STATS_PATH, { analyzeCount: 0, refineCount: 0, diffCount: 0, lastActivityAt: null });
  if (kind === 'analyze') stats.analyzeCount += 1;
  if (kind === 'refine') stats.refineCount += 1;
  if (kind === 'diff') stats.diffCount += 1;
  stats.lastActivityAt = new Date().toISOString();
  writeJson(STATS_PATH, stats);
  return stats;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { ok: true, port: PORT, service: 'language-precision-api' });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/analyze') {
      const body = await readBody(req);
      const text = String(body.text || '').trim();
      if (!text) return sendJson(res, 400, { error: 'text is required' });
      const analysis = analyzeText(text);
      const entry = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        text,
        overallScore: analysis.overallScore,
        breakdown: analysis.breakdown,
        metrics: analysis.metrics
      };
      saveAnalysis(entry);
      updateStats('analyze');
      sendJson(res, 200, analysis);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/refine') {
      const body = await readBody(req);
      const text = String(body.text || '').trim();
      const tone = String(body.tone || 'formal');
      if (!text) return sendJson(res, 400, { error: 'text is required' });
      const refined = refineText(text, tone);
      const before = analyzeText(text);
      const after = analyzeText(refined);
      updateStats('refine');
      sendJson(res, 200, {
        tone,
        refinedText: refined,
        before,
        after,
        improvement: after.overallScore - before.overallScore
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/diff') {
      const body = await readBody(req);
      const before = String(body.before || '').trim();
      const after = String(body.after || '').trim();
      if (!before || !after) return sendJson(res, 400, { error: 'before and after are required' });
      updateStats('diff');
      sendJson(res, 200, { chunks: diffWords(before, after) });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/analyses') {
      const analyses = readJson(ANALYSES_PATH, []);
      sendJson(res, 200, { items: analyses });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/presets') {
      sendJson(res, 200, { items: PRESETS });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/stats') {
      const analyses = readJson(ANALYSES_PATH, []);
      const stats = readJson(STATS_PATH, { analyzeCount: 0, refineCount: 0, diffCount: 0, lastActivityAt: null });
      const avgScore = analyses.length ? Math.round(analyses.reduce((sum, item) => sum + (item.overallScore || 0), 0) / analyses.length) : 0;
      sendJson(res, 200, {
        ...stats,
        analysisHistoryCount: analyses.length,
        averageScore: avgScore,
        latestAnalysisAt: analyses[0]?.createdAt || null
      });
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      sendStatic(req, res, pathname);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Language Precision server running on http://localhost:${PORT}`);
});
