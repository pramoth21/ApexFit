import os
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "weight_model.pkl")


def main():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Run train_weight_model.py first.")

    model_package = joblib.load(MODEL_PATH)
    model = model_package["model"]

    # Example: a 23-year-old male, currently 165 lbs, in a calorie surplus,
    # moderately active, sleeping well, low stress
    current_weight = 165

    sample = pd.DataFrame([
        {
            "Gender": "Male",
            "Age": 23,
            "Current_Weight": current_weight,
            "BMR": 1750,
            "Daily_Calories_Consumed": 2400,
            "Daily_Calorie_Balance": 450,   # surplus/deficit vs maintenance
            "Activity_Level": "Moderately Active",
            "Sleep_Quality": "Good",
            "Stress_Level": 4
        }
    ])

    daily_rate = model.predict(sample)[0]

    predicted_7_day = current_weight + (daily_rate * 7)
    predicted_30_day = current_weight + (daily_rate * 30)

    print("Model name:", model_package["model_name"])
    print("MAE:", round(model_package["mae"], 4))
    print("RMSE:", round(model_package["rmse"], 4))
    print("Test-split R2:", round(model_package["r2"], 4))
    print("Cross-validated R2 mean:", round(model_package["cv_r2_mean"], 4))
    print()
    print("Current weight:", current_weight, "lbs")
    print("Predicted daily change rate:", round(float(daily_rate), 4), "lbs/day")
    print("Predicted weight in 7 days:", round(float(predicted_7_day), 2), "lbs")
    print("Predicted weight in 30 days:", round(float(predicted_30_day), 2), "lbs")


if __name__ == "__main__":
    main()