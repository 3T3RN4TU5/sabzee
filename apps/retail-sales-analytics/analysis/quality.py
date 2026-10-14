"""A tiny data-quality framework: named checks that record evidence and fail loudly.

Every check is recorded (pass, warn or fail) so the dashboard can show the full
report, and `QualityReport.raise_on_failure()` aborts the pipeline with a
readable message if any blocking check failed.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

Severity = Literal["error", "warn"]
Status = Literal["pass", "warn", "fail"]


class DataQualityError(RuntimeError):
    """Raised when one or more blocking data-quality checks fail."""


@dataclass
class Check:
    name: str
    stage: str
    category: str
    status: Status
    observed: Any
    expected: str
    detail: str = ""


@dataclass
class QualityReport:
    checks: list[Check] = field(default_factory=list)

    def check(
        self,
        name: str,
        *,
        stage: str,
        category: str,
        ok: bool,
        observed: Any,
        expected: str,
        detail: str = "",
        severity: Severity = "error",
    ) -> bool:
        if isinstance(observed, float):
            observed = round(observed, 6)
        status: Status = "pass" if ok else ("fail" if severity == "error" else "warn")
        self.checks.append(Check(name, stage, category, status, observed, expected, detail))
        return ok

    @property
    def failures(self) -> list[Check]:
        return [c for c in self.checks if c.status == "fail"]

    def raise_on_failure(self) -> None:
        if self.failures:
            lines = [f"  - [{c.stage}] {c.name}: observed {c.observed!r}, expected {c.expected}" for c in self.failures]
            raise DataQualityError(f"{len(self.failures)} data-quality check(s) failed:\n" + "\n".join(lines))

    def to_dict(self) -> list[dict[str, Any]]:
        return [asdict(c) for c in self.checks]

    def summary(self) -> dict[str, int]:
        out = {"pass": 0, "warn": 0, "fail": 0}
        for c in self.checks:
            out[c.status] += 1
        return out
