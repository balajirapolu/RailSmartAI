import express, { Request, Response } from 'express';
import Train from '../models/Train';
import { findTrainsFromCsv } from '../services/trainDataService';
import { TrainDetail } from '../types/trainTypes';

const router = express.Router();

interface TrainSearchQuery {
  source?: string;
  destination?: string;
  date?: string;
}

// Search trains by source, destination
router.get('/search', async (req: Request<{}, {}, {}, TrainSearchQuery>, res: Response) => {
  try {
    const { source, destination, date } = req.query;

    if (!source || !destination) {
      return res.status(400).json({ 
        error: 'Source and destination stations are required' 
      });
    }

    const normalizedSource = source.trim().toUpperCase();
    const normalizedDestination = destination.trim().toUpperCase();

    // Find trains that pass through both source and destination
    const sourceTrains = await Train.find({ 
      stationCode: normalizedSource 
    }).distinct('trainNo');

    const destinationTrains = await Train.find({ 
      stationCode: normalizedDestination 
    }).distinct('trainNo');

    // Find trains that go through both stations
    const commonTrains = sourceTrains.filter((trainNo: string) => 
      destinationTrains.includes(trainNo)
    );

    let trainDetails: (TrainDetail | null)[] = [];

    if (commonTrains.length === 0) {
      const csvFallback = await findTrainsFromCsv(normalizedSource, normalizedDestination);
      if (csvFallback.length === 0) {
        return res.json({ 
          trains: [],
          message: 'No trains found for the given route' 
        });
      }

      return res.json({
        trains: csvFallback,
        count: csvFallback.length,
        searchParams: {
          source,
          destination,
          date: date || 'Not specified'
        },
        source: 'csv'
      });
    }

    // Get detailed information for each train
    trainDetails = await Promise.all(
      commonTrains.map(async (trainNo: string) => {
        const trainStops = await Train.find({ trainNo })
          .sort({ islno: 1 });

        const sourceStop = trainStops.find(
          stop => stop.stationCode === normalizedSource
        );
        const destStop = trainStops.find(
          stop => stop.stationCode === normalizedDestination
        );

        // Only include trains where source comes before destination
        if (!sourceStop || !destStop || sourceStop.islno >= destStop.islno) {
          return null;
        }

        return {
          trainNo: trainNo.replace(/'/g, ''),
          trainName: sourceStop.trainName,
          trainType: sourceStop.trainType,
          sourceStation: {
            code: sourceStop.stationCode,
            name: sourceStop.stationName,
            arrivalTime: sourceStop.arrivalTime,
            departureTime: sourceStop.departureTime
          },
          destinationStation: {
            code: destStop.stationCode,
            name: destStop.stationName,
            arrivalTime: destStop.arrivalTime,
            departureTime: destStop.departureTime
          },
          distance: destStop.distance - sourceStop.distance,
          totalStops: trainStops.length,
          route: trainStops.map((stop) => ({
            stationCode: stop.stationCode,
            stationName: stop.stationName,
            arrivalTime: stop.arrivalTime,
            departureTime: stop.departureTime,
            distance: stop.distance
          }))
        };
      })
    );

    const validTrains = trainDetails.filter((train): train is TrainDetail => train !== null);

    res.json({
      trains: validTrains,
      count: validTrains.length,
      searchParams: {
        source,
        destination,
        date: date || 'Not specified'
      }
    });
  } catch (error) {
    console.error('Error searching trains:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all stations
router.get('/stations', async (_req: Request, res: Response) => {
  try {
    const stations = await Train.distinct('stationCode', {}, { 
      sort: { stationCode: 1 } 
    });
    const stationDetails = await Promise.all(
      stations.map(async (code: string) => {
        const station = await Train.findOne({ stationCode: code });
        if (!station) return null;
        return {
          code: station.stationCode,
          name: station.stationName
        };
      })
    );
    const validStations = stationDetails.filter((s): s is { code: string; name: string } => s !== null);
    res.json({ stations: validStations });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get train details by train number
router.get('/:trainNo', async (req: Request, res: Response) => {
  try {
    const trainNo = `'${req.params.trainNo}'`;
    const trainStops = await Train.find({ trainNo }).sort({ islno: 1 });
    
    if (trainStops.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }

    res.json({
      trainNo: req.params.trainNo,
      trainName: trainStops[0].trainName,
      trainType: trainStops[0].trainType,
      source: {
        code: trainStops[0].sourceStationCode,
        name: trainStops[0].sourceStationName
      },
      destination: {
        code: trainStops[0].destinationStationCode,
        name: trainStops[0].destinationStationName
      },
      stops: trainStops.map((stop) => ({
        stationCode: stop.stationCode,
        stationName: stop.stationName,
        arrivalTime: stop.arrivalTime,
        departureTime: stop.departureTime,
        distance: stop.distance
      }))
    });
  } catch (error) {
    console.error('Error fetching train details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

