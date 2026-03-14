# Language Precision

`language-precision` is a small Python toolkit for evaluating and improving business and product descriptions. It combines heuristic scoring with structured suggestions so rough messaging can be turned into clearer, more specific, more complete copy.

## Features

- Analyze text for `precision`, `clarity`, `completeness`, and `persuasiveness`
- Generate polished descriptions from rough company inputs
- Refine existing descriptions over multiple rounds with targeted suggestions
- Improve agent prompts by evaluating weak outputs and proposing prompt changes
- Use from Python, a Click CLI, or a FastAPI web app with a simple side-by-side UI

## Installation

```bash
pip install -e .
```

## CLI

Analyze text:

```bash
language-precision analyze "We help teams work better."
```

Generate descriptions:

```bash
language-precision generate \
  --company-name "Northwind AI" \
  --what-they-do "workflow automation for compliance-heavy teams" \
  --target-audience "operations leaders at mid-market healthcare companies" \
  --key-differentiator "deploys in days without replacing existing systems"
```

Refine text:

```bash
language-precision refine \
  --text "We are an innovative platform for modern businesses." \
  --rounds 2
```

Improve an agent prompt:

```bash
language-precision improve \
  --prompt "Write a product description." \
  --output "Our platform is the best solution for everyone."
```

## Web App

Run the FastAPI application locally:

```bash
uvicorn language_precision.web:app --reload
```

Open `http://127.0.0.1:8000` for the interactive UI. The app exposes:

- `POST /analyze`
- `POST /generate`
- `POST /refine`
- `POST /improve`

## Python Usage

```python
from language_precision import (
    AgentSelfImprover,
    DescriptionAnalyzer,
    DescriptionGenerator,
    IterativeRefiner,
)

analyzer = DescriptionAnalyzer()
report = analyzer.analyze("We help finance teams close their books in hours, not days.")

generator = DescriptionGenerator()
bundle = generator.generate(
    company_name="Northwind AI",
    what_they_do="workflow automation for compliance-heavy teams",
    target_audience="operations leaders at mid-market healthcare companies",
    key_differentiators=[
        "deploys in days without replacing existing systems",
        "captures every approval step for audit readiness",
    ],
)

refiner = IterativeRefiner()
result = refiner.refine("We are a modern platform for business.", rounds=2)

self_improver = AgentSelfImprover()
review = self_improver.improve_prompt(
    prompt="Write a sharp product description.",
    output="Our product helps many companies improve results.",
)
```

## Design Notes

The package is intentionally heuristic and dependency-light. It does not rely on an LLM. Scores are derived from observable text features such as:

- named entities, numbers, and concrete qualifiers for precision
- readability, sentence length, and passive voice proxies for clarity
- mention of who, what, why, how, and outcomes for completeness
- action verbs, urgency cues, and proof-oriented signals for persuasiveness

This makes the tool predictable, easy to extend, and safe to run in local or offline workflows.

## Project Layout

```text
src/language_precision/
  analyzer.py
  cli.py
  generator.py
  models.py
  refiner.py
  self_improve.py
  web.py
examples/
```
