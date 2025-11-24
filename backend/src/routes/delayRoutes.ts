import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

interface DelayPredictionRequest {
  distance: number;
  weatherConditions: 'Clear' | 'Rainy' | 'Foggy';
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  trainType: 'Express' | 'Superfast' | 'Local';
  routeCongestion: 'Low' | 'Medium' | 'High';
}

interface Suggestion {
  type: 'warning' | 'info' | 'suggestion' | 'success' | 'alternative';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface DelayPredictionResponse {
  predictedDelay: number;
  delayCategory: string;
  suggestions: Suggestion[];
  confidence: number;
  note?: string;
}

// Helper function to categorize delay
function categorizeDelay(delay: number): string {
  if (delay <= 5) return 'Minimal';
  if (delay <= 15) return 'Minor';
  if (delay <= 30) return 'Moderate';
  if (delay <= 60) return 'Significant';
  return 'Severe';
}

// Helper function to generate AI suggestions
function generateSuggestions(
  delay: number,
  factors: {
    weatherConditions: string;
    trainType: string;
    routeCongestion: string;
  }
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (delay > 30) {
    suggestions.push({
      type: 'warning',
      message: `Expected delay of ${Math.round(delay)} minutes. Consider booking alternative trains or adjusting your schedule.`,
      priority: 'high'
    });
  }

  if (factors.weatherConditions === 'Rainy' || factors.weatherConditions === 'Foggy') {
    suggestions.push({
      type: 'info',
      message: `Weather conditions (${factors.weatherConditions}) may cause additional delays. Plan for extra travel time.`,
      priority: 'medium'
    });
  }

  if (factors.routeCongestion === 'High') {
    suggestions.push({
      type: 'info',
      message: 'High route congestion detected. Consider traveling during off-peak hours for better punctuality.',
      priority: 'medium'
    });
  }

  if (factors.trainType === 'Superfast' && delay > 15) {
    suggestions.push({
      type: 'suggestion',
      message: 'Superfast trains typically have better punctuality. Current delay is unusual - check for service updates.',
      priority: 'medium'
    });
  }

  if (delay <= 10) {
    suggestions.push({
      type: 'success',
      message: 'Train is expected to run on time with minimal delays. Safe to proceed with your travel plans.',
      priority: 'low'
    });
  }

  // Add alternative suggestions
  if (delay > 20) {
    suggestions.push({
      type: 'alternative',
      message: 'Consider booking trains with earlier departure times to account for potential delays.',
      priority: 'high'
    });
  }

  return suggestions;
}

// Fallback delay calculation
function calculateFallbackDelay(params: DelayPredictionRequest): number {
  let delay = 0;
  
  // Base delay by train type
  const trainTypeDelays: Record<string, number> = { Express: 10, Superfast: 5, Local: 15 };
  delay += trainTypeDelays[params.trainType] || 10;

  // Weather impact
  const weatherDelays: Record<string, number> = { Clear: 0, Rainy: 8, Foggy: 12 };
  delay += weatherDelays[params.weatherConditions] || 0;

  // Congestion impact
  const congestionDelays: Record<string, number> = { Low: 0, Medium: 5, High: 10 };
  delay += congestionDelays[params.routeCongestion] || 0;

  // Distance impact (more distance = more potential delay)
  delay += Math.min(params.distance / 100, 15);

  return Math.round(delay);
}

// Predict delay for a train
router.post('/predict', async (req: Request<{}, DelayPredictionResponse, DelayPredictionRequest>, res: Response<DelayPredictionResponse>) => {
  try {
    const {
      distance,
      weatherConditions,
      dayOfWeek,
      timeOfDay,
      trainType,
      routeCongestion
    } = req.body;

    // Validate required fields
    if (!distance || !weatherConditions || !dayOfWeek || 
        !timeOfDay || !trainType || !routeCongestion) {
      return res.status(400).json({ 
        error: 'All prediction parameters are required',
        predictedDelay: 0,
        delayCategory: 'Unknown',
        suggestions: [],
        confidence: 0
      } as any);
    }

    // Call ML service for prediction
    try {
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
        distance,
        weather_conditions: weatherConditions,
        day_of_week: dayOfWeek,
        time_of_day: timeOfDay,
        train_type: trainType,
        route_congestion: routeCongestion
      });

      const predictedDelay = mlResponse.data.predicted_delay;
      const suggestions = generateSuggestions(predictedDelay, {
        weatherConditions,
        trainType,
        routeCongestion
      });

      res.json({
        predictedDelay: Math.round(predictedDelay),
        delayCategory: categorizeDelay(predictedDelay),
        suggestions,
        confidence: mlResponse.data.confidence || 0.85
      });
    } catch (mlError: any) {
      console.error('ML Service Error:', mlError.message);
      // Fallback prediction if ML service is unavailable
      const fallbackDelay = calculateFallbackDelay(req.body);
      res.json({
        predictedDelay: fallbackDelay,
        delayCategory: categorizeDelay(fallbackDelay),
        suggestions: generateSuggestions(fallbackDelay, req.body),
        confidence: 0.6,
        note: 'Using fallback prediction (ML service unavailable)'
      });
    }
  } catch (error) {
    console.error('Error predicting delay:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      predictedDelay: 0,
      delayCategory: 'Unknown',
      suggestions: [],
      confidence: 0
    } as any);
  }
});

export default router;

