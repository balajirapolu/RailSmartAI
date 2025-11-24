import mongoose, { Document, Schema } from 'mongoose';

export interface IDelayData extends Document {
  distanceBetweenStations: number;
  weatherConditions: 'Clear' | 'Rainy' | 'Foggy';
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  trainType: 'Express' | 'Superfast' | 'Local';
  historicalDelay: number;
  routeCongestion: 'Low' | 'Medium' | 'High';
}

const delayDataSchema = new Schema<IDelayData>({
  distanceBetweenStations: {
    type: Number,
    required: true
  },
  weatherConditions: {
    type: String,
    enum: ['Clear', 'Rainy', 'Foggy'],
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  timeOfDay: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening', 'Night'],
    required: true
  },
  trainType: {
    type: String,
    enum: ['Express', 'Superfast', 'Local'],
    required: true
  },
  historicalDelay: {
    type: Number,
    required: true
  },
  routeCongestion: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  }
});

export default mongoose.model<IDelayData>('DelayData', delayDataSchema);

