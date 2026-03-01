# Tax calculation engine — policy-driven since TaxMate v2
# Slabs, rebates, standard deduction, and cess are all drawn from the
# ACTIVE TaxPolicy (propagated by policy_engine.py at runtime).
# Falls back to hardcoded FY 2023-24 values ONLY when no policy is provided,
# so the engine never returns incorrect data silently.
from typing import Any, Dict, List, Optional

# ── Fallback constants (FY 2023-24) — used ONLY when no policy is supplied ───
_FALLBACK_OLD_SLABS: List[Dict[str, Any]] = [
    {"min": 0,       "max": 250000,   "rate": 0.00},
    {"min": 250001,  "max": 500000,   "rate": 0.05},
    {"min": 500001,  "max": 1000000,  "rate": 0.20},
    {"min": 1000001, "max": None,     "rate": 0.30},
]
_FALLBACK_NEW_SLABS: List[Dict[str, Any]] = [
    {"min": 0,       "max": 300000,   "rate": 0.00},
    {"min": 300001,  "max": 600000,   "rate": 0.05},
    {"min": 600001,  "max": 900000,   "rate": 0.10},
    {"min": 900001,  "max": 1200000,  "rate": 0.15},
    {"min": 1200001, "max": 1500000,  "rate": 0.20},
    {"min": 1500001, "max": None,     "rate": 0.30},
]
_FALLBACK_STD_DEDUCTION      = 50000.0
_FALLBACK_OLD_REBATE_LIMIT   = 500000.0
_FALLBACK_OLD_REBATE_AMOUNT  = 12500.0
_FALLBACK_NEW_REBATE_LIMIT   = 700000.0
_FALLBACK_NEW_REBATE_AMOUNT  = 25000.0
_FALLBACK_CESS               = 0.04


def _compute_tax(
    slabs: List[Dict[str, Any]],
    taxable_income: float,
    rebate_limit: float,
    rebate_amount: float,
    cess_rate: float,
) -> float:
    """Pure slab calculator — policy-agnostic helper."""
    tax = 0.0
    for slab in slabs:
        slab_min = slab["min"]
        slab_max = slab.get("max")  # None = unbounded
        rate = slab["rate"]
        if taxable_income <= slab_min:
            break
        upper = min(taxable_income, slab_max) if slab_max is not None else taxable_income
        tax += (upper - slab_min) * rate

    # Rebate under Section 87A
    if taxable_income <= rebate_limit:
        tax = max(0.0, tax - rebate_amount)

    return tax * (1 + cess_rate)


class TaxEngine:
    """
    Deterministic rule engine for Indian Income Tax (Old & New Regimes).

    Parameters
    ----------
    age           : taxpayer age (for senior citizen slab lookup — future use)
    income_details: dict of income heads, e.g. {"salary": 1_200_000, "interest": 10_000}
    deductions    : dict of deductions, e.g. {"80c": 150_000, "80d": 25_000, "hra": 50_000}
    policy        : ActivePolicyContext dict from policy_engine.get_active_context().
                    When None, falls back to hardcoded FY 2023-24 values.
    """

    def __init__(
        self,
        age: int,
        income_details: Dict[str, float],
        deductions: Dict[str, float],
        policy: Optional[Any] = None,   # ActivePolicyContext | dict | None
    ):
        self.age = age
        self.income_details = income_details
        self.deductions = deductions
        self.gross_income = sum(self.income_details.values())

        # ── Resolve policy values ──────────────────────────────────────────
        if policy is not None:
            # Accept either a Pydantic model or a plain dict
            _p = policy if isinstance(policy, dict) else policy.model_dump()
            old = _p.get("old_regime", {})
            new = _p.get("new_regime", {})
            self._policy_id         = _p.get("policy_id")
            self._std_deduction     = _p.get("standard_deduction", _FALLBACK_STD_DEDUCTION)
            self._old_slabs         = old.get("slabs", _FALLBACK_OLD_SLABS)
            self._new_slabs         = new.get("slabs", _FALLBACK_NEW_SLABS)
            self._old_rebate_limit  = old.get("rebate_limit",  _FALLBACK_OLD_REBATE_LIMIT)
            self._old_rebate_amount = old.get("rebate_amount", _FALLBACK_OLD_REBATE_AMOUNT)
            self._new_rebate_limit  = new.get("rebate_limit",  _FALLBACK_NEW_REBATE_LIMIT)
            self._new_rebate_amount = new.get("rebate_amount", _FALLBACK_NEW_REBATE_AMOUNT)
            self._cess              = _p.get("cess_rate", _FALLBACK_CESS)
        else:
            self._policy_id         = None
            self._std_deduction     = _FALLBACK_STD_DEDUCTION
            self._old_slabs         = _FALLBACK_OLD_SLABS
            self._new_slabs         = _FALLBACK_NEW_SLABS
            self._old_rebate_limit  = _FALLBACK_OLD_REBATE_LIMIT
            self._old_rebate_amount = _FALLBACK_OLD_REBATE_AMOUNT
            self._new_rebate_limit  = _FALLBACK_NEW_REBATE_LIMIT
            self._new_rebate_amount = _FALLBACK_NEW_REBATE_AMOUNT
            self._cess              = _FALLBACK_CESS

    def calculate_old_regime(self) -> Dict[str, Any]:
        """
        Old Regime: standard deduction + itemised deductions (80C, 80D, HRA…).
        Slabs and rebate drawn from the active policy.
        """
        has_salary = self.income_details.get("salary", 0) > 0
        std_deduction    = self._std_deduction if has_salary else 0.0
        total_deduction  = std_deduction + sum(self.deductions.values())
        net_taxable      = max(0.0, self.gross_income - total_deduction)

        tax = _compute_tax(
            self._old_slabs, net_taxable,
            self._old_rebate_limit, self._old_rebate_amount, self._cess,
        )

        return {
            "regime":                   "Old Regime",
            "policy_id":                self._policy_id,
            "net_taxable_income":       net_taxable,
            "total_deductions_claimed": total_deduction,
            "tax_liability":            tax,
        }

    def calculate_new_regime(self) -> Dict[str, Any]:
        """
        New Regime: only standard deduction allowed; most deductions disallowed.
        Slabs and rebate drawn from the active policy.
        """
        has_salary    = self.income_details.get("salary", 0) > 0
        std_deduction = self._std_deduction if has_salary else 0.0
        net_taxable   = max(0.0, self.gross_income - std_deduction)

        tax = _compute_tax(
            self._new_slabs, net_taxable,
            self._new_rebate_limit, self._new_rebate_amount, self._cess,
        )

        return {
            "regime":                   "New Regime",
            "policy_id":                self._policy_id,
            "net_taxable_income":       net_taxable,
            "total_deductions_claimed": std_deduction,
            "tax_liability":            tax,
        }

    def get_recommendation(self) -> Dict[str, Any]:
        old  = self.calculate_old_regime()
        new  = self.calculate_new_regime()
        savings     = abs(old["tax_liability"] - new["tax_liability"])
        recommended = "New Regime" if new["tax_liability"] <= old["tax_liability"] else "Old Regime"

        return {
            "gross_income": self.gross_income,
            "policy_id":    self._policy_id,
            "old_regime":   old,
            "new_regime":   new,
            "recommendation":    recommended,
            "potential_savings": savings,
        }
