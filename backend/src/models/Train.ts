import mongoose, { Document, Schema } from 'mongoose';

export interface ITrain extends Document {
  trainNo: string;
  trainName: string;
  islno: number;
  stationCode: string;
  stationName: string;
  arrivalTime: string;
  departureTime: string;
  distance: number;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  trainType: 'Express' | 'Superfast' | 'Local';
}

const trainSchema = new Schema<ITrain>({
  trainNo: {
    type: String,
    required: true,
    index: true
  },
  trainName: {
    type: String,
    required: true
  },
  islno: {
    type: Number,
    required: true
  },
  stationCode: {
    type: String,
    required: true,
    index: true
  },
  stationName: {
    type: String,
    required: true
  },
  arrivalTime: {
    type: String,
    required: true
  },
  departureTime: {
    type: String,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  sourceStationCode: {
    type: String,
    required: true,
    index: true
  },
  sourceStationName: {
    type: String,
    required: true
  },
  destinationStationCode: {
    type: String,
    required: true,
    index: true
  },
  destinationStationName: {
    type: String,
    required: true
  },
  trainType: {
    type: String,
    enum: ['Express', 'Superfast', 'Local'],
    required: true
  }
});

// Compound indexes for efficient queries
trainSchema.index({ sourceStationCode: 1, destinationStationCode: 1 });
trainSchema.index({ trainNo: 1, islno: 1 });

export default mongoose.model<ITrain>('Train', trainSchema);

