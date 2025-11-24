# ML Service for Delay Prediction

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Train the model:
```bash
python train_model.py
```

3. Run the Flask service:
```bash
python app.py
```

The service will run on http://localhost:5001

## API Endpoints

- `GET /health` - Health check
- `POST /predict` - Predict delay
- `POST /retrain` - Retrain the model

## Prediction Request Format

```json
{
  "distance": 150,
  "weather_conditions": "Rainy",
  "day_of_week": "Monday",
  "time_of_day": "Morning",
  "train_type": "Express",
  "route_congestion": "Medium",
  "historical_delay": 10
}
```

