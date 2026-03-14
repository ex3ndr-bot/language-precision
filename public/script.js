const api = {
  analyze: (text) => fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).then((r) => r.json()),
  refine: (text, tone) => fetch('/api/refine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, tone }) }).then((r) => r.json()),
  diff: (before, after) => fetch('/api/diff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ before, after }) }).then((r) => r.json()),
  analyses: () => fetch('/api/analyses').then((r) => r.json()),
  presets: () => fetch('/api/presets').then((r) => r.json()),
  stats: () => fetch('/api/stats').then((r) => r.json())
};

const state = {
  analysis: null,
  refinement: null,
  diff: null,
  presets: [],
  stats: null,
  history: []
};

const els = {
  input: document.getElementById('inputText'),
  tone: document.getElementById('toneSelect'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  clearBtn: document.getElementById('clearBtn'),
  sampleChips: document.getElementById('sampleChips'),
  precisionBadge: document.getElementById('precisionBadge'),
  copyBadge: document.getElementById('copyBadge'),
  radarFill: document.getElementById('radarFill'),
  findings: document.getElementById('findings'),
  originalText: document.getElementById('originalText'),
  refinedText: document.getElementById('refinedText'),
  annotatedText: document.getElementById('annotatedText'),
  rewriteText: document.getElementById('rewriteText'),
  vagueList: document.getElementById('vagueList'),
  jargonList: document.getElementById('jargonList'),
  strongList: document.getElementById('strongList'),
  historyList: document.getElementById('historyList'),
  statsPanel: document.getElementById('statsPanel')
};

const scoreEls = {
  precision: document.getElementById('scorePrecision'),
  clarity: document.getElementById('scoreClarity'),
  vagueness: document.getElementById('scoreVagueness'),
  jargon: document.getElementById('scoreJargon'),
  passive: document.getElementById('scorePassive'),
  redundancy: document.getElementById('scoreRedundancy')
};

function escapeHtml(value) {
  return value.replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function renderList(el, items) {
  el.innerHTML = items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li class="empty-state">None detected</li>';
}

function badgeLabel(score) {
  if (score >= 85) return 'Sharp';
  if (score >= 70) return 'Solid';
  if (score >= 55) return 'Needs tightening';
  return 'Blunt';
}

function updateBadge(score) {
  els.precisionBadge.innerHTML = `Precision Score <strong>${score ?? '--'}</strong><span>${score == null ? 'Waiting' : badgeLabel(score)}</span>`;
}

function updateRadar(breakdown) {
  if (!breakdown) return;
  const values = [breakdown.clarity, breakdown.jargon, breakdown.passiveVoice, breakdown.redundancy, breakdown.vagueness].map((v) => Math.max(8, Math.min(100, v)));
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index / 5);
    const radius = value / 100 * 50;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    return `${x}% ${y}%`;
  });
  els.radarFill.style.clipPath = `polygon(${points.join(',')})`;
}

function annotateText(text, highlights) {
  let html = escapeHtml(text);
  const apply = (terms, cls) => {
    terms.filter(Boolean).forEach((term) => {
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`\\b(${safe})\\b`, 'gi'), `<span class="token ${cls}">$1</span>`);
    });
  };
  apply(highlights.vague || [], 'vague');
  apply(highlights.jargon || [], 'jargon');
  apply(highlights.strong || [], 'strong');
  return html;
}

function renderDiff(chunks) {
  const before = [];
  const after = [];
  chunks.forEach((chunk) => {
    const token = escapeHtml(chunk.value);
    if (chunk.type === 'unchanged') {
      before.push(token);
      after.push(token);
    } else if (chunk.type === 'removed') {
      before.push(`<span class="token removed">${token}</span>`);
    } else if (chunk.type === 'added') {
      after.push(`<span class="token inserted">${token}</span>`);
    }
  });
  els.originalText.innerHTML = before.join(' ');
  els.refinedText.innerHTML = after.join(' ');
}

function renderFindings(findings) {
  els.findings.innerHTML = findings.map((item) => `
    <div class="finding">
      <strong>${escapeHtml(item.title)}</strong>
      <div>${escapeHtml(item.detail)}</div>
    </div>
  `).join('');
}

