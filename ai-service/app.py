import os
import joblib
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "calorie_model.pkl")

app = Flask(__name__)
CORS(app)


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("calorie_model.pkl not found. Train the model first.")

    return joblib.load(MODEL_PATH)


model_package = load_model()
calorie_model = model_package["model"]


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Apex-Fit AI Service is running",
        "endpoints": [
            "/model-info",
            "/predict-calories"
        ]
    })


@app.route("/model-info", methods=["GET"])
def model_info():
    return jsonify({
        "success": True,
        "modelName": model_package["model_name"],
        "target": model_package["target"],
        "features": model_package["features"],
        "metrics": {
            "mae": round(model_package["mae"], 2),
            "rmse": round(model_package["rmse"], 2),
            "r2": round(model_package["r2"], 4)
        }
    })


@app.route("/predict-calories", methods=["POST"])
def predict_calories():
    try:
        data = request.get_json()

        if data is None:
            return jsonify({
                "success": False,
                "message": "Request body must be JSON."
            }), 400

        required_fields = [
            "gender",
            "age",
            "height",
            "weight",
            "exerciseType",
            "duration",
            "intensity"
        ]

        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                "success": False,
                "message": "Missing required fields.",
                "missingFields": missing_fields
            }), 400

        gender = str(data["gender"]).strip()
        age = float(data["age"])
        height = float(data["height"])
        weight = float(data["weight"])
        exercise_type = str(data["exerciseType"]).strip()
        duration = float(data["duration"])
        intensity = str(data["intensity"]).strip()
        distance = float(data.get("distance", 0))

        if age <= 0 or height <= 0 or weight <= 0 or duration <= 0:
            return jsonify({
                "success": False,
                "message": "Age, height, weight, and duration must be greater than 0."
            }), 400

        input_df = pd.DataFrame([
            {
                "Gender": gender,
                "Age": age,
                "Height": height,
                "Weight": weight,
                "Exercise_Type": exercise_type,
                "Duration": duration,
                "Intensity": intensity,
                "Distance": distance
            }
        ])

        prediction = calorie_model.predict(input_df)[0]
        prediction = round(float(prediction), 2)

        return jsonify({
            "success": True,
            "message": "Calorie prediction successful.",
            "prediction": {
                "caloriesBurned": prediction,
                "unit": "kcal",
                "modelSource": model_package["model_name"]
            },
            "input": {
                "gender": gender,
                "age": age,
                "height": height,
                "weight": weight,
                "exerciseType": exercise_type,
                "duration": duration,
                "intensity": intensity,
                "distance": distance
            }
        })

    except ValueError:
        return jsonify({
            "success": False,
            "message": "Invalid input. Numeric fields must be valid numbers."
        }), 400

    except Exception as error:
        return jsonify({
            "success": False,
            "message": "Prediction failed.",
            "error": str(error)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )