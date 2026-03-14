"""Pydantic models used across the package."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AnalysisDimension(BaseModel):
    """Represents a scored quality dimension."""

    score: float = Field(ge=0.0, le=100.0)
    summary: str
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)


class ImprovementSuggestion(BaseModel):
    """Actionable suggestion for improving text quality."""

    category: Literal["precision", "clarity", "completeness", "persuasiveness", "general"]
    issue: str
    recommendation: str
    example_before: str | None = None
    example_after: str | None = None
    priority: Literal["high", "medium", "low"] = "medium"


class PrecisionReport(BaseModel):
    """Full analysis report for a text sample."""

    original_text: str
    overall_score: float = Field(ge=0.0, le=100.0)
    precision: AnalysisDimension
    clarity: AnalysisDimension
    completeness: AnalysisDimension
    persuasiveness: AnalysisDimension
    readability_grade: float = Field(ge=0.0)
    sentence_count: int = Field(ge=0)
    word_count: int = Field(ge=0)
    keywords: list[str] = Field(default_factory=list)
    missing_elements: list[str] = Field(default_factory=list)
    suggestions: list[ImprovementSuggestion] = Field(default_factory=list)


class GenerationRequest(BaseModel):
    """Structured input for description generation."""

    company_name: str
    what_they_do: str
    target_audience: str
    key_differentiators: list[str] = Field(default_factory=list)
    tone: str = "clear, credible, and direct"
    desired_call_to_action: str | None = None


class GenerationBundle(BaseModel):
    """Generated outputs at multiple lengths."""

    request: GenerationRequest
    tweet: str
    paragraph: str
    full_page: str


class RefinementRound(BaseModel):
    """Single iteration of refinement."""

    round_number: int = Field(ge=1)
    report: PrecisionReport
    revised_text: str
    applied_changes: list[str] = Field(default_factory=list)


class RefinementResult(BaseModel):
    """Result of iterative text refinement."""

    original_text: str
    final_text: str
    rounds: list[RefinementRound] = Field(default_factory=list)
    final_report: PrecisionReport


class AgentPromptModification(BaseModel):
    """Prompt change recommendation aimed at future outputs."""

    title: str
    rationale: str
    replacement_text: str


class AgentPromptImprovement(BaseModel):
    """Review of an agent prompt and output pair."""

    original_prompt: str
    original_output: str
    output_report: PrecisionReport
    prompt_gaps: list[str] = Field(default_factory=list)
    modifications: list[AgentPromptModification] = Field(default_factory=list)
    improved_prompt: str


class AnalyzeRequest(BaseModel):
    text: str


class RefineRequest(BaseModel):
    text: str
    rounds: int = Field(default=1, ge=1, le=5)


class ImproveRequest(BaseModel):
    prompt: str
    output: str
