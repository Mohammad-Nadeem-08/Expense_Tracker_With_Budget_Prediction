from fastapi import FastAPI
from typing import List, Any

from schemas.prediction import UnifiedPredictionRequest
from services.linear_model import run_linear_regression
from services.rf_model import run_random_forest
from services.risk_ranking import calculate_risk_ranking

app = FastAPI(title="SmartSpend ML Service")


@app.get("/")
def root():
    return {"message": "SmartSpend ML Service is running"}


@app.post("/predict/unified")
def predict_unified(request: UnifiedPredictionRequest):
    """
    Unified prediction endpoint that runs:
      1. Linear Regression (time-series, walk-forward CV)
      2. Random Forest Regressor (lag features, walk-forward CV)
      3. Ensemble average of the two predictions
      4. Deterministic category risk ranking

    Evaluation metrics reported are walk-forward MAE/RMSE, NOT training-set
    R². Training R² is intentionally excluded because it is misleading on
    small datasets (a 100-tree RF memorises 4 training points → R²≈1.0
    despite having no predictive value).
    """
    # 1. Linear Regression
    linear_result = run_linear_regression(request.monthly_features)

    # 2. Random Forest
    rf_result = run_random_forest(request.monthly_features)

    # 3. Ensemble average (only combine models that succeeded)
    if linear_result["success"] and rf_result["success"]:
        ensemble_prediction = round(
            (linear_result["prediction"] + rf_result["prediction"]) / 2.0, 2
        )
    elif linear_result["success"]:
        ensemble_prediction = linear_result["prediction"]
    elif rf_result["success"]:
        ensemble_prediction = rf_result["prediction"]
    else:
        ensemble_prediction = None

    # 4. Risk ranking
    # total_spent = sum of current-period category.spent values.
    # IMPORTANT: do NOT use monthly_features[-1].amount here — that is the
    # last historical month total, which may differ from the current period
    # totals captured in request.categories.
    total_spent = sum(cat.spent for cat in request.categories)

    risk_ranking = calculate_risk_ranking(
        categories=request.categories,
        total_transaction_count=request.total_transaction_count,
        total_spent=total_spent,
    )

    return {
        "success": True,
        "linear_regression": linear_result,
        "random_forest": rf_result,
        "ensemble_prediction": ensemble_prediction,
        "risk_ranking": risk_ranking,
    }