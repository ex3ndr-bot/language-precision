"""FastAPI application and lightweight browser UI."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

from language_precision.analyzer import DescriptionAnalyzer
from language_precision.generator import DescriptionGenerator
from language_precision.models import AnalyzeRequest, GenerationRequest, ImproveRequest, RefineRequest
from language_precision.refiner import IterativeRefiner
from language_precision.self_improve import AgentSelfImprover

app = FastAPI(title="Language Precision")

_analyzer = DescriptionAnalyzer()
_generator = DescriptionGenerator()
_refiner = IterativeRefiner(_analyzer)
_self_improver = AgentSelfImprover(_analyzer)


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    """Serve a simple interactive UI."""

    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Language Precision</title>
  <style>
    :root {
      --bg: #f5efe4;
      --panel: rgba(255, 251, 245, 0.9);
      --ink: #18230f;
      --muted: #5a624f;
      --accent: #b85c38;
      --line: #d8c7aa;
    }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(184, 92, 56, 0.18), transparent 30%),
        linear-gradient(135deg, #f5efe4, #efe2c6);
    }
    .wrap {
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }
    h1, h2 {
      margin: 0 0 12px;
      letter-spacing: 0.02em;
    }
    .lead {
      max-width: 760px;
      color: var(--muted);
      margin-bottom: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 18px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 14px 36px rgba(24, 35, 15, 0.08);
      backdrop-filter: blur(8px);
    }
    label {
      display: block;
      font-size: 0.9rem;
      margin: 14px 0 6px;
      color: var(--muted);
    }
    textarea, input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: #fffdf9;
      color: var(--ink);
      font: inherit;
    }
    textarea {
      min-height: 120px;
      resize: vertical;
    }
    button {
      margin-top: 14px;
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      background: var(--accent);
      color: white;
      font: inherit;
      cursor: pointer;
    }
    .result {
      white-space: pre-wrap;
      background: #fffdf9;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
      min-height: 120px;
      margin-top: 14px;
      overflow-x: auto;
    }
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .caption {
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 6px;
    }
    @media (max-width: 720px) {
      .compare {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Language Precision</h1>
    <p class="lead">Analyze rough copy, generate sharper descriptions, refine weak drafts, and improve prompts based on output quality.</p>
    <div class="grid">
      <section class="panel">
        <h2>Analyze</h2>
        <label for="analyze-text">Text</label>
        <textarea id="analyze-text">We help teams work better with innovative software.</textarea>
        <button onclick="analyze()">Analyze</button>
        <div class="result" id="analyze-result"></div>
      </section>
      <section class="panel">
        <h2>Generate</h2>
        <label for="company-name">Company</label>
        <input id="company-name" value="Northwind AI" />
        <label for="what-they-do">What they do</label>
        <input id="what-they-do" value="workflow automation for compliance-heavy teams" />
        <label for="target-audience">Target audience</label>
        <input id="target-audience" value="operations leaders at mid-market healthcare companies" />
        <label for="differentiators">Key differentiators</label>
        <textarea id="differentiators">deploys in days without replacing existing systems
captures every approval step for audit readiness</textarea>
        <button onclick="generate()">Generate</button>
        <div class="result" id="generate-result"></div>
      </section>
      <section class="panel">
        <h2>Refine</h2>
        <label for="refine-text">Draft</label>
        <textarea id="refine-text">We are a modern platform that helps businesses improve operations.</textarea>
        <label for="refine-rounds">Rounds</label>
        <input id="refine-rounds" type="number" min="1" max="5" value="2" />
        <button onclick="refine()">Refine</button>
        <div class="compare">
          <div>
            <div class="caption">Original</div>
            <div class="result" id="refine-original"></div>
          </div>
          <div>
            <div class="caption">Refined</div>
            <div class="result" id="refine-result"></div>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2>Improve Prompt</h2>
        <label for="prompt-text">Prompt</label>
        <textarea id="prompt-text">Write a product description.</textarea>
        <label for="output-text">Output</label>
        <textarea id="output-text">Our platform is the best solution for everyone.</textarea>
        <button onclick="improve()">Improve</button>
        <div class="compare">
          <div>
            <div class="caption">Issues</div>
            <div class="result" id="improve-issues"></div>
          </div>
          <div>
            <div class="caption">Improved Prompt</div>
            <div class="result" id="improve-result"></div>
          </div>
        </div>
      </section>
    </div>
  </div>
  <script>
    async function postJson(url, payload) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return response.json();
    }

    async function analyze() {
      const text = document.getElementById("analyze-text").value;
      const data = await postJson("/analyze", { text });
      document.getElementById("analyze-result").textContent = JSON.stringify(data, null, 2);
    }

    async function generate() {
      const differentiators = document.getElementById("differentiators").value
        .split("\\n")
        .map((item) => item.trim())
        .filter(Boolean);
      const data = await postJson("/generate", {
        company_name: document.getElementById("company-name").value,
        what_they_do: document.getElementById("what-they-do").value,
        target_audience: document.getElementById("target-audience").value,
        key_differentiators: differentiators
      });
      document.getElementById("generate-result").textContent = JSON.stringify(data, null, 2);
    }

    async function refine() {
      const text = document.getElementById("refine-text").value;
      document.getElementById("refine-original").textContent = text;
      const data = await postJson("/refine", {
        text,
        rounds: Number(document.getElementById("refine-rounds").value)
      });
      document.getElementById("refine-result").textContent = data.final_text;
    }

    async function improve() {
      const data = await postJson("/improve", {
        prompt: document.getElementById("prompt-text").value,
        output: document.getElementById("output-text").value
      });
      document.getElementById("improve-issues").textContent = data.prompt_gaps.join("\\n");
      document.getElementById("improve-result").textContent = data.improved_prompt;
    }
  </script>
</body>
</html>"""


@app.post("/analyze")
async def analyze_text(request: AnalyzeRequest) -> dict[str, object]:
    """Analyze a text payload."""

    return _analyzer.analyze(request.text).model_dump()


@app.post("/generate")
async def generate_text(request: GenerationRequest) -> dict[str, object]:
    """Generate descriptions from structured company input."""

    return _generator.generate(
        company_name=request.company_name,
        what_they_do=request.what_they_do,
        target_audience=request.target_audience,
        key_differentiators=request.key_differentiators,
        tone=request.tone,
        desired_call_to_action=request.desired_call_to_action,
    ).model_dump()


@app.post("/refine")
async def refine_text(request: RefineRequest) -> dict[str, object]:
    """Refine draft text across multiple rounds."""

    return _refiner.refine(request.text, rounds=request.rounds).model_dump()


@app.post("/improve")
async def improve_prompt(request: ImproveRequest) -> dict[str, object]:
    """Improve an agent prompt using output analysis."""

    return _self_improver.improve_prompt(request.prompt, request.output).model_dump()
