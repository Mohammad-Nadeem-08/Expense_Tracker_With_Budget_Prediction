from typing import List
from schemas.prediction import CategoryData


def calculate_risk_ranking(
    categories: List[CategoryData],
    total_transaction_count: int,
    total_spent: float,
) -> list:
    """
    Deterministic, explainable spending-risk scoring.

    Score (0–100) = weighted sum of three normalised factors:

      UtilFactor  (weight 35): How far the category is into its budget.
                               Capped at 1.0x utilisation to keep the
                               maximum raw contribution exactly 35, so the
                               three components sum to at most 75 before
                               rescaling. Over-budget categories receive
                               the full 35 points.

      ShareFactor (weight 25): Category's share of total spending this period.
                               A category that absorbs 100% of spend scores 25.

      FreqFactor  (weight 15): Category's share of total transactions.
                               A category with 100% of transactions scores 15.

    Raw max = 35 + 25 + 15 = 75  →  scaled to 100 by multiplying by 100/75.

    total_spent MUST be the sum of category.spent (current-period spend),
    NOT the last monthly total from monthly_features (different time window).
    """
    ranked = []

    for cat in categories:
        # ── 1. UtilFactor ────────────────────────────────────────────────────
        # cap at 1.0 so max raw contribution = 35 (keeps the 3-component
        # sum bounded at 75 before the 100/75 rescaling step)
        if cat.budget > 0:
            utilisation = cat.spent / cat.budget
            util_factor = min(utilisation, 1.0) * 35
        elif cat.spent > 0:
            # No budget set but spending exists → treat as fully utilised
            util_factor = 35.0
        else:
            util_factor = 0.0

        # ── 2. ShareFactor ──────────────────────────────────────────────────
        share_factor = 0.0
        if total_spent > 0:
            share_factor = (cat.spent / total_spent) * 25

        # ── 3. FreqFactor ───────────────────────────────────────────────────
        freq_factor = 0.0
        if total_transaction_count > 0:
            freq_ratio = cat.transaction_count / total_transaction_count
            freq_factor = min(freq_ratio, 1.0) * 15

        # ── Risk score: rescale 0–75 → 0–100 ────────────────────────────────
        base_score = util_factor + share_factor + freq_factor
        risk_score = min(round(base_score * (100.0 / 75.0)), 100)

        # ── Risk level ───────────────────────────────────────────────────────
        if risk_score >= 70:
            risk_level = "High"
        elif risk_score >= 40:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # ── Explainability: collect the top contributing factors ─────────────
        factors = []
        if cat.budget > 0:
            pct = round(cat.spent / cat.budget * 100, 1)
            if pct >= 80:
                factors.append(f"{pct}% of budget utilised")
        elif cat.spent > 0:
            factors.append("No budget set – uncontrolled spending")

        if total_spent > 0:
            share_pct = round(cat.spent / total_spent * 100, 1)
            if share_pct >= 20:
                factors.append(f"{share_pct}% share of total spending")

        if total_transaction_count > 0:
            freq_pct = round(cat.transaction_count / total_transaction_count * 100, 1)
            if freq_pct >= 20:
                factors.append(f"{freq_pct}% of all transactions")

        if not factors:
            factors = ["Normal spending patterns"]

        ranked.append({
            "category": cat.category,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "contributing_factors": factors,
            "spent": round(cat.spent, 2),
            "budget": round(cat.budget, 2),
            "utilisation_pct": (
                round(cat.spent / cat.budget * 100, 1) if cat.budget > 0 else None
            ),
        })

    # Sort by risk score descending, then alphabetically as tiebreaker
    ranked.sort(key=lambda x: (-x["risk_score"], x["category"]))

    for i, item in enumerate(ranked):
        item["rank"] = i + 1

    return ranked
