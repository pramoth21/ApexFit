import os
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CALORIE_MODEL_PATH = os.path.join(BASE_DIR, "models", "calorie_model.pkl")
WEIGHT_MODEL_PATH = os.path.join(BASE_DIR, "models", "weight_model.pkl")

app = Flask(__name__)
CORS(app)


def load_model(path, name):
    if not os.path.exists(path):
        raise FileNotFoundError(f"{name} not found. Train the model first.")
    return joblib.load(path)


calorie_package = load_model(CALORIE_MODEL_PATH, "calorie_model.pkl")
calorie_model = calorie_package["model"]

weight_package = load_model(WEIGHT_MODEL_PATH, "weight_model.pkl")
weight_model = weight_package["model"]


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Apex-Fit AI Service is running",
        "endpoints": [
            "/model-info",
            "/predict-calories",
            "/predict-weight"
        ]
    })


@app.route("/model-info", methods=["GET"])
def model_info():
    return jsonify({
        "success": True,
        "calorieModel": {
            "modelName": calorie_package["model_name"],
            "target": calorie_package["target"],
            "features": calorie_package["features"],
            "metrics": {
                "mae": round(calorie_package["mae"], 2),
                "rmse": round(calorie_package["rmse"], 2),
                "r2": round(calorie_package["r2"], 4)
            }
        },
        "weightModel": {
            "modelName": weight_package["model_name"],
            "target": weight_package["target"],
            "features": weight_package["features"],
            "metrics": {
                "mae": round(weight_package["mae"], 4),
                "rmse": round(weight_package["rmse"], 4),
                "r2": round(weight_package["r2"], 4),
                "cvR2Mean": round(weight_package["cv_r2_mean"], 4)
            }
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
            "gender", "age", "height", "weight",
            "exerciseType", "duration", "intensity"
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

        input_df = pd.DataFrame([{
            "Gender": gender,
            "Age": age,
            "Height": height,
            "Weight": weight,
            "Exercise_Type": exercise_type,
            "Duration": duration,
            "Intensity": intensity,
            "Distance": distance
        }])

        prediction = calorie_model.predict(input_df)[0]
        prediction = round(float(prediction), 2)

        return jsonify({
            "success": True,
            "message": "Calorie prediction successful.",
            "prediction": {
                "caloriesBurned": prediction,
                "unit": "kcal",
                "modelSource": calorie_package["model_name"]
            },
            "input": {
                "gender": gender, "age": age, "height": height, "weight": weight,
                "exerciseType": exercise_type, "duration": duration,
                "intensity": intensity, "distance": distance
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


@app.route("/predict-weight", methods=["POST"])
def predict_weight():
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
            "currentWeight",
            "bmr",
            "dailyCaloriesConsumed",
            "dailyCalorieBalance",
            "activityLevel",
            "sleepQuality",
            "stressLevel"
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
        current_weight = float(data["currentWeight"])
        bmr = float(data["bmr"])
        daily_calories_consumed = float(data["dailyCaloriesConsumed"])
        daily_calorie_balance = float(data["dailyCalorieBalance"])
        activity_level = str(data["activityLevel"]).strip()
        sleep_quality = str(data["sleepQuality"]).strip()
        stress_level = float(data["stressLevel"])

        if age <= 0 or current_weight <= 0 or bmr <= 0:
            return jsonify({
                "success": False,
                "message": "Age, currentWeight, and bmr must be greater than 0."
            }), 400

        input_df = pd.DataFrame([{
            "Gender": gender,
            "Age": age,
            "Current_Weight": current_weight,
            "BMR": bmr,
            "Daily_Calories_Consumed": daily_calories_consumed,
            "Daily_Calorie_Balance": daily_calorie_balance,
            "Activity_Level": activity_level,
            "Sleep_Quality": sleep_quality,
            "Stress_Level": stress_level
        }])

        daily_rate = weight_model.predict(input_df)[0]
        daily_rate = float(daily_rate)

        predicted_7_day = round(current_weight + (daily_rate * 7), 2)
        predicted_30_day = round(current_weight + (daily_rate * 30), 2)

        return jsonify({
            "success": True,
            "message": "Weight prediction successful.",
            "prediction": {
                "currentWeight": current_weight,
                "dailyChangeRate": round(daily_rate, 4),
                "predictedWeight7Days": predicted_7_day,
                "predictedWeight30Days": predicted_30_day,
                "unit": "lbs",
                "modelSource": weight_package["model_name"]
            },
            "input": data
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