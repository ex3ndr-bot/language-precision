"""Click command line interface for language precision tools."""

from __future__ import annotations

import click

from language_precision.analyzer import DescriptionAnalyzer
from language_precision.generator import DescriptionGenerator
from language_precision.refiner import IterativeRefiner
from language_precision.self_improve import AgentSelfImprover


@click.group()
def cli() -> None:
    """Language precision analysis and refinement CLI."""


@cli.command()
@click.argument("text")
def analyze(text: str) -> None:
    """Analyze text and print a precision report as JSON."""

    report = DescriptionAnalyzer().analyze(text)
    click.echo(report.model_dump_json(indent=2))


@cli.command()
@click.option("--company-name", required=True, type=str)
@click.option("--what-they-do", required=True, type=str)
@click.option("--target-audience", required=True, type=str)
@click.option("--key-differentiator", "key_differentiators", multiple=True)
@click.option("--tone", default="clear, credible, and direct", show_default=True)
@click.option("--desired-call-to-action", type=str)
def generate(
    company_name: str,
    what_they_do: str,
    target_audience: str,
    key_differentiators: tuple[str, ...],
    tone: str,
    desired_call_to_action: str | None,
) -> None:
    """Generate descriptions at multiple lengths."""

    bundle = DescriptionGenerator().generate(
        company_name=company_name,
        what_they_do=what_they_do,
        target_audience=target_audience,
        key_differentiators=list(key_differentiators),
        tone=tone,
        desired_call_to_action=desired_call_to_action,
    )
    click.echo(bundle.model_dump_json(indent=2))


@cli.command()
@click.option("--text", required=True, type=str)
@click.option("--rounds", default=1, show_default=True, type=click.IntRange(1, 5))
def refine(text: str, rounds: int) -> None:
    """Refine text over one or more rounds."""

    result = IterativeRefiner().refine(text=text, rounds=rounds)
    click.echo(result.model_dump_json(indent=2))


@cli.command(name="improve")
@click.option("--prompt", required=True, type=str)
@click.option("--output", required=True, type=str)
def improve_command(prompt: str, output: str) -> None:
    """Improve a prompt based on the quality of a previous output."""

    result = AgentSelfImprover().improve_prompt(prompt=prompt, output=output)
    click.echo(result.model_dump_json(indent=2))
