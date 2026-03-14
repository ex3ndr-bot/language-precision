"""Prompt improvement utilities for better future agent outputs."""

from __future__ import annotations

from language_precision.analyzer import DescriptionAnalyzer
from language_precision.models import AgentPromptImprovement, AgentPromptModification


class AgentSelfImprover:
    """Evaluates an output and proposes prompt changes that raise precision."""

    def __init__(self, analyzer: DescriptionAnalyzer | None = None) -> None:
        self.analyzer = analyzer or DescriptionAnalyzer()

    def improve_prompt(self, prompt: str, output: str) -> AgentPromptImprovement:
        """Suggest prompt modifications based on output weaknesses."""

        report = self.analyzer.analyze(output)
        prompt_gaps: list[str] = []
        modifications: list[AgentPromptModification] = []

        if report.precision.score < 65:
            prompt_gaps.append("The prompt does not force measurable or audience-specific details.")
            modifications.append(
                AgentPromptModification(
                    title="Require concrete facts",
                    rationale="Outputs stay generic unless the prompt demands verifiable specifics.",
                    replacement_text="Include at least one named audience, one measurable outcome, and one implementation detail.",
                )
            )
        if report.completeness.score < 75:
            prompt_gaps.append("The prompt does not require who, what, why, and how.")
            modifications.append(
                AgentPromptModification(
                    title="Add structural checkpoints",
                    rationale="A fixed structure reduces omissions.",
                    replacement_text="Structure the response in this order: audience, problem, solution, mechanism, result, call to action.",
                )
            )
        if report.clarity.score < 70:
            prompt_gaps.append("The prompt does not constrain sentence length or tone.")
            modifications.append(
                AgentPromptModification(
                    title="Constrain style",
                    rationale="Explicit style constraints reduce long or vague sentences.",
                    replacement_text="Use short sentences, active voice, and plain language suitable for a busy decision-maker.",
                )
            )
        if report.persuasiveness.score < 65:
            prompt_gaps.append("The prompt does not ask for evidence-backed persuasion.")
            modifications.append(
                AgentPromptModification(
                    title="Add proof and action requirements",
                    rationale="Persuasive copy needs trust signals and an implied next step.",
                    replacement_text="Include one proof signal such as adoption, speed, or reliability, then end with a clear reason to act.",
                )
            )
        if not modifications:
            modifications.append(
                AgentPromptModification(
                    title="Preserve high-performing structure",
                    rationale="The output is already strong, so improvements should be incremental.",
                    replacement_text="Keep the current structure but move the most concrete differentiator into the first sentence.",
                )
            )

        improved_prompt = self._compose_prompt(prompt, modifications)

        return AgentPromptImprovement(
            original_prompt=prompt,
            original_output=output,
            output_report=report,
            prompt_gaps=prompt_gaps,
            modifications=modifications,
            improved_prompt=improved_prompt,
        )

    def _compose_prompt(self, prompt: str, modifications: list[AgentPromptModification]) -> str:
        instructions = " ".join(modification.replacement_text for modification in modifications)
        return f"{prompt.strip()} {instructions}".strip()
