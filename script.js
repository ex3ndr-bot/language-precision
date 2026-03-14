const samples = [
  {
    name: 'AI infrastructure',
    tone: 'technical',
    text: 'We provide a comprehensive AI infrastructure platform that helps enterprises unlock the power of large language models through a robust, scalable, end-to-end solution for modern innovation.'
  },
  {
    name: 'Fintech startup',
    tone: 'formal',
    text: 'We are a next-generation financial technology company enabling businesses to optimize cash flow, improve visibility, and drive strategic outcomes with a unified treasury experience.'
  },
  {
    name: 'Developer tool',
    tone: 'bold',
    text: 'Our platform supercharges engineering teams with seamless workflows, best-in-class automation, and cutting-edge observability that dramatically accelerates software delivery.'
  },
  {
    name: 'Healthcare product',
    tone: 'casual',
    text: 'We make it easier for clinics to stay on top of patient communication, scheduling, and follow-up so staff spend less time chasing admin work.'
  }
];

const vagueWords = ['comprehensive','robust','scalable','modern','innovation','next-generation','optimize','improve','strategic','unified','seamless','best-in-class','cutting-edge','powerful','leading','world-class','efficient','easy','easier','help','helps'];
const jargonWords = ['platform','solution','enterprise','infrastructure','treasury','observability','workflows','automation','end-to-end','strategic outcomes','large language models','visibility'];
const strongWords = ['reduce','cut','speed','ship','track','detect','prevent','measure','book','reply','deploy','audit','rewrite','clarify','compare','save'];

const input = document.getElementById('inputText');
const toneSelect = document.getElementById('toneSelect');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleChips = document.getElementById('sampleChips');
const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.tab-panel')];
const findings = document.getElementById('findings');
const beforeDiff = document.getElementById('beforeDiff');
const afterDiff = document.getElementById('afterDiff');
const annotatedText = document.getElementById('annotatedText');
const rewriteText = document.getElementById('rewriteText');
const precisionBadge = document.getElementById('precisionBadge');
const copyBadge = document.getElementById('copyBadge');
const radarFill = document.getElementById('radarFill');

