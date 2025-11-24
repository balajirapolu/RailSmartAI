import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import os

def train_delay_prediction_model():
    """Train ML model for delay prediction"""
    
    # Load the delay dataset
    df = pd.read_csv('../train delay data.csv')
    
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    print(f"\nFirst few rows:")
    print(df.head())
    
    # Prepare features
    # Encode categorical variables
    le_weather = LabelEncoder()
    le_day = LabelEncoder()
    le_time = LabelEncoder()
    le_train_type = LabelEncoder()
    le_congestion = LabelEncoder()
    
    df['weather_encoded'] = le_weather.fit_transform(df['Weather Conditions'])
    df['day_encoded'] = le_day.fit_transform(df['Day of the Week'])
    df['time_encoded'] = le_time.fit_transform(df['Time of Day'])
    df['train_type_encoded'] = le_train_type.fit_transform(df['Train Type'])
    df['congestion_encoded'] = le_congestion.fit_transform(df['Route Congestion'])
    
    # Features for training
    features = [
        'Distance Between Stations (km)',
        'weather_encoded',
        'day_encoded',
        'time_encoded',
        'train_type_encoded',
        'congestion_encoded',
        'Historical Delay (min)'
    ]
    
    X = df[features]
    y = df['Historical Delay (min)']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    print("\nTraining model...")
    model.fit(X_train, y_train)
    
    # Evaluate model
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    
    print(f"\nModel Performance:")
    print(f"Training R² Score: {train_score:.4f}")
    print(f"Testing R² Score: {test_score:.4f}")
    
    # Save model and encoders
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/delay_prediction_model.pkl')
    joblib.dump(le_weather, 'models/weather_encoder.pkl')
    joblib.dump(le_day, 'models/day_encoder.pkl')
    joblib.dump(le_time, 'models/time_encoder.pkl')
    joblib.dump(le_train_type, 'models/train_type_encoder.pkl')
    joblib.dump(le_congestion, 'models/congestion_encoder.pkl')
    
    print("\nModel and encoders saved successfully!")
    
    return model, {
        'weather': le_weather,
        'day': le_day,
        'time': le_time,
        'train_type': le_train_type,
        'congestion': le_congestion
    }

if __name__ == '__main__':
    train_delay_prediction_model()

