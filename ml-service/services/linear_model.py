import numpy as np
from sklearn.linear_model import LinearRegression
from typing import List
from schemas.prediction import MonthlyFeature


def run_linear_regression(data: List[MonthlyFeature]):
    """
    Fit a simple Linear Regression model on historical monthly totals
    (X = chronological month index, y = spending amount) and predict
    the next month's spending.

    Evaluation strategy: walk-forward time-series cross-validation
    (also called "expanding-window" validation). For each test fold,
    we train on all months up to fold-1 and predict fold. This is the
    correct approach for time-ordered data; it never leaks future
    information into training.

    R² is NOT reported because on a training set of ≤6 points it is
    a misleading metric that depends heavily on data ordering. We
    instead report walk-forward MAE and RMSE, which reflect true
    out-of-sample performance.
    """
    if len(data) < 3:
        return {
            "success": False,
            "message": "At least 3 months of expense history is required for Linear Regression.",
            "prediction": None,
            "model": "Linear Regression",
        }

    # Sort chronologically (YYYY-MM strings sort lexicographically)
    data = sorted(data, key=lambda item: item.month)
    n = len(data)

    amounts = np.array([item.amount for item in data], dtype=float)

    # ── Walk-forward cross-validation ────────────────────────────────────────
    # We need at least 2 points to fit a line, so we can test from index 2.
    cv_errors = []
    for test_idx in range(2, n):
        X_train = np.arange(1, test_idx + 1, dtype=float).reshape(-1, 1)
        y_train = amounts[:test_idx]
        m = LinearRegression()
        m.fit(X_train, y_train)
        y_pred = max(0.0, m.predict([[test_idx + 1]])[0])
        cv_errors.append(abs(amounts[test_idx] - y_pred))

    cv_errors = np.array(cv_errors)
    mae = float(np.mean(cv_errors)) if len(cv_errors) > 0 else None
    rmse = float(np.sqrt(np.mean(cv_errors ** 2))) if len(cv_errors) > 0 else None
    reliable = len(cv_errors) >= 3  # need ≥3 folds for a useful estimate

    # ── Final model: train on ALL data, predict month n+1 ────────────────────
    X_full = np.arange(1, n + 1, dtype=float).reshape(-1, 1)
    model = LinearRegression()
    model.fit(X_full, amounts)
    prediction = max(0.0, float(model.predict([[n + 1]])[0]))

    return {
        "success": True,
        "prediction": round(prediction, 2),
        "model": "Linear Regression",
        "training_months": n,
        # Walk-forward evaluation metrics (NOT training-set metrics)
        "cv_mae": round(mae, 2) if mae is not None else None,
        "cv_rmse": round(rmse, 2) if rmse is not None else None,
        "cv_folds": len(cv_errors),
        "evaluation_reliable": reliable,
        "evaluation_note": (
            "Walk-forward MAE/RMSE computed via expanding-window CV. "
            "With fewer than 6 months these figures are directional only."
        ) if not reliable else (
            "Walk-forward MAE/RMSE computed via expanding-window CV."
        ),
    }