function escapeHtml(str) {
  return str.replace(/[&<>"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

function normalizeWord(word) {
  return word.toLowerCase().replace(/[^a-z-]/g, '');
}

function splitWords(text) {
  return text.split(/(\s+)/).filter(Boolean);
}

function classify(word) {
  const clean = normalizeWord(word);
  if (!clean) return '';
  if (vagueWords.includes(clean)) return 'vague';
  if (jargonWords.includes(clean)) return 'jargon';
  if (strongWords.includes(clean)) return 'strong';
  return '';
}

function annotateWords(text) {
  if (!text.trim()) return '<p class="empty-state">Paste text to see annotation.</p>';
  return splitWords(text).map(token => {
    const cls = classify(token);
    const safe = escapeHtml(token);
    return cls ? `<span class="token ${cls}">${safe}</span>` : safe;
  }).join('');
}

function collectMatches(text, bucket) {
  const set = new Set();
  splitWords(text).forEach(token => {
    const cls = classify(token);
    if (cls === bucket) set.add(normalizeWord(token));
  });
  return [...set];
}

function sentenceCase(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function refineText(text, tone) {
  let refined = sentenceCase(text);
  const replacements = [
    [/comprehensive/gi, 'focused'],
    [/robust/gi, 'reliable'],
    [/scalable/gi, 'that scales without adding operational drag'],
    [/modern innovation/gi, 'faster product delivery'],
    [/unlock the power of/gi, 'deploy'],
    [/helps?/gi, 'lets'],
    [/optimi[sz]e/gi, 'control'],
    [/improve/gi, 'increase'],
    [/drive strategic outcomes/gi, 'make faster decisions'],
    [/next-generation/gi, 'software'],
    [/platform/gi, tone === 'technical' ? 'system' : 'tool'],
    [/solution/gi, tone === 'formal' ? 'offering' : 'product'],
    [/end-to-end/gi, 'from ingestion to deployment'],
    [/best-in-class/gi, 'high-signal'],
    [/cutting-edge/gi, 'practical'],
    [/seamless/gi, 'fast'],
    [/visibility/gi, 'clear status'],
    [/strategic/gi, 'business-critical']
  ];
  replacements.forEach(([pattern, next]) => {
    refined = refined.replace(pattern, next);
  });

  if (!/[0-9]/.test(refined)) {
    if (tone === 'technical') refined += ' It gives teams measurable latency, cost, and reliability trade-offs in one place.';
    if (tone === 'bold') refined += ' Teams use it to cut wasted work, move faster, and say exactly what they do.';
    if (tone === 'formal') refined += ' The result is clearer positioning, stronger buyer understanding, and more defensible messaging.';
    if (tone === 'casual') refined += ' The result is less fluff, clearer wording, and a message people get on the first read.';
  }

  const openers = {
    formal: 'We provide',
    casual: 'We help teams',
    bold: 'We make',
    technical: 'We give teams'
  };
  if (!/^we/i.test(refined)) refined = `${openers[tone]} ${refined.charAt(0).toLowerCase()}${refined.slice(1)}`;
  return refined;
}

function scoreText(text, refined, tone) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const vague = collectMatches(text, 'vague').length;
  const jargon = collectMatches(text, 'jargon').length;
  const strong = collectMatches(text, 'strong').length;
  const specificityBonus = /(for|with|through|by|so)/i.test(text) ? 6 : 0;
  const precision = Math.max(22, Math.min(98, 78 - vague * 6 - jargon * 2 + strong * 3));
  const clarity = Math.max(25, Math.min(97, 84 - Math.max(0, (words.length - 34)) - jargon * 3));
  const strength = Math.max(20, Math.min(98, 48 + strong * 9 - vague * 2 + (tone === 'bold' ? 12 : tone === 'technical' ? 6 : 0)));
  const specificity = Math.max(24, Math.min(96, 45 + specificityBonus + (refined.length > text.length ? 10 : 0) - vague * 2));
  const toneFit = Math.max(30, Math.min(98, 68 + (tone === 'formal' ? 4 : tone === 'casual' ? 3 : tone === 'bold' ? 6 : 8) + strong * 2 - jargon));
  return { precision, clarity, strength, specificity, toneFit };
}

function scoreLabel(value) {
  if (value >= 88) return 'Excellent';
  if (value >= 75) return 'Sharp';
  if (value >= 60) return 'Solid';
  return 'Needs tightening';
}

function diffWords(before, after) {
  const a = before.trim().split(/\s+/).filter(Boolean);
  const b = after.trim().split(/\s+/).filter(Boolean);
  const bSet = new Set(b.map(normalizeWord));
  const aSet = new Set(a.map(normalizeWord));
  const beforeHtml = a.map(word => bSet.has(normalizeWord(word)) ? escapeHtml(word) : `<span class="token removed">${escapeHtml(word)}</span>`).join(' ');
  const afterHtml = b.map(word => aSet.has(normalizeWord(word)) ? escapeHtml(word) : `<span class="token inserted">${escapeHtml(word)}</span>`).join(' ');
  return { beforeHtml, afterHtml };
}

function renderList(id, values) {
  const el = document.getElementById(id);
  el.innerHTML = values.length ? values.map(v => `<li>${escapeHtml(v)}</li>`).join('') : '<li class="empty-state">None detected</li>';
}

function renderFindings(scores, text, refined) {
  const notes = [];
  const vague = collectMatches(text, 'vague');
  const jargon = collectMatches(text, 'jargon');
  if (vague.length) notes.push(`<div class="finding"><strong>Cut fuzzy language.</strong> Replace words like ${vague.slice(0,4).map(escapeHtml).join(', ')} with exact claims, proof, or outcomes.</div>`);
  if (jargon.length) notes.push(`<div class="finding"><strong>Translate internal language.</strong> ${jargon.slice(0,4).map(escapeHtml).join(', ')} may make sense inside the company but blur the message for buyers.</div>`);
  if (refined.length > text.length) notes.push('<div class="finding"><strong>Add concrete value.</strong> The stronger version names outcomes instead of leaning on prestige words.</div>');
  notes.push(`<div class="finding"><strong>Overall read:</strong> ${scoreLabel(Math.round((scores.precision + scores.clarity + scores.strength + scores.specificity + scores.toneFit) / 5))}.</div>`);
  findings.innerHTML = notes.join('');
}

function updateRadar(scores) {
  const vals = [scores.precision, scores.strength, scores.toneFit, scores.specificity, scores.clarity];
  const pts = [
    [50, 50 - vals[0] * 0.46],
    [50 + vals[1] * 0.44, 50 - vals[1] * 0.14],
    [50 + vals[2] * 0.28, 50 + vals[2] * 0.36],
    [50 - vals[3] * 0.28, 50 + vals[3] * 0.36],
    [50 - vals[4] * 0.44, 50 - vals[4] * 0.14]
  ];
  radarFill.style.clipPath = `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(',')})`;
}

function updateScores(scores) {
  document.getElementById('scorePrecision').textContent = scores.precision;
  document.getElementById('scoreClarity').textContent = scores.clarity;
  document.getElementById('scoreStrength').textContent = scores.strength;
  document.getElementById('scoreSpecificity').textContent = scores.specificity;
  document.getElementById('scoreTone').textContent = scores.toneFit;
  const avg = Math.round((scores.precision + scores.clarity + scores.strength + scores.specificity + scores.toneFit) / 5);
  precisionBadge.innerHTML = `Precision Score <strong>${avg}</strong><span>${scoreLabel(avg)}</span>`;
  updateRadar(scores);
}

function analyze() {
  const text = input.value.trim();
  const tone = toneSelect.value;
  if (!text) {
    annotatedText.innerHTML = '<p class="empty-state">Paste some text first.</p>';
    beforeDiff.innerHTML = '<p class="empty-state">Nothing to compare yet.</p>';
    afterDiff.innerHTML = '<p class="empty-state">Run analysis to generate a rewrite.</p>';
    rewriteText.innerHTML = '<p class="empty-state">Suggested rewrite appears here.</p>';
    return;
  }
  const refined = refineText(text, tone);
  const scores = scoreText(text, refined, tone);
  const diffs = diffWords(text, refined);
  annotatedText.innerHTML = annotateWords(text);
  beforeDiff.innerHTML = diffs.beforeHtml;
  afterDiff.innerHTML = diffs.afterHtml;
  rewriteText.innerHTML = escapeHtml(refined);
  updateScores(scores);
  renderFindings(scores, text, refined);
  renderList('vagueList', collectMatches(text, 'vague'));
  renderList('strongList', collectMatches(text, 'strong'));
  renderList('jargonList', collectMatches(text, 'jargon'));
}

function activateTab(name) {
  tabs.forEach(tab => tab.classList.toggle('is-active', tab.dataset.tab === name));
  panels.forEach(panel => panel.classList.toggle('is-active', panel.id === `tab-${name}`));
}

function mountSamples() {
  sampleChips.innerHTML = samples.map((sample, index) => `<button class="sample-chip ${index === 0 ? 'is-active' : ''}" data-index="${index}">${sample.name}</button>`).join('');
  const setSample = (index) => {
    const sample = samples[index];
    input.value = sample.text;
    toneSelect.value = sample.tone;
    [...sampleChips.children].forEach((chip, i) => chip.classList.toggle('is-active', i === index));
    analyze();
  };
  sampleChips.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-index]');
    if (!btn) return;
    setSample(Number(btn.dataset.index));
  });
  setSample(0);
}

