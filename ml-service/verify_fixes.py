r"""
Verification script: confirm all four bugs are fixed in the new code.
Run from ml-service/ directory:
  C:\Users\ELCOT\AppData\Local\Programs\Python\Python314\python.exe verify_fixes.py
"""
import sys
sys.path.insert(0, ".")

import numpy as np

# Monkey-patch Pydantic classes so we can run without fastapi installed
class MonthlyFeature:
    def __init__(self, **kw): self.__dict__.update(kw)

class CategoryData:
    def __init__(self, **kw): self.__dict__.update(kw)

# Patch schemas to avoid import errors
import types
schemas_mod = types.ModuleType("schemas")
pred_mod    = types.ModuleType("schemas.prediction")
pred_mod.MonthlyFeature = MonthlyFeature
pred_mod.CategoryData   = CategoryData
sys.modules["schemas"]            = schemas_mod
sys.modules["schemas.prediction"] = pred_mod

from services.linear_model  import run_linear_regression
from services.rf_model      import run_random_forest
from services.risk_ranking  import calculate_risk_ranking

MONTHS = [
    MonthlyFeature(month="2026-04", amount=12000, transaction_count=15, category_count=4, overall_budget=20000),
    MonthlyFeature(month="2026-05", amount=13500, transaction_count=18, category_count=4, overall_budget=20000),
    MonthlyFeature(month="2026-06", amount=11000, transaction_count=12, category_count=3, overall_budget=20000),
    MonthlyFeature(month="2026-07", amount=15000, transaction_count=20, category_count=5, overall_budget=20000),
    MonthlyFeature(month="2026-08", amount=14200, transaction_count=16, category_count=4, overall_budget=20000),
]

CATEGORIES = [
    CategoryData(category="Food",      spent=4000, budget=5000,  transaction_count=8),
    CategoryData(category="Shopping",  spent=5500, budget=4000,  transaction_count=5),
    CategoryData(category="Transport", spent=2500, budget=5000,  transaction_count=4),
    CategoryData(category="Bills",     spent=2200, budget=6000,  transaction_count=3),
]
total_spent_correct = sum(c.spent for c in CATEGORIES)  # 14200

print("=" * 70)
print("VERIFICATION: All bugs fixed")
print("=" * 70)

# --- FIX 1: Linear Regression must NOT return r2_score ---
lr = run_linear_regression(MONTHS)
assert lr["success"]
assert "r2_score" not in lr, "FAIL: r2_score still present in linear result"
assert "cv_mae"   in lr,     "FAIL: cv_mae missing from linear result"
assert "cv_rmse"  in lr,     "FAIL: cv_rmse missing from linear result"
assert "evaluation_reliable" in lr
print(f"[PASS] Linear Regression: prediction={lr['prediction']:.0f}, "
      f"cv_mae={lr['cv_mae']:.0f}, cv_rmse={lr['cv_rmse']:.0f}, "
      f"reliable={lr['evaluation_reliable']}")

# --- FIX 2: Random Forest must NOT return r2_score ---
rf = run_random_forest(MONTHS)
assert rf["success"]
assert "r2_score" not in rf, "FAIL: r2_score still present in rf result"
assert "cv_mae"   in rf,     "FAIL: cv_mae missing from rf result"
assert "cv_rmse"  in rf,     "FAIL: cv_rmse missing from rf result"
print(f"[PASS] Random Forest:     prediction={rf['prediction']:.0f}, "
      f"cv_mae={rf['cv_mae']:.0f}, cv_rmse={rf['cv_rmse']:.0f}, "
      f"reliable={rf['evaluation_reliable']}")

# --- FIX 3: total_spent must = sum(cat.spent), not last monthly amount ---
ranking = calculate_risk_ranking(CATEGORIES, total_transaction_count=20, total_spent=total_spent_correct)
all_scores = [r["risk_score"] for r in ranking]
print(f"[INFO] Risk ranking (score desc): {[(r['category'], r['risk_score'], r['risk_level']) for r in ranking]}")

# Shopping is 5500/4000 = 137.5% utilised -> should be highest risk
assert ranking[0]["category"] == "Shopping", (
    f"FAIL: Expected Shopping as highest risk, got {ranking[0]['category']}")
print(f"[PASS] Risk ranking top category: {ranking[0]['category']} (score={ranking[0]['risk_score']})")

# --- FIX 4: util_factor cap at 1.0 -- verify no score exceeds 100 ---
for r in ranking:
    assert r["risk_score"] <= 100, f"FAIL: score > 100 for {r['category']}: {r['risk_score']}"
print(f"[PASS] All risk scores <= 100")

# --- FIX 4b: verify scores are discriminating (not all compressed to 100) ---
unique_scores = len(set(all_scores))
assert unique_scores > 1, "FAIL: All categories got the same risk score (ceiling collision)"
print(f"[PASS] Risk scores are discriminating: {sorted(set(all_scores), reverse=True)}")

# --- FIX 4c: verify utilisation_pct is present and correct ---
shopping = next(r for r in ranking if r["category"] == "Shopping")
assert shopping["utilisation_pct"] is not None
expected_util = round(5500 / 4000 * 100, 1)
assert shopping["utilisation_pct"] == expected_util, (
    f"FAIL: Shopping utilisation_pct = {shopping['utilisation_pct']}, expected {expected_util}")
print(f"[PASS] Shopping utilisation_pct = {shopping['utilisation_pct']}%")

# --- Ensemble calculation check ---
ensemble = round((lr["prediction"] + rf["prediction"]) / 2.0, 2)
print(f"\n[INFO] Ensemble = ({lr['prediction']:.0f} + {rf['prediction']:.0f}) / 2 = {ensemble:.0f}")

# --- Budget difference sign check ---
budget = 20000
diff = budget - ensemble
over = diff < 0
print(f"[INFO] Budget difference: {budget:.0f} - {ensemble:.0f} = {diff:.0f} "
      f"({'OVER budget' if over else 'under budget'})")

print()
print("=" * 70)
print("ALL CHECKS PASSED - bugs confirmed fixed")
print("=" * 70)
