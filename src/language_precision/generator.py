"""Description generation utilities."""

from __future__ import annotations

from language_precision.models import GenerationBundle, GenerationRequest


class DescriptionGenerator:
    """Builds polished company descriptions from rough structured input."""

    def generate(
        self,
        company_name: str,
        what_they_do: str,
        target_audience: str,
        key_differentiators: list[str] | None = None,
        tone: str = "clear, credible, and direct",
        desired_call_to_action: str | None = None,
    ) -> GenerationBundle:
        """Create tweet, paragraph, and full-page descriptions."""

        request = GenerationRequest(
            company_name=company_name,
            what_they_do=what_they_do,
            target_audience=target_audience,
            key_differentiators=key_differentiators or [],
            tone=tone,
            desired_call_to_action=desired_call_to_action,
        )
        differentiator_text = self._join_differentiators(request.key_differentiators)
        cta = request.desired_call_to_action or f"See how {request.company_name} can help your team move faster."

        tweet = self._build_tweet(request, differentiator_text)
        paragraph = self._build_paragraph(request, differentiator_text, cta)
        full_page = self._build_full_page(request, differentiator_text, cta)

        return GenerationBundle(
            request=request,
            tweet=tweet,
            paragraph=paragraph,
            full_page=full_page,
        )

    def _build_tweet(self, request: GenerationRequest, differentiator_text: str) -> str:
        base = (
            f"{request.company_name} helps {request.target_audience} "
            f"{request.what_they_do}."
        )
        if differentiator_text:
            base += f" Unlike generic tools, it {differentiator_text}."
        return self._trim_to_length(base, 280)

    def _build_paragraph(
        self,
        request: GenerationRequest,
        differentiator_text: str,
        cta: str,
    ) -> str:
        paragraph = (
            f"{request.company_name} helps {request.target_audience} {request.what_they_do}. "
            f"The message is simple: teams get a practical way to move from manual friction to reliable execution. "
            f"{request.company_name} stands out because it {differentiator_text or 'focuses on clear outcomes, fast adoption, and operational trust'}. "
            f"Written in a {request.tone} tone, this description emphasizes who benefits, what changes, and why it matters now. "
            f"{cta}"
        )
        return paragraph

    def _build_full_page(
        self,
        request: GenerationRequest,
        differentiator_text: str,
        cta: str,
    ) -> str:
        intro = (
            f"{request.company_name} is built for {request.target_audience} who need {request.what_they_do} "
            f"without adding unnecessary complexity."
        )
        challenge = (
            f"Most teams in this market are forced to work around slow handoffs, fragmented tools, and messaging that sounds impressive but says very little. "
            f"{request.company_name} replaces that ambiguity with a focused offer that explains exactly what the product does and why buyers should care."
        )
        differentiators = (
            f"What makes {request.company_name} credible is that it {differentiator_text or 'turns broad promises into concrete operational advantages'}."
        )
        outcome = (
            f"For buyers, the value is not abstract. The platform gives teams a clearer way to evaluate fit, understand the implementation path, and connect features to business outcomes."
        )
        close = (
            f"If you need messaging that is {request.tone}, start with the essentials: audience, problem, mechanism, and result. "
            f"{cta}"
        )
        return " ".join([intro, challenge, differentiators, outcome, close])

    def _join_differentiators(self, differentiators: list[str]) -> str:
        if not differentiators:
            return ""
        if len(differentiators) == 1:
            return differentiators[0]
        if len(differentiators) == 2:
            return f"{differentiators[0]} and {differentiators[1]}"
        return f"{', '.join(differentiators[:-1])}, and {differentiators[-1]}"

    def _trim_to_length(self, text: str, max_length: int) -> str:
        if len(text) <= max_length:
            return text
        trimmed = text[: max_length - 1].rsplit(" ", 1)[0]
        return f"{trimmed}…"