function mountTooltips() {
  document.querySelectorAll('.tooltip-trigger').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const tip = document.createElement('span');
      tip.className = 'tooltip';
      tip.textContent = btn.dataset.tip;
      btn.appendChild(tip);
    });
    btn.addEventListener('mouseleave', () => {
      const tip = btn.querySelector('.tooltip');
      if (tip) tip.remove();
    });
    btn.addEventListener('focus', () => btn.dispatchEvent(new Event('mouseenter')));
    btn.addEventListener('blur', () => btn.dispatchEvent(new Event('mouseleave')));
  });
}

tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
analyzeBtn.addEventListener('click', analyze);
clearBtn.addEventListener('click', () => {
  input.value = '';
  analyze();
});
copyBadge.addEventListener('click', async () => {
  const text = precisionBadge.textContent.replace(/\s+/g, ' ').trim();
  try {
    await navigator.clipboard.writeText(text);
    copyBadge.textContent = 'Copied';
    setTimeout(() => { copyBadge.textContent = 'Copy score badge'; }, 1200);
  } catch {
    copyBadge.textContent = 'Copy failed';
    setTimeout(() => { copyBadge.textContent = 'Copy score badge'; }, 1200);
  }
});
input.addEventListener('input', analyze);
toneSelect.addEventListener('change', analyze);

mountSamples();
mountTooltips();
