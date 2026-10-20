import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np

data = pd.read_csv("monthly_expenses_2_years.csv")
values = data["expense"].astype(float)

# Hold out the last 6 months to check how well the forecast predicts them
train, actual = values[:-6], values[-6:]

model = ExponentialSmoothing(
    train,
    trend="add",
    seasonal=None
).fit()

predicted = model.forecast(len(actual))

mae = mean_absolute_error(actual, predicted)
rmse = np.sqrt(mean_squared_error(actual, predicted))

print(f"MAE:  {mae:.2f}")
print(f"RMSE: {rmse:.2f}")
print(f"Actual:    {list(actual.round(2))}")
print(f"Predicted: {list(predicted.round(2))}")