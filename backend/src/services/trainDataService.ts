import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { TrainStop, TrainDetail } from '../types/trainTypes';

interface TrainCsvRow {
  'Train No.': string;
  'train Name': string;
  islno: string;
  'station Code': string;
  'Station Name': string;
  'Arrival time': string;
  'Departure time': string;
  Distance: string;
  'Source Station Code': string;
  'source Station Name': string;
  'Destination station Code': string;
  'Destination Station Name': string;
  'train type': string;
}

let cachedTrainMap: Map<string, TrainDetail> | null = null;

function normalizeStationCode(code: string): string {
  return code.trim().toUpperCase();
}

async function loadCsvIntoCache(): Promise<void> {
  if (cachedTrainMap) {
    return;
  }

  const trainMap = new Map<string, TrainDetail>();
  const csvPath = path.join(__dirname, '../../isl_wise_train_detail_03082015_v1.csv');

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: TrainCsvRow) => {
        const trainNoRaw = row['Train No.'].replace(/'/g, '');
        const trainNo = `'${trainNoRaw}'`;
        const normalizedStop: TrainStop = {
          stationCode: normalizeStationCode(row['station Code']),
          stationName: row['Station Name'].trim(),
          arrivalTime: row['Arrival time'],
          departureTime: row['Departure time'],
          distance: parseInt(row['Distance'], 10) || 0
        };

        const existing = trainMap.get(trainNo);
        if (!existing) {
          trainMap.set(trainNo, {
            trainNo,
            trainName: row['train Name'].trim(),
            trainType: (row['train type'] || 'Express').trim(),
            sourceStation: {
              code: normalizeStationCode(row['Source Station Code']),
              name: row['source Station Name'].trim(),
              arrivalTime: row['Arrival time'],
              departureTime: row['Departure time']
            },
            destinationStation: {
              code: normalizeStationCode(row['Destination station Code']),
              name: row['Destination Station Name'].trim(),
              arrivalTime: row['Arrival time'],
              departureTime: row['Departure time']
            },
            distance: parseInt(row['Distance'], 10) || 0,
            totalStops: 0,
            route: []
          });
        }

        const trainDetail = trainMap.get(trainNo)!;
        trainDetail.route.push(normalizedStop);
      })
      .on('end', () => {
        for (const trainDetail of trainMap.values()) {
          trainDetail.route.sort((a, b) => a.distance - b.distance);
          trainDetail.distance = trainDetail.route.length
            ? trainDetail.route[trainDetail.route.length - 1].distance - trainDetail.route[0].distance
            : 0;
          trainDetail.totalStops = trainDetail.route.length;
        }
        cachedTrainMap = trainMap;
        resolve();
      })
      .on('error', (error: Error) => {
        reject(error);
      });
  });
}

export async function findTrainsFromCsv(source: string, destination: string): Promise<TrainDetail[]> {
  await loadCsvIntoCache();
  if (!cachedTrainMap) {
    return [];
  }

  const normalizedSource = normalizeStationCode(source);
  const normalizedDestination = normalizeStationCode(destination);
  const results: TrainDetail[] = [];

  cachedTrainMap.forEach((trainDetail) => {
    const sourceStopIndex = trainDetail.route.findIndex((stop) => stop.stationCode === normalizedSource);
    const destinationStopIndex = trainDetail.route.findIndex((stop) => stop.stationCode === normalizedDestination);

    if (sourceStopIndex !== -1 && destinationStopIndex !== -1 && sourceStopIndex < destinationStopIndex) {
      const sourceStop = trainDetail.route[sourceStopIndex];
      const destStop = trainDetail.route[destinationStopIndex];

      results.push({
        ...trainDetail,
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
        distance: destStop.distance - sourceStop.distance
      });
    }
  });

  return results;
}

