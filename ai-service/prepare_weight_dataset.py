import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

RAW_DATASET_PATH = os.path.join(BASE_DIR, "datasets", "weight_change_dataset.csv")
OUTPUT_DATASET_PATH = os.path.join(BASE_DIR, "datasets", "apexfit_weight_dataset.csv")


def main():
    if not os.path.exists(RAW_DATASET_PATH):
        raise FileNotFoundError("weight_change_dataset.csv not found inside datasets folder.")

    df = pd.read_csv(RAW_DATASET_PATH)

    clean_df = pd.DataFrame()

    clean_df["Gender"] = df["Gender"].astype(str).str.strip()
    clean_df["Age"] = df["Age"]
    clean_df["Current_Weight"] = df["Current Weight (lbs)"]
    clean_df["BMR"] = df["BMR (Calories)"]
    clean_df["Daily_Calories_Consumed"] = df["Daily Calories Consumed"]
    clean_df["Daily_Calorie_Balance"] = df["Daily Caloric Surplus/Deficit"]
    clean_df["Activity_Level"] = df["Physical Activity Level"].astype(str).str.strip()
    clean_df["Sleep_Quality"] = df["Sleep Quality"].astype(str).str.strip()
    clean_df["Stress_Level"] = df["Stress Level"]

    # Duration is in weeks -> convert to days so we can get a daily rate
    duration_days = df["Duration (weeks)"] * 7

    # This is the important engineered column:
    # how much weight changes PER DAY on average for that participant
    clean_df["Daily_Weight_Change_Rate"] = df["Weight Change (lbs)"] / duration_days

    # Remove any bad rows (e.g. duration was 0, which would break the division)
    clean_df = clean_df.replace([float("inf"), float("-inf")], pd.NA)
    clean_df = clean_df.dropna()
    clean_df = clean_df.drop_duplicates()

    clean_df["Age"] = clean_df["Age"].astype(int)
    clean_df["Current_Weight"] = clean_df["Current_Weight"].astype(float).round(2)
    clean_df["BMR"] = clean_df["BMR"].astype(float).round(2)
    clean_df["Daily_Calories_Consumed"] = clean_df["Daily_Calories_Consumed"].astype(float).round(2)
    clean_df["Daily_Calorie_Balance"] = clean_df["Daily_Calorie_Balance"].astype(float).round(2)
    clean_df["Stress_Level"] = clean_df["Stress_Level"].astype(float)
    clean_df["Daily_Weight_Change_Rate"] = clean_df["Daily_Weight_Change_Rate"].astype(float).round(4)

    clean_df = clean_df[
        [
            "Gender",
            "Age",
            "Current_Weight",
            "BMR",
            "Daily_Calories_Consumed",
            "Daily_Calorie_Balance",
            "Activity_Level",
            "Sleep_Quality",
            "Stress_Level",
            "Daily_Weight_Change_Rate"
        ]
    ]

    clean_df.to_csv(OUTPUT_DATASET_PATH, index=False)

    print("Apex-Fit weight dataset created successfully!")
    print("Path:", OUTPUT_DATASET_PATH)
    print("Shape:", clean_df.shape)
    print("\nColumns:")
    print(clean_df.columns.tolist())
    print("\nFirst 10 rows:")
    print(clean_df.head(10))
    print("\nActivity Level values:")
    print(clean_df["Activity_Level"].unique())
    print("\nSleep Quality values:")
    print(clean_df["Sleep_Quality"].unique())


if __name__ == "__main__":
    main()