import os
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "calorie_model.pkl")


def main():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Run train_calorie_model.py first.")

    model_package = joblib.load(MODEL_PATH)
    model = model_package["model"]

    sample = pd.DataFrame([
        {
            "Gender": "Male",
            "Age": 23,
            "Height": 178,
            "Weight": 74,
            "Exercise_Type": "Cardio",
            "Duration": 45,
            "Intensity": "Medium",
            "Distance": 0
        }
    ])

    prediction = model.predict(sample)[0]

    print("Model name:", model_package["model_name"])
    print("MAE:", round(model_package["mae"], 2))
    print("RMSE:", round(model_package["rmse"], 2))
    print("R2:", round(model_package["r2"], 4))
    print("Predicted calories burned:", round(float(prediction), 2), "kcal")


if __name__ == "__main__":
    main()