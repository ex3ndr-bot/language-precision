"""Iterative text refinement built on analysis heuristics."""

from __future__ import annotations

import re

from language_precision.analyzer import DescriptionAnalyzer
from language_precision.models import PrecisionReport, RefinementResult, RefinementRound


class IterativeRefiner:
    """Analyzes text, suggests improvements, and rewrites it over multiple rounds."""

    def __init__(self, analyzer: DescriptionAnalyzer | None = None) -> None:
        self.analyzer = analyzer or DescriptionAnalyzer()

    def refine(self, text: str, rounds: int = 1) -> RefinementResult:
        """Refine text across one or more iterations."""

        current_text = text.strip()
        history: list[RefinementRound] = []

        for round_number in range(1, rounds + 1):
            report = self.analyzer.analyze(current_text)
            revised_text, applied_changes = self._rewrite(current_text, report)
            history.append(
                RefinementRound(
                    round_number=round_number,
                    report=report,
                    revised_text=revised_text,
                    applied_changes=applied_changes,
                )
            )
            current_text = revised_text

        final_report = self.analyzer.analyze(current_text)
        return RefinementResult(
            original_text=text,
            final_text=current_text,
            rounds=history,
            final_report=final_report,
        )

    def _rewrite(self, text: str, report: PrecisionReport) -> tuple[str, list[str]]:
        updated = " ".join(text.split())
        applied_changes: list[str] = []

        if "who" in report.missing_elements:
            updated = f"For operations-focused teams, {updated[0].lower() + updated[1:]}" if updated else updated
            applied_changes.append("Added a clearer audience reference.")

        if "what" in report.missing_elements and "platform" not in updated.lower():
            updated += " The platform focuses on one clear operational job instead of broad promises."
            applied_changes.append("Clarified the offering.")

        if "why" in report.missing_elements:
            updated += " This matters because teams need a faster, lower-risk path to measurable outcomes."
            applied_changes.append("Added the reason the message matters.")

        if "how" in report.missing_elements:
            updated += " It does that by turning manual steps into a repeatable workflow."
            applied_changes.append("Explained the mechanism.")

        if "measurable proof" in report.missing_elements:
            updated += " In practice, that means faster cycle times, fewer handoff errors, and clearer accountability."
            applied_changes.append("Added concrete proof-oriented outcomes.")

        updated = self._replace_vague_terms(updated, applied_changes)
        updated = self._shorten_sentences(updated, applied_changes)

        if report.persuasiveness.score < 65:
            updated += " Teams can evaluate the value quickly and act with more confidence."
            applied_changes.append("Strengthened action and urgency cues.")

        return updated.strip(), applied_changes

    def _replace_vague_terms(self, text: str, applied_changes: list[str]) -> str:
        replacements = {
            r"\binnovative\b": "practical",
            r"\bcutting-edge\b": "purpose-built",
            r"\bmodern\b": "operationally focused",
            r"\bpowerful\b": "results-driven",
            r"\bseamless\b": "straightforward",
            r"\bbest\b": "more credible",
        }
        updated = text
        for pattern, replacement in replacements.items():
            new_text = re.sub(pattern, replacement, updated, flags=re.IGNORECASE)
            if new_text != updated:
                applied_changes.append(f"Replaced vague wording with '{replacement}'.")
                updated = new_text
        return updated

    def _shorten_sentences(self, text: str, applied_changes: list[str]) -> str:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        revised: list[str] = []
        shortened = False
        for sentence in sentences:
            words = sentence.split()
            if len(words) > 28 and "," in sentence:
                parts = [part.strip() for part in sentence.split(",") if part.strip()]
                revised.extend(
                    [part if part.endswith((".", "!", "?")) else f"{part}." for part in parts]
                )
                shortened = True
            elif sentence.strip():
                revised.append(sentence.strip())
        if shortened:
            applied_changes.append("Split long sentences for readability.")
        return " ".join(revised)
