from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from sklearn.linear_model import LinearRegression
import numpy as np

app = FastAPI(title="SmartSpend ML Service")


class MonthlyExpense(BaseModel):
    month: str
    amount: float


class PredictionRequest(BaseModel):
    monthly_spending: List[MonthlyExpense]


@app.get("/")
def root():
    return {
        "message": "SmartSpend ML Service is running"
    }


@app.post("/predict")
def predict(request: PredictionRequest):

    data = request.monthly_spending

    # Need at least 3 months of historical data
    if len(data) < 3:
        return {
            "success": False,
            "message": "At least 3 months of expense history is required.",
            "prediction": None,
            "model": "Linear Regression"
        }

    # Sort chronologically
    data = sorted(
        data,
        key=lambda item: item.month
    )

    # X = month number
    # y = spending amount
    X = np.array(
        [[index + 1] for index in range(len(data))],
        dtype=float
    )

    y = np.array(
        [item.amount for item in data],
        dtype=float
    )

    # Create and train ML model
    model = LinearRegression()

    model.fit(X, y)

    # Predict the next month
    next_month_number = np.array(
        [[len(data) + 1]],
        dtype=float
    )

    prediction = model.predict(
        next_month_number
    )[0]

    # Spending cannot be negative
    prediction = max(0, float(prediction))

    # Model accuracy score
    score = model.score(X, y)

    return {
        "success": True,
        "prediction": round(prediction, 2),
        "model": "Linear Regression",
        "training_months": len(data),
        "r2_score": round(float(score), 4)
    }