import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# CHANGE THIS to match the exact filename you downloaded
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "weight_change_dataset.csv")

if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(f"{DATASET_PATH} not found inside the datasets folder.")

df = pd.read_csv(DATASET_PATH)

print("Dataset loaded successfully")
print("Shape:", df.shape)
print("\nColumns:")
print(df.columns.tolist())
print("\nFirst 5 rows:")
print(df.head())
print("\nMissing values:")
print(df.isnull().sum())