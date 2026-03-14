"""Heuristic analysis for language precision and quality."""

from __future__ import annotations

import re
from collections import Counter

try:
    import textstat
except ModuleNotFoundError:  # pragma: no cover - depends on runtime environment
    textstat = None

from language_precision.models import (
    AnalysisDimension,
    ImprovementSuggestion,
    PrecisionReport,
)


class DescriptionAnalyzer:
    """Scores descriptive text across precision-oriented dimensions."""

    _STOPWORDS = {
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "by",
        "for",
        "from",
        "in",
        "is",
        "it",
        "of",
        "on",
        "or",
        "that",
        "the",
        "their",
        "to",
        "we",
        "with",
        "you",
        "your",
    }
    _ACTION_WORDS = {
        "accelerate",
        "automate",
        "build",
        "convert",
        "cut",
        "deliver",
        "drive",
        "eliminate",
        "grow",
        "improve",
        "increase",
        "launch",
        "optimize",
        "reduce",
        "scale",
        "simplify",
        "streamline",
        "transform",
        "unlock",
    }
    _URGENCY_WORDS = {"now", "today", "immediately", "fast", "faster", "quickly", "urgent"}
    _SOCIAL_PROOF_WORDS = {
        "trusted",
        "customers",
        "teams",
        "leaders",
        "used",
        "proven",
        "adopted",
        "clients",
        "results",
    }
    _VAGUE_WORDS = {
        "best",
        "better",
        "innovative",
        "cutting-edge",
        "world-class",
        "seamless",
        "powerful",
        "robust",
        "various",
        "many",
        "some",
        "modern",
        "leading",
    }
    _COMPLETENESS_SIGNALS = {
        "who": {"for", "teams", "companies", "leaders", "buyers", "customers", "audience", "users"},
        "what": {"platform", "software", "service", "tool", "helps", "provides", "enables", "automates"},
        "why": {"because", "so", "so that", "to help", "to reduce", "to increase", "to improve"},
        "how": {"with", "through", "using", "via", "by", "without"},
    }

    def analyze(self, text: str) -> PrecisionReport:
        """Analyze text and return a detailed precision report."""

        cleaned_text = text.strip()
        words = self._tokenize(cleaned_text)
        sentences = self._split_sentences(cleaned_text)
        word_count = len(words)
        sentence_count = len(sentences)
        readability_grade = self._safe_readability(cleaned_text)
        keywords = self._extract_keywords(words)

        precision = self._score_precision(cleaned_text, words)
        clarity = self._score_clarity(cleaned_text, sentences, readability_grade)
        completeness = self._score_completeness(cleaned_text)
        persuasiveness = self._score_persuasiveness(cleaned_text, words)

        overall = round(
            (
                precision.score * 0.3
                + clarity.score * 0.25
                + completeness.score * 0.25
                + persuasiveness.score * 0.2
            ),
            2,
        )
        missing_elements = self._identify_missing_elements(cleaned_text)
        suggestions = self._build_suggestions(
            text=cleaned_text,
            precision=precision,
            clarity=clarity,
            completeness=completeness,
            persuasiveness=persuasiveness,
            missing_elements=missing_elements,
        )

        return PrecisionReport(
            original_text=cleaned_text,
            overall_score=overall,
            precision=precision,
            clarity=clarity,
            completeness=completeness,
            persuasiveness=persuasiveness,
            readability_grade=readability_grade,
            sentence_count=sentence_count,
            word_count=word_count,
            keywords=keywords,
            missing_elements=missing_elements,
            suggestions=suggestions,
        )

    def _score_precision(self, text: str, words: list[str]) -> AnalysisDimension:
        numbers = len(re.findall(r"\b\d+(?:\.\d+)?%?\b", text))
        concrete_phrases = len(re.findall(r"\b(days?|weeks?|months?|hours?|minutes?)\b", text, flags=re.IGNORECASE))
        qualifiers = len(re.findall(r"\b(mid-market|enterprise|healthcare|finance|operations|compliance)\b", text, flags=re.IGNORECASE))
        vague_hits = [word for word in words if word.lower() in self._VAGUE_WORDS]
        score = min(100.0, 35 + numbers * 12 + concrete_phrases * 10 + qualifiers * 8 - len(vague_hits) * 6)

        strengths: list[str] = []
        weaknesses: list[str] = []
        evidence: list[str] = []
        if numbers:
            strengths.append("Includes measurable details that anchor claims.")
            evidence.append(f"Detected {numbers} numeric detail(s).")
        if concrete_phrases or qualifiers:
            strengths.append("Uses concrete qualifiers that narrow the claim.")
        if vague_hits:
            weaknesses.append("Relies on vague adjectives instead of evidence-backed specifics.")
            evidence.append(f"Vague terms: {', '.join(sorted(set(vague_hits))[:5])}.")
        if not strengths:
            weaknesses.append("Claims remain broad and would benefit from more specifics.")

        return AnalysisDimension(
            score=round(max(score, 5.0), 2),
            summary="Measures how specific, concrete, and verifiable the claims are.",
            strengths=strengths,
            weaknesses=weaknesses,
            evidence=evidence,
        )

    def _score_clarity(
        self,
        text: str,
        sentences: list[str],
        readability_grade: float,
    ) -> AnalysisDimension:
        avg_sentence_length = len(self._tokenize(text)) / max(len(sentences), 1)
        passive_hits = len(re.findall(r"\b(is|are|was|were|be|been|being)\s+\w+ed\b", text, flags=re.IGNORECASE))
        readability_penalty = max(0.0, readability_grade - 10.0) * 4
        length_penalty = max(0.0, avg_sentence_length - 22.0) * 1.5
        score = min(100.0, 92 - readability_penalty - length_penalty - passive_hits * 5)

        strengths: list[str] = []
        weaknesses: list[str] = []
        evidence = [f"Average sentence length: {avg_sentence_length:.1f} words."]
        if readability_grade <= 10:
            strengths.append("Readability is accessible for a broad professional audience.")
        else:
            weaknesses.append("Readability is high-grade and may slow comprehension.")
        if avg_sentence_length <= 22:
            strengths.append("Sentence length is controlled and easier to scan.")
        else:
            weaknesses.append("Several ideas are packed into long sentences.")
        if passive_hits:
            weaknesses.append("Passive constructions dilute directness.")
            evidence.append(f"Passive voice proxy hits: {passive_hits}.")

        return AnalysisDimension(
            score=round(max(score, 5.0), 2),
            summary="Measures readability, sentence control, and direct expression.",
            strengths=strengths,
            weaknesses=weaknesses,
            evidence=evidence,
        )

    def _score_completeness(self, text: str) -> AnalysisDimension:
        lowered = text.lower()
        present = {
            element: any(signal in lowered for signal in signals)
            for element, signals in self._COMPLETENESS_SIGNALS.items()
        }
        score = 28 + sum(18 for hit in present.values() if hit)
        missing = [element for element, hit in present.items() if not hit]

        strengths = [f"Addresses '{element}'." for element, hit in present.items() if hit]
        weaknesses = [f"Does not clearly cover '{element}'." for element in missing]
        evidence = [f"Coverage signals found for: {', '.join([key for key, hit in present.items() if hit]) or 'none'}."]

        return AnalysisDimension(
            score=round(min(float(score), 100.0), 2),
            summary="Measures whether the description covers audience, offering, motivation, and method.",
            strengths=strengths,
            weaknesses=weaknesses,
            evidence=evidence,
        )

    def _score_persuasiveness(self, text: str, words: list[str]) -> AnalysisDimension:
        action_hits = sum(1 for word in words if word.lower() in self._ACTION_WORDS)
        urgency_hits = sum(1 for word in words if word.lower() in self._URGENCY_WORDS)
        proof_hits = sum(1 for word in words if word.lower() in self._SOCIAL_PROOF_WORDS)
        score = min(100.0, 32 + action_hits * 10 + urgency_hits * 8 + proof_hits * 9)

        strengths: list[str] = []
        weaknesses: list[str] = []
        evidence = [
            f"Action words: {action_hits}.",
            f"Urgency cues: {urgency_hits}.",
            f"Proof signals: {proof_hits}.",
        ]
        if action_hits:
            strengths.append("Uses outcome-oriented verbs that create momentum.")
        else:
            weaknesses.append("Needs stronger action verbs tied to customer outcomes.")
        if proof_hits:
            strengths.append("Includes signals that imply trust or adoption.")
        else:
            weaknesses.append("Adds little proof that the claims are credible.")
        if not urgency_hits:
            weaknesses.append("Lacks urgency or a reason to act now.")

        return AnalysisDimension(
            score=round(max(score, 5.0), 2),
            summary="Measures action orientation, trust cues, and motivation to respond.",
            strengths=strengths,
            weaknesses=weaknesses,
            evidence=evidence,
        )

    def _identify_missing_elements(self, text: str) -> list[str]:
        lowered = text.lower()
        missing: list[str] = []
        for element, signals in self._COMPLETENESS_SIGNALS.items():
            if not any(signal in lowered for signal in signals):
                missing.append(element)
        if not re.search(r"\b\d+(?:\.\d+)?%?\b", text):
            missing.append("measurable proof")
        if not any(word in lowered.split() for word in self._ACTION_WORDS):
            missing.append("strong action verbs")
        return missing

    def _build_suggestions(
        self,
        text: str,
        precision: AnalysisDimension,
        clarity: AnalysisDimension,
        completeness: AnalysisDimension,
        persuasiveness: AnalysisDimension,
        missing_elements: list[str],
    ) -> list[ImprovementSuggestion]:
        suggestions: list[ImprovementSuggestion] = []

        if precision.score < 65:
            suggestions.append(
                ImprovementSuggestion(
                    category="precision",
                    issue="The description is broad and hard to verify.",
                    recommendation="Add measurable outcomes, named audiences, or concrete implementation details.",
                    example_before="We help businesses improve operations.",
                    example_after="We help regional healthcare operations teams cut intake processing time by 42% in 30 days.",
                    priority="high",
                )
            )
        if clarity.score < 70:
            suggestions.append(
                ImprovementSuggestion(
                    category="clarity",
                    issue="The writing is harder to scan than it needs to be.",
                    recommendation="Break long sentences, prefer active voice, and keep one core idea per sentence.",
                    example_before=text[:120] if text else None,
                    example_after="Use shorter sentences that state the audience, problem, and result directly.",
                    priority="medium",
                )
            )
        if completeness.score < 75:
            missing = ", ".join(missing_elements[:4]) or "who, what, why, and how"
            suggestions.append(
                ImprovementSuggestion(
                    category="completeness",
                    issue="Important context is missing.",
                    recommendation=f"Add the missing elements explicitly: {missing}.",
                    example_before="Our platform changes the game.",
                    example_after="Our platform helps compliance teams approve vendor requests faster by routing each step automatically.",
                    priority="high",
                )
            )
        if persuasiveness.score < 65:
            suggestions.append(
                ImprovementSuggestion(
                    category="persuasiveness",
                    issue="The text explains too little about impact and urgency.",
                    recommendation="Use stronger verbs, highlight a concrete result, and include proof or a call to action.",
                    example_before="We offer software for busy teams.",
                    example_after="Trusted by 200+ operations teams, our software cuts handoff delays so managers can clear backlogs this week.",
                    priority="medium",
                )
            )
        if not suggestions:
            suggestions.append(
                ImprovementSuggestion(
                    category="general",
                    issue="The text is strong overall but can still be tightened.",
                    recommendation="Test alternative openings that front-load the audience, outcome, and differentiator.",
                    priority="low",
                )
            )

        return suggestions

    def _extract_keywords(self, words: list[str]) -> list[str]:
        meaningful = [word.lower() for word in words if word.lower() not in self._STOPWORDS and len(word) > 3]
        counts = Counter(meaningful)
        return [word for word, _ in counts.most_common(8)]

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"\b[\w-]+\b", text)

    def _split_sentences(self, text: str) -> list[str]:
        segments = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", text) if segment.strip()]
        return segments or ([text.strip()] if text.strip() else [])

    def _safe_readability(self, text: str) -> float:
        if not text.strip():
            return 0.0
        if textstat is None:
            words = max(len(self._tokenize(text)), 1)
            sentences = max(len(self._split_sentences(text)), 1)
            return round(min((words / sentences) / 2.0, 18.0), 2)
        try:
            return round(float(textstat.flesch_kincaid_grade(text)), 2)
        except (TypeError, ValueError, ZeroDivisionError):
            return 0.0
