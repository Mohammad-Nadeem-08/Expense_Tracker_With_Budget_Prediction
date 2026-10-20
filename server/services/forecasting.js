const roundMoney = (value) => Number(Math.max(0, value).toFixed(2));

const validateSeries = (values) => {
    if (!Array.isArray(values) || values.length === 0) {
        throw new TypeError("At least one monthly value is required.");
    }
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new TypeError("Monthly values must be finite, non-negative numbers.");
    }
};

const movingAverage = (values) => {
    const recent = values.slice(-3);
    return recent.reduce((sum, value) => sum + value, 0) / recent.length;
};

const weightedMovingAverage = (values) => {
    const recent = values.slice(-3);
    const weights = [0.2, 0.3, 0.5].slice(-recent.length);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    return recent.reduce((sum, value, index) => sum + value * weights[index], 0) / weightTotal;
};

const simpleExponentialSmoothing = (values, alpha = 0.5) => {
    let level = values[0];
    for (let index = 1; index < values.length; index += 1) {
        level = alpha * values[index] + (1 - alpha) * level;
    }
    return level;
};

const forecastNextMonth = (values) => {
    validateSeries(values);
    const predictions = {
        movingAverage: roundMoney(movingAverage(values)),
        weightedMovingAverage: roundMoney(weightedMovingAverage(values)),
        exponentialSmoothing: roundMoney(simpleExponentialSmoothing(values)),
    };
    const finalPrediction = roundMoney(
        Object.values(predictions).reduce((total, value) => total + value, 0)
            / Object.keys(predictions).length,
    );
    return { predictions, finalPrediction };
};

const scoreForecasts = (actuals, forecasts) => {
    if (!Array.isArray(actuals) || !Array.isArray(forecasts)
        || actuals.length === 0 || actuals.length !== forecasts.length
        || [...actuals, ...forecasts].some((value) => !Number.isFinite(value) || value < 0)) {
        throw new TypeError("Actuals and forecasts must be equal-length arrays of non-negative numbers.");
    }
    const errors = forecasts.map((forecast, index) => forecast - actuals[index]);
    const absoluteErrors = errors.map(Math.abs);
    const percentageErrors = errors
        .map((error, index) => (actuals[index] === 0 ? null : Math.abs(error) / Math.abs(actuals[index])))
        .filter((value) => value !== null);

    return {
        observations: actuals.length,
        mae: roundMoney(absoluteErrors.reduce((sum, value) => sum + value, 0) / errors.length),
        rmse: roundMoney(Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / errors.length)),
        mape: percentageErrors.length
            ? Number((percentageErrors.reduce((sum, value) => sum + value, 0) / percentageErrors.length * 100).toFixed(2))
            : null,
        bias: Number((errors.reduce((sum, error) => sum + error, 0) / errors.length).toFixed(2)),
    };
};

const walkForwardBacktest = (values, { minTrainingMonths = 12, maxFolds = 12 } = {}) => {
    validateSeries(values);
    if (!Number.isInteger(minTrainingMonths) || minTrainingMonths < 1
        || !Number.isInteger(maxFolds) || maxFolds < 1) {
        throw new TypeError("Backtest settings must be positive integers.");
    }
    if (values.length <= minTrainingMonths) {
        return {
            status: "insufficient_history",
            requiredTrainingMonths: minTrainingMonths,
            availableMonths: values.length,
            folds: 0,
            models: null,
        };
    }

    const firstTargetIndex = Math.max(minTrainingMonths, values.length - maxFolds);
    const actuals = [];
    const forecasts = {
        movingAverage: [],
        weightedMovingAverage: [],
        exponentialSmoothing: [],
        ensemble: [],
    };

    for (let targetIndex = firstTargetIndex; targetIndex < values.length; targetIndex += 1) {
        const result = forecastNextMonth(values.slice(0, targetIndex));
        actuals.push(values[targetIndex]);
        Object.keys(result.predictions).forEach((model) => forecasts[model].push(result.predictions[model]));
        forecasts.ensemble.push(result.finalPrediction);
    }

    return {
        status: "complete",
        requiredTrainingMonths: minTrainingMonths,
        availableMonths: values.length,
        folds: actuals.length,
        holdout: "Expanding-window one-month-ahead forecasts; each prediction uses earlier months only.",
        models: Object.fromEntries(Object.entries(forecasts).map(([model, predictions]) => [
            model,
            scoreForecasts(actuals, predictions),
        ])),
    };
};

module.exports = {
    forecastNextMonth,
    walkForwardBacktest,
    movingAverage,
    weightedMovingAverage,
    simpleExponentialSmoothing,
    scoreForecasts,
};
