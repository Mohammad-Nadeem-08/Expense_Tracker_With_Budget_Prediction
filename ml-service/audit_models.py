"""
Audit script: reproduce the exact training/prediction logic for 5-month dataset
and expose every bug identified.
Run from ml-service/ directory:
  python audit_models.py
"""

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor

# ─────────────────────────────────────────────────────────────
# 5-month synthetic dataset matching typical user data shapes
# (month index, amount, txn_count, category_count, budget)
# ─────────────────────────────────────────────────────────────
MONTHS = [
    {"month": "2026-04", "amount": 12000, "transaction_count": 15, "category_count": 4, "overall_budget": 20000},
    {"month": "2026-05", "amount": 13500, "transaction_count": 18, "category_count": 4, "overall_budget": 20000},
    {"month": "2026-06", "amount": 11000, "transaction_count": 12, "category_count": 3, "overall_budget": 20000},
    {"month": "2026-07", "amount": 15000, "transaction_count": 20, "category_count": 5, "overall_budget": 20000},
    {"month": "2026-08", "amount": 14200, "transaction_count": 16, "category_count": 4, "overall_budget": 20000},
]

print("=" * 70)
print("AUDIT REPORT: 5-Month Dataset")
print("=" * 70)
print()

# ─────────────────────────────────────────────────────────────
# BUG 1: Linear Regression R² = 0.00 — Why?
# ─────────────────────────────────────────────────────────────
print("─" * 70)
print("MODEL 1: LINEAR REGRESSION")
print("─" * 70)

data = sorted(MONTHS, key=lambda x: x["month"])
X = np.array([[i + 1] for i in range(len(data))], dtype=float)
y = np.array([d["amount"] for d in data], dtype=float)

print(f"\nFeatures sent to Linear Regression:")
print(f"  X (month index): {X.flatten().tolist()}")
print(f"  y (amounts):     {y.tolist()}")
print()

lr = LinearRegression()
lr.fit(X, y)
training_r2 = lr.score(X, y)
pred_next = lr.predict([[len(data) + 1]])[0]

print(f"  Coefficient (slope): {lr.coef_[0]:.2f}")
print(f"  Intercept:           {lr.intercept_:.2f}")
print(f"  Prediction (month 6): {pred_next:.2f}")
print()
print(f"  PROBLEM: Training R² = {training_r2:.4f}")
print()

# Explain WHY R² can be near 0 or negative:
mean_y = np.mean(y)
ss_tot = np.sum((y - mean_y) ** 2)
ss_res = np.sum((y - lr.predict(X)) ** 2)
r2_manual = 1 - (ss_res / ss_tot)

print(f"  Diagnose:")
print(f"    Mean spending:       {mean_y:.2f}")
print(f"    SS_tot (variance):   {ss_tot:.2f}")
print(f"    SS_res (residuals):  {ss_res:.2f}")
print(f"    R² manual check:     {r2_manual:.4f}")
print()
print(f"  Root cause: If spending does NOT follow a linear trend")
print(f"  (e.g. goes 12000→13500→11000→15000→14200, a zig-zag),")
print(f"  the flat-line predictor (mean) beats a linear fit, so R² ≤ 0.")
print()

# Demonstrate that training R² ≠ prediction accuracy
print(f"  ⚠  CRITICAL: model.score(X, y) = {training_r2:.4f}")
print(f"     This is the TRAINING R², not a prediction accuracy score.")
print(f"     It measures how well the line fits training data,")
print(f"     NOT how well future months will be predicted.")
print()

# Proper time-series walk-forward validation
print(f"  TIME-SERIES WALK-FORWARD VALIDATION (leave-last-one-out):")
errors = []
for test_idx in range(2, len(data)):  # need ≥2 points to train
    X_train = np.array([[i + 1] for i in range(test_idx)], dtype=float)
    y_train = np.array([data[i]["amount"] for i in range(test_idx)], dtype=float)
    y_actual = data[test_idx]["amount"]

    m = LinearRegression()
    m.fit(X_train, y_train)
    y_pred = m.predict([[test_idx + 1]])[0]
    y_pred = max(0, y_pred)
    err = abs(y_actual - y_pred)
    errors.append(err)
    print(f"    Train on months 1–{test_idx}, predict month {test_idx+1}: "
          f"actual={y_actual:.0f}, pred={y_pred:.0f}, MAE={err:.0f}")

mae_cv = np.mean(errors)
rmse_cv = np.sqrt(np.mean(np.array(errors) ** 2))
print(f"\n  Walk-forward MAE:  {mae_cv:.2f}")
print(f"  Walk-forward RMSE: {rmse_cv:.2f}")
print()

# ─────────────────────────────────────────────────────────────
# BUG 2: Random Forest R² = 0.97 — Why suspicious?
# ─────────────────────────────────────────────────────────────
print("─" * 70)
print("MODEL 2: RANDOM FOREST (current implementation)")
print("─" * 70)
print()

X_rf = []
y_rf = []
for i in range(1, len(data)):
    prev = data[i - 1]
    curr = data[i]
    util = prev["amount"] / prev["overall_budget"] if prev["overall_budget"] > 0 else 0
    X_rf.append([prev["amount"], prev["transaction_count"], prev["category_count"], util])
    y_rf.append(curr["amount"])

X_rf = np.array(X_rf)
y_rf = np.array(y_rf)

print(f"Training samples (current: n_months-1 = {len(X_rf)}):")
for i, (feat, target) in enumerate(zip(X_rf, y_rf)):
    print(f"  Sample {i+1}: features={feat.tolist()}, target={target:.0f}")
print()

rf = RandomForestRegressor(n_estimators=100, random_state=42)
rf.fit(X_rf, y_rf)
training_r2_rf = rf.score(X_rf, y_rf)

print(f"  Training R² = {training_r2_rf:.4f}")
print()
print(f"  ⚠  CRITICAL: This R²={training_r2_rf:.4f} is TRAINING SET R².")
print(f"     With only {len(X_rf)} training samples and a 100-tree Random Forest,")
print(f"     the model MEMORIZES the training data perfectly (overfits).")
print(f"     R²=0.97 on 4 training samples means nothing about predictive power.")
print(f"     A model this overfit will generalize very poorly to truly unseen data.")
print()

# Proper walk-forward for RF
print(f"  TIME-SERIES WALK-FORWARD VALIDATION for Random Forest:")
min_train = 2  # need at least 2 lag samples → 3 months of data
errors_rf = []
for test_idx in range(min_train, len(data)):
    X_tr = []
    y_tr = []
    for i in range(1, test_idx):
        prev = data[i - 1]
        curr = data[i]
        util = prev["amount"] / prev["overall_budget"] if prev["overall_budget"] > 0 else 0
        X_tr.append([prev["amount"], prev["transaction_count"], prev["category_count"], util])
        y_tr.append(curr["amount"])
    if len(X_tr) < 1:
        continue
    X_tr = np.array(X_tr)
    y_tr = np.array(y_tr)

    m = RandomForestRegressor(n_estimators=50, random_state=42)
    m.fit(X_tr, y_tr)

    # Predict test_idx using data[test_idx-1] as features
    prev_test = data[test_idx - 1]
    util_test = prev_test["amount"] / prev_test["overall_budget"] if prev_test["overall_budget"] > 0 else 0
    X_test = np.array([[prev_test["amount"], prev_test["transaction_count"],
                         prev_test["category_count"], util_test]])
    y_pred = max(0, m.predict(X_test)[0])
    y_actual = data[test_idx]["amount"]
    err = abs(y_actual - y_pred)
    errors_rf.append(err)
    print(f"    Train 1–{test_idx-1}, predict month {test_idx+1}: "
          f"actual={y_actual:.0f}, pred={y_pred:.0f}, MAE={err:.0f}")

if errors_rf:
    print(f"\n  Walk-forward MAE:  {np.mean(errors_rf):.2f}")
    print(f"  Walk-forward RMSE: {np.sqrt(np.mean(np.array(errors_rf)**2)):.2f}")
    print(f"\n  Note: With 5 months, RF only gets 2 walk-forward test points,")
    print(f"  which is too few for a statistically reliable estimate.")
else:
    print("  Insufficient data for walk-forward validation of RF.")
print()

# ─────────────────────────────────────────────────────────────
# BUG 3: Risk Ranking total_spent logic in main.py
# ─────────────────────────────────────────────────────────────
print("─" * 70)
print("BUG 3: RISK RANKING — total_spent calculation in main.py")
print("─" * 70)
print()
print("  Current code (main.py lines 37-41):")
print("    total_spent = sum(item.amount for item in request.monthly_features[-1:])")
print("    if len(request.monthly_features) > 0:")
print("        total_spent = request.monthly_features[-1].amount")
print("    else:")
print("        total_spent = sum(cat.spent for cat in request.categories)")
print()
print("  Problem: The first two lines are REDUNDANT (the if overrides the sum).")
print("  More critically: total_spent is set to the LAST MONTH'S TOTAL from")
print("  monthly_features (e.g. ₹14,200), NOT the sum of category.spent values.")
print()
print("  Category.spent values come from CURRENT MONTH expenses only.")
print("  If current month total = ₹8,000 but last monthly_feature = ₹14,200,")
print("  share_factor = (cat_spent / 14200) instead of (cat_spent / 8000).")
print("  This underestimates all category shares by ~43%.")
print()
print("  Fix: total_spent = sum(cat.spent for cat in request.categories)")
print()

