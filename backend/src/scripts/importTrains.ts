import mongoose from 'mongoose';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import Train from '../models/Train';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/railsmartai';

interface TrainRow {
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

async function importTrains(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Train.deleteMany({});
    console.log('Cleared existing train data');

    const trains: any[] = [];
    let count = 0;

    // Read CSV file (adjust path based on where script is run from)
    // CSV lives at repo root (one level above backend/)
    const csvPath = path.join(__dirname, '../../../isl_wise_train_detail_03082015_v1.csv');
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: TrainRow) => {
        // Clean train number (remove quotes)
        const trainNo = row['Train No.'].replace(/'/g, '');
        
        trains.push({
          trainNo: `'${trainNo}'`, // Keep original format for consistency
          trainName: row['train Name'].trim(),
          islno: parseInt(row['islno']),
          stationCode: row['station Code'].trim().toUpperCase(),
          stationName: row['Station Name'].trim(),
          arrivalTime: row['Arrival time'],
          departureTime: row['Departure time'],
          distance: parseInt(row['Distance']) || 0,
          sourceStationCode: row['Source Station Code'].trim().toUpperCase(),
          sourceStationName: row['source Station Name'].trim(),
          destinationStationCode: row['Destination station Code'].trim().toUpperCase(),
          destinationStationName: row['Destination Station Name'].trim(),
          trainType: row['train type'] || 'Express'
        });

        count++;
        if (count % 1000 === 0) {
          console.log(`Processed ${count} records...`);
        }
      })
      .on('end', async () => {
        console.log(`Total records to import: ${trains.length}`);
        
        // Insert in batches
        const batchSize = 1000;
        for (let i = 0; i < trains.length; i += batchSize) {
          const batch = trains.slice(i, i + batchSize);
          await Train.insertMany(batch);
          console.log(`Imported ${Math.min(i + batchSize, trains.length)}/${trains.length} records`);
        }

        console.log('Train data import completed!');
        console.log(`Total trains imported: ${await Train.countDocuments()}`);
        await mongoose.connection.close();
        process.exit(0);
      })
      .on('error', (error: Error) => {
        console.error('Error reading CSV:', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('Import error:', error);
    process.exit(1);
  }
}

importTrains();