function renderHistory() {
  els.historyList.innerHTML = state.history.length ? state.history.map((item) => `
    <div class="finding">
      <strong>${item.overallScore}/100</strong>
      <div>${escapeHtml(item.text.slice(0, 180))}${item.text.length > 180 ? '…' : ''}</div>
      <div class="empty-state">${new Date(item.createdAt).toLocaleString()}</div>
    </div>`).join('') : '<div class="empty-state">No analyses yet.</div>';
}

function renderStats() {
  const stats = state.stats;
  if (!stats) {
    els.statsPanel.innerHTML = '<div class="empty-state">Loading stats…</div>';
    return;
  }
  els.statsPanel.innerHTML = [
    ['Analyses', stats.analyzeCount],
    ['Refinements', stats.refineCount],
    ['Diff requests', stats.diffCount],
    ['History items', stats.analysisHistoryCount],
    ['Average score', stats.averageScore],
    ['Last activity', stats.lastActivityAt ? new Date(stats.lastActivityAt).toLocaleString() : '—']
  ].map(([label, value]) => `<div class="finding"><strong>${label}</strong><div>${escapeHtml(String(value))}</div></div>`).join('');
}

async function refreshSidebarData() {
  const [history, stats] = await Promise.all([api.analyses(), api.stats()]);
  state.history = history.items || [];
  state.stats = stats;
  renderHistory();
  renderStats();
}

async function loadPresets() {
  const response = await api.presets();
  state.presets = response.items || [];
  els.sampleChips.innerHTML = state.presets.map((preset) => `<button class="sample-chip" data-id="${preset.id}">${preset.name}</button>`).join('');
  els.sampleChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    const preset = state.presets.find((item) => item.id === button.dataset.id);
    if (!preset) return;
    els.input.value = preset.description;
  });
}

async function runAnalysis() {
  const text = els.input.value.trim();
  if (!text) return;
  els.analyzeBtn.disabled = true;
  els.analyzeBtn.textContent = 'Working…';
  try {
    const tone = els.tone.value;
    const [analysis, refinement] = await Promise.all([api.analyze(text), api.refine(text, tone)]);
    const diff = await api.diff(text, refinement.refinedText);
    state.analysis = analysis;
    state.refinement = refinement;
    state.diff = diff;

    scoreEls.precision.textContent = analysis.overallScore;
    scoreEls.clarity.textContent = analysis.breakdown.clarity;
    scoreEls.vagueness.textContent = analysis.breakdown.vagueness;
    scoreEls.jargon.textContent = analysis.breakdown.jargon;
    scoreEls.passive.textContent = analysis.breakdown.passiveVoice;
    scoreEls.redundancy.textContent = analysis.breakdown.redundancy;
    updateBadge(analysis.overallScore);
    updateRadar(analysis.breakdown);
    renderFindings(analysis.findings || []);
    renderDiff(diff.chunks || []);
    els.annotatedText.innerHTML = annotateText(text, analysis.highlights || {});
    els.rewriteText.textContent = refinement.refinedText || '';
    renderList(els.vagueList, analysis.highlights?.vague || []);
    renderList(els.jargonList, analysis.highlights?.jargon || []);
    renderList(els.strongList, analysis.highlights?.strong || []);
    await refreshSidebarData();
  } finally {
    els.analyzeBtn.disabled = false;
    els.analyzeBtn.textContent = 'Analyze & refine';
  }
}

function wireTabs() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('is-active'));
      button.classList.add('is-active');
      document.getElementById(`tab-${button.dataset.tab}`).classList.add('is-active');
    });
  });
}

els.analyzeBtn.addEventListener('click', runAnalysis);
els.clearBtn.addEventListener('click', () => {
  els.input.value = '';
  updateBadge(null);
});
els.copyBadge.addEventListener('click', async () => {
  const score = state.analysis?.overallScore;
  const text = score == null ? 'Language Precision: waiting for analysis' : `Language Precision: ${score}/100 (${badgeLabel(score)})`;
  await navigator.clipboard.writeText(text);
  els.copyBadge.textContent = 'Copied';
  setTimeout(() => { els.copyBadge.textContent = 'Copy score badge'; }, 1200);
});

wireTabs();
loadPresets();
refreshSidebarData();
