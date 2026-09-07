from pydantic import BaseModel
from typing import List, Optional

class MonthlyExpense(BaseModel):
    month: str
    amount: float

class MonthlyFeature(BaseModel):
    month: str
    amount: float
    transaction_count: int
    category_count: int
    overall_budget: float

class CategoryData(BaseModel):
    category: str
    spent: float
    budget: float
    transaction_count: int

class UnifiedPredictionRequest(BaseModel):
    monthly_features: List[MonthlyFeature]
    categories: List[CategoryData]
    overall_budget: float
    total_transaction_count: int
