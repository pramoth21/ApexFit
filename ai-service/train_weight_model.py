import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "apexfit_weight_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "weight_model.pkl")


def load_dataset():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError("Run prepare_weight_dataset.py first. apexfit_weight_dataset.csv not found.")
    df = pd.read_csv(DATASET_PATH)
    print("Dataset loaded")
    print("Shape:", df.shape)
    print(df.head())
    return df


def clean_dataset(df):
    df = df.copy()
    df = df.dropna()
    df = df.drop_duplicates()
    df["Gender"] = df["Gender"].astype(str).str.strip()
    df["Activity_Level"] = df["Activity_Level"].astype(str).str.strip()
    df["Sleep_Quality"] = df["Sleep_Quality"].astype(str).str.strip()
    df = df[df["Age"] > 0]
    df = df[df["Current_Weight"] > 0]
    df = df[df["BMR"] > 0]
    return df


def evaluate_model(model_name, model, X_test, y_test, X_full, y_full):
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    mse = mean_squared_error(y_test, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, predictions)

    # 5-fold cross-validation on the FULL dataset — a more honest, stable
    # estimate of real-world performance than a single 20-row test split
    cv_scores = cross_val_score(model, X_full, y_full, cv=5, scoring="r2")

    print("\n" + model_name)
    print("-" * 40)
    print("Test-split MAE :", round(mae, 4))
    print("Test-split RMSE:", round(rmse, 4))
    print("Test-split R2  :", round(r2, 4))
    print("5-Fold CV R2 scores:", [round(s, 3) for s in cv_scores])
    print("5-Fold CV R2 mean:", round(cv_scores.mean(), 4), "  std:", round(cv_scores.std(), 4))

    return {
        "model_name": model_name,
        "model": model,
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "cv_r2_mean": cv_scores.mean(),
        "cv_r2_std": cv_scores.std()
    }


def train_models(df):
    target = "Daily_Weight_Change_Rate"

    X = df.drop(target, axis=1)
    y = df[target]

    categorical_features = [
        "Gender",
        "Activity_Level",
        "Sleep_Quality"
    ]

    numeric_features = [
        "Age",
        "Current_Weight",
        "BMR",
        "Daily_Calories_Consumed",
        "Daily_Calorie_Balance",
        "Stress_Level"
    ]

    required_columns = categorical_features + numeric_features
    for col in required_columns:
        if col not in X.columns:
            raise ValueError(f"Missing column: {col}")

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                categorical_features
            )
        ],
        remainder="passthrough"
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    # ---------- Linear Regression (baseline) ----------
    linear_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", LinearRegression())
        ]
    )
    print("\nTraining Linear Regression...")
    linear_model.fit(X_train, y_train)

    # ---------- Random Forest (tuned) ----------
    rf_base_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", RandomForestRegressor(random_state=42))
        ]
    )
    print("\nTraining Random Forest with tuning...")
    rf_param_grid = {
        "model__n_estimators": [100, 200, 300, 400],
        "model__max_depth": [4, 6, 8, 12, None],
        "model__min_samples_split": [2, 4, 5, 8],
        "model__min_samples_leaf": [1, 2, 3],
        "model__max_features": ["sqrt", "log2", None]
    }
    rf_grid_search = GridSearchCV(
        rf_base_model,
        rf_param_grid,
        cv=5,
        scoring="r2",
        n_jobs=-1
    )
    rf_grid_search.fit(X_train, y_train)
    best_rf_model = rf_grid_search.best_estimator_
    print("Best Random Forest Params:", rf_grid_search.best_params_)

    # ---------- Gradient Boosting (tuned) ----------
    gb_base_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", GradientBoostingRegressor(random_state=42))
        ]
    )
    print("\nTraining Gradient Boosting with tuning...")
    gb_param_grid = {
        "model__n_estimators": [100, 200, 300],
        "model__learning_rate": [0.01, 0.05, 0.1],
        "model__max_depth": [2, 3, 4],
        "model__min_samples_leaf": [1, 2, 3]
    }
    gb_grid_search = GridSearchCV(
        gb_base_model,
        gb_param_grid,
        cv=5,
        scoring="r2",
        n_jobs=-1
    )
    gb_grid_search.fit(X_train, y_train)
    best_gb_model = gb_grid_search.best_estimator_
    print("Best Gradient Boosting Params:", gb_grid_search.best_params_)

    # ---------- Evaluate all three ----------
    linear_result = evaluate_model("Linear Regression", linear_model, X_test, y_test, X, y)
    rf_result = evaluate_model("Random Forest Regression", best_rf_model, X_test, y_test, X, y)
    gb_result = evaluate_model("Gradient Boosting Regression", best_gb_model, X_test, y_test, X, y)

    # Pick the winner using CV mean R2 (more reliable than a single test split)
    all_results = [linear_result, rf_result, gb_result]
    best_result = max(all_results, key=lambda r: r["cv_r2_mean"])

    print("\n" + "=" * 60)
    print("Model comparison (ranked by 5-Fold CV R2 mean):")
    for r in sorted(all_results, key=lambda x: x["cv_r2_mean"], reverse=True):
        print(f"  {r['model_name']:30s} CV R2 mean = {round(r['cv_r2_mean'], 4)}  (std {round(r['cv_r2_std'], 4)})")

    print("\nBest selected model:", best_result["model_name"])

    if best_result["cv_r2_mean"] >= 0.60:
        print("Result: Good. Cross-validated R2 is above 0.60")
    elif best_result["cv_r2_mean"] >= 0.40:
        print("Result: Reasonable for a 100-row dataset. More data would likely improve this further.")
    else:
        print("Result: Weak signal. Consider adding more training data or reviewing feature choices.")

    return best_result


def save_model(best_result):
    os.makedirs(MODEL_DIR, exist_ok=True)

    model_package = {
        "model": best_result["model"],
        "model_name": best_result["model_name"],
        "mae": best_result["mae"],
        "rmse": best_result["rmse"],
        "r2": best_result["r2"],
        "cv_r2_mean": best_result["cv_r2_mean"],
        "cv_r2_std": best_result["cv_r2_std"],
        "features": [
            "Gender",
            "Age",
            "Current_Weight",
            "BMR",
            "Daily_Calories_Consumed",
            "Daily_Calorie_Balance",
            "Activity_Level",
            "Sleep_Quality",
            "Stress_Level"
        ],
        "target": "Daily_Weight_Change_Rate"
    }

    joblib.dump(model_package, MODEL_PATH)
    print("\nModel saved successfully")
    print("Path:", MODEL_PATH)


def main():
    print("Apex-Fit Weight Prediction Model")
    print("=" * 60)
    df = load_dataset()
    df = clean_dataset(df)
    best_result = train_models(df)
    save_model(best_result)


if __name__ == "__main__":
    main()