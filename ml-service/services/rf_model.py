import numpy as np
from sklearn.ensemble import RandomForestRegressor
from typing import List
from schemas.prediction import MonthlyFeature


def _build_lagged_dataset(data: list):
    """
    Build a supervised dataset using a 1-step lag structure.
    For month N we use features from month N-1 to predict month N's spending.

    Features used per sample:
      - prev_amount:       previous month's total spend
      - prev_txn_count:    previous month's number of transactions
      - prev_category_count: previous month's distinct category count
      - prev_budget_util:  previous month's budget utilisation
                           (spend / overall_budget, clamped to [0, 2])

    Returns X (n_samples, 4), y (n_samples,), and the raw label list.
    """
    X, y = [], []
    for i in range(1, len(data)):
        prev = data[i - 1]
        curr = data[i]
        util = (prev.amount / prev.overall_budget
                if prev.overall_budget > 0 else 0.0)
        util = min(util, 2.0)  # cap at 200% utilisation
        X.append([prev.amount, prev.transaction_count,
                  prev.category_count, util])
        y.append(curr.amount)
    return np.array(X, dtype=float), np.array(y, dtype=float)


def run_random_forest(data: List[MonthlyFeature]):
    """
    Random Forest Regressor predicting next month's spending.

    Evaluation strategy: walk-forward time-series cross-validation
    (expanding window). We need at least 2 training lags (3 months of data)
    before we can generate even one test prediction.

    Training R² is NOT reported. It is meaningless on this dataset size
    (100-tree RF on 4 samples achieves near-perfect training R² via
    memorisation, which has no relationship to future prediction quality).

    We report walk-forward MAE and RMSE instead.
    """
    if len(data) < 3:
        return {
            "success": False,
            "message": (
                "At least 3 months of expense history is required for "
                "Random Forest. Currently insufficient data."
            ),
            "prediction": None,
            "model": "Random Forest",
        }

    data = sorted(data, key=lambda item: item.month)
    n = len(data)

    # ── Walk-forward CV ───────────────────────────────────────────────────────
    # Minimum: 2 training lag pairs → need months 1,2,3 to test month 3.
    cv_errors = []
    for test_idx in range(2, n):
        # Build training set from months [0 .. test_idx-1]
        X_tr, y_tr = _build_lagged_dataset(data[:test_idx])
        if len(X_tr) < 1:
            continue
        m = RandomForestRegressor(n_estimators=50, random_state=42)
        m.fit(X_tr, y_tr)
        # Predict test_idx using data[test_idx-1] as the lagged features
        prev = data[test_idx - 1]
        util = (prev.amount / prev.overall_budget
                if prev.overall_budget > 0 else 0.0)
        util = min(util, 2.0)
        X_test = np.array([[prev.amount, prev.transaction_count,
                             prev.category_count, util]])
        y_hat = max(0.0, m.predict(X_test)[0])
        cv_errors.append(abs(data[test_idx].amount - y_hat))

    cv_errors = np.array(cv_errors)
    mae = float(np.mean(cv_errors)) if len(cv_errors) > 0 else None
    rmse = float(np.sqrt(np.mean(cv_errors ** 2))) if len(cv_errors) > 0 else None
    reliable = len(cv_errors) >= 3

    # ── Final model: train on ALL lag pairs, predict month n+1 ───────────────
    X_full, y_full = _build_lagged_dataset(data)
    final_model = RandomForestRegressor(n_estimators=100, random_state=42)
    final_model.fit(X_full, y_full)

    last = data[-1]
    last_util = (last.amount / last.overall_budget
                 if last.overall_budget > 0 else 0.0)
    last_util = min(last_util, 2.0)
    X_next = np.array([[last.amount, last.transaction_count,
                        last.category_count, last_util]])
    prediction = max(0.0, float(final_model.predict(X_next)[0]))

    return {
        "success": True,
        "prediction": round(prediction, 2),
        "model": "Random Forest",
        "training_months": n,
        "feature_names": [
            "prev_month_amount",
            "prev_txn_count",
            "prev_category_count",
            "prev_budget_utilisation",
        ],
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
