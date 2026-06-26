import os
import joblib
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "apexfit_calorie_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "calorie_model.pkl")


def load_dataset():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError("Run prepare_dataset.py first. apexfit_calorie_dataset.csv not found.")

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
    df["Exercise_Type"] = df["Exercise_Type"].astype(str).str.strip()
    df["Intensity"] = df["Intensity"].astype(str).str.strip()

    df = df[df["Age"] > 0]
    df = df[df["Height"] > 0]
    df = df[df["Weight"] > 0]
    df = df[df["Duration"] > 0]
    df = df[df["Calories_Burned"] > 0]

    return df


def evaluate_model(model_name, model, X_test, y_test):
    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    mse = mean_squared_error(y_test, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, predictions)

    print("\n" + model_name)
    print("-" * 40)
    print("MAE :", round(mae, 2))
    print("RMSE:", round(rmse, 2))
    print("R2  :", round(r2, 4))

    return {
        "model_name": model_name,
        "model": model,
        "mae": mae,
        "rmse": rmse,
        "r2": r2
    }


def train_models(df):
    target = "Calories_Burned"

    X = df.drop(target, axis=1)
    y = df[target]

    categorical_features = [
        "Gender",
        "Exercise_Type",
        "Intensity"
    ]

    numeric_features = [
        "Age",
        "Height",
        "Weight",
        "Duration",
        "Distance"
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

    linear_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", LinearRegression())
        ]
    )

    rf_base_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", RandomForestRegressor(random_state=42))
        ]
    )

    print("\nTraining Linear Regression...")
    linear_model.fit(X_train, y_train)

    print("\nTraining Random Forest with tuning...")

    param_grid = {
        "model__n_estimators": [100, 200, 300],
        "model__max_depth": [8, 12, 16, None],
        "model__min_samples_split": [2, 5],
        "model__min_samples_leaf": [1, 2]
    }

    grid_search = GridSearchCV(
        rf_base_model,
        param_grid,
        cv=5,
        scoring="r2",
        n_jobs=-1
    )

    grid_search.fit(X_train, y_train)

    best_rf_model = grid_search.best_estimator_

    print("Best Random Forest Params:")
    print(grid_search.best_params_)

    linear_result = evaluate_model("Linear Regression", linear_model, X_test, y_test)
    rf_result = evaluate_model("Random Forest Regression", best_rf_model, X_test, y_test)

    best_result = rf_result if rf_result["r2"] >= linear_result["r2"] else linear_result

    print("\nBest selected model:", best_result["model_name"])

    if best_result["r2"] >= 0.70:
        print("Result: Good. R2 is above 0.70")
    else:
        print("Result: R2 is below 0.70. Model works, but dataset/features may need improvement.")

    return best_result


def save_model(best_result):
    os.makedirs(MODEL_DIR, exist_ok=True)

    model_package = {
        "model": best_result["model"],
        "model_name": best_result["model_name"],
        "mae": best_result["mae"],
        "rmse": best_result["rmse"],
        "r2": best_result["r2"],
        "features": [
            "Gender",
            "Age",
            "Height",
            "Weight",
            "Exercise_Type",
            "Duration",
            "Intensity",
            "Distance"
        ],
        "target": "Calories_Burned"
    }

    joblib.dump(model_package, MODEL_PATH)

    print("\nModel saved successfully")
    print("Path:", MODEL_PATH)


def main():
    print("Apex-Fit Calorie Prediction Model")
    print("=" * 60)

    df = load_dataset()
    df = clean_dataset(df)

    best_result = train_models(df)
    save_model(best_result)


if __name__ == "__main__":
    main()