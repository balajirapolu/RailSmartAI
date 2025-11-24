from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Load model and encoders
model = None
encoders = {}

def load_model():
    """Load the trained model and encoders"""
    global model, encoders
    
    try:
        model = joblib.load('models/delay_prediction_model.pkl')
        encoders['weather'] = joblib.load('models/weather_encoder.pkl')
        encoders['day'] = joblib.load('models/day_encoder.pkl')
        encoders['time'] = joblib.load('models/time_encoder.pkl')
        encoders['train_type'] = joblib.load('models/train_type_encoder.pkl')
        encoders['congestion'] = joblib.load('models/congestion_encoder.pkl')
        print("Model and encoders loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

# Load model on startup
if not load_model():
    print("Warning: Model not loaded. Please train the model first.")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'model_loaded': model is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict train delay based on input features"""
    
    if model is None:
        return jsonify({
            'error': 'Model not loaded. Please train the model first.'
        }), 500
    
    try:
        data = request.json
        
        # Extract features
        distance = float(data.get('distance', 0))
        weather = data.get('weather_conditions', 'Clear')
        day = data.get('day_of_week', 'Monday')
        time = data.get('time_of_day', 'Morning')
        train_type = data.get('train_type', 'Express')
        congestion = data.get('route_congestion', 'Low')
        historical_delay = float(data.get('historical_delay', 10))  # Default historical delay
        
        # Encode categorical features
        try:
            weather_encoded = encoders['weather'].transform([weather])[0]
            day_encoded = encoders['day'].transform([day])[0]
            time_encoded = encoders['time'].transform([time])[0]
            train_type_encoded = encoders['train_type'].transform([train_type])[0]
            congestion_encoded = encoders['congestion'].transform([congestion])[0]
        except ValueError as e:
            return jsonify({
                'error': f'Invalid categorical value: {str(e)}'
            }), 400
        
        # Prepare feature array
        features = np.array([[
            distance,
            weather_encoded,
            day_encoded,
            time_encoded,
            train_type_encoded,
            congestion_encoded,
            historical_delay
        ]])
        
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Ensure non-negative prediction
        predicted_delay = max(0, prediction)
        
        return jsonify({
            'predicted_delay': float(predicted_delay),
            'confidence': 0.85,  # Can be calculated based on model certainty
            'input_features': {
                'distance': distance,
                'weather_conditions': weather,
                'day_of_week': day,
                'time_of_day': time,
                'train_type': train_type,
                'route_congestion': congestion,
                'historical_delay': historical_delay
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Prediction error: {str(e)}'
        }), 500

@app.route('/retrain', methods=['POST'])
def retrain():
    """Retrain the model (admin endpoint)"""
    try:
        from train_model import train_delay_prediction_model
        train_delay_prediction_model()
        load_model()
        return jsonify({'message': 'Model retrained successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)