# Demonstrate the error numerically
cats_example = [
    {"category": "Food", "spent": 3000, "budget": 4000, "transaction_count": 8},
    {"category": "Shopping", "spent": 2500, "budget": 3000, "transaction_count": 5},
    {"category": "Transport", "spent": 2500, "budget": 5000, "transaction_count": 4},
]
wrong_total = 14200   # last monthly_feature amount
correct_total = sum(c["spent"] for c in cats_example)  # = 8000

print(f"  Example: correct total_spent = {correct_total}, wrong total_spent = {wrong_total}")
for c in cats_example:
    wrong_share = (c["spent"] / wrong_total) * 25
    correct_share = (c["spent"] / correct_total) * 25
    print(f"    {c['category']}: share_factor wrong={wrong_share:.2f}, correct={correct_share:.2f}")
print()

# ─────────────────────────────────────────────────────────────
# BUG 4: Risk Ranking max weight adds up to > 100
# ─────────────────────────────────────────────────────────────
print("─" * 70)
print("BUG 4: RISK RANKING — Weight scaling error")
print("─" * 70)
print()
print("  The three components have these MAX values:")
print("    util_factor:  min(2.0, 2.0) * 35 = 70")
print("    share_factor: 1.0 * 25           = 25")
print("    freq_factor:  1.0 * 15           = 15")
print("    base_score max = 70 + 25 + 15    = 110")
print()
print("  Then scaled by 1.333: 110 * 1.333 = 146.7  → capped at 100")
print()
print("  Root cause: util_factor allows up to 70 (not 35) because")
print("  min(utilization, 2.0) * 35 allows a 2x multiplier.")
print("  The max base_score should be 75 (35+25+15) if util cap = 1.0×35=35.")
print()
print("  The 1.333 scaling was intended to push 75→100, but because")
print("  util allows 2x (= 70 max), a heavily over-budget category")
print("  would score 70+25+15=110 → scaled to 146→100 (clamped).")
print("  Categories with normal utilization score ~75 → 100 (clamped).")
print("  This creates a ceiling-collision problem: many categories")
print("  compress to 100, losing discrimination.")
print()
print("  Fix: cap util_factor at 35 (not 70). Use min(utilization,1.0)*35.")
print("       Then max base = 35+25+15 = 75. Scale by 100/75 = 1.333 correctly.")
print()

# ─────────────────────────────────────────────────────────────
# BUG 5: Ensemble budget_difference sign convention
# ─────────────────────────────────────────────────────────────
print("─" * 70)
print("BUG 5: Budget Difference sign convention in Prediction.jsx")
print("─" * 70)
print()
print("  Current code (Prediction.jsx):")
print("    const budgetDifference = overallBudget - predictedNextMonth")
print()
print("  When predicted > budget: budgetDifference < 0 → negative = over budget ✓")
print("  When predicted < budget: budgetDifference > 0 → positive = under budget ✓")
print()
print("  The sign is mathematically correct but the UI labels it as")
print("  'Projected Difference' and uses Math.abs() for display.")
print("  However: the label says 'Over Budget' or 'Remaining' AFTER abs() —")
print("  this is correct. No math bug here, just confirm labeling is clear.")
print()

# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────
print("=" * 70)
print("SUMMARY OF ISSUES FOUND")
print("=" * 70)
print()
print("1. LINEAR REGRESSION R²=0.00")
print("   Cause: Non-linear spending data (zig-zag) makes a linear trend")
print("   worse than predicting the mean. R² near 0 is mathematically valid.")
print("   Fix: DO NOT label this as prediction accuracy. Report walk-forward")
print("   MAE/RMSE as the evaluation metric instead. Training R² is meaningless.")
print()
print("2. RANDOM FOREST R²=0.97")
print("   Cause: TRAINING SET OVERFITTING. 100-tree RF fitted to 4 samples")
print("   memorizes them perfectly. This R² is completely misleading.")
print("   Fix: Compute walk-forward MAE/RMSE. Do NOT report training R².")
print("   Clearly communicate that with <6 months, evaluation is unreliable.")
print()
print("3. RISK RANKING total_spent BUG")
print("   Cause: main.py uses last monthly_feature.amount instead of")
print("   sum(category.spent) as denominator for share_factor.")
print("   Fix: total_spent = sum(cat.spent for cat in categories)")
print()
print("4. RISK RANKING util_factor CAP BUG")
print("   Cause: min(utilization,2.0)*35 allows max 70, not 35.")
print("   Many normal-utilization categories score >75, all compress to 100.")
print("   Fix: min(utilization,1.0)*35 so max base_score = 75.")
print()
print("5. R² LABELS IN FRONTEND")
print("   Current label: 'Model Score' (acceptable but vague).")
print("   Fix: Replace with 'Walk-forward MAE' and a note that")
print("   small datasets cannot produce statistically reliable R².")
print()
