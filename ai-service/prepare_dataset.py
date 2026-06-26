import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

RAW_DATASET_PATH = os.path.join(BASE_DIR, "datasets", "gym_members.csv")
OUTPUT_DATASET_PATH = os.path.join(BASE_DIR, "datasets", "apexfit_calorie_dataset.csv")


def map_intensity(value):
    if pd.isna(value):
        return "Medium"

    value = int(value)

    if value == 1:
        return "Low"

    if value == 2:
        return "Medium"

    if value == 3:
        return "High"

    return "Medium"


def main():
    if not os.path.exists(RAW_DATASET_PATH):
        raise FileNotFoundError("gym_members.csv not found inside datasets folder.")

    df = pd.read_csv(RAW_DATASET_PATH)

    clean_df = pd.DataFrame()

    clean_df["Gender"] = df["Gender"].astype(str).str.strip()
    clean_df["Age"] = df["Age"]
    clean_df["Height"] = df["Height (m)"] * 100
    clean_df["Weight"] = df["Weight (kg)"]
    clean_df["Exercise_Type"] = df["Workout_Type"].astype(str).str.strip()
    clean_df["Duration"] = df["Session_Duration (hours)"] * 60
    clean_df["Intensity"] = df["Experience_Level"].apply(map_intensity)
    clean_df["Distance"] = 0
    clean_df["Calories_Burned"] = df["Calories_Burned"]

    clean_df = clean_df.dropna()
    clean_df = clean_df.drop_duplicates()

    clean_df["Age"] = clean_df["Age"].astype(int)
    clean_df["Height"] = clean_df["Height"].astype(float).round(2)
    clean_df["Weight"] = clean_df["Weight"].astype(float).round(2)
    clean_df["Duration"] = clean_df["Duration"].astype(float).round(2)
    clean_df["Distance"] = clean_df["Distance"].astype(float)
    clean_df["Calories_Burned"] = clean_df["Calories_Burned"].astype(float).round(2)

    clean_df = clean_df[
        [
            "Gender",
            "Age",
            "Height",
            "Weight",
            "Exercise_Type",
            "Duration",
            "Intensity",
            "Distance",
            "Calories_Burned"
        ]
    ]

    clean_df.to_csv(OUTPUT_DATASET_PATH, index=False)

    print("Apex-Fit dataset created successfully!")
    print("Path:", OUTPUT_DATASET_PATH)
    print("Shape:", clean_df.shape)

    print("\nColumns:")
    print(clean_df.columns.tolist())

    print("\nFirst 10 rows:")
    print(clean_df.head(10))

    print("\nExercise types:")
    print(clean_df["Exercise_Type"].unique())

    print("\nIntensity values:")
    print(clean_df["Intensity"].unique())


if __name__ == "__main__":
    main()