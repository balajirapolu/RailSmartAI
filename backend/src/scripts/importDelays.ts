import mongoose from 'mongoose';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import DelayData from '../models/DelayData';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/railsmartai';

interface DelayRow {
  'Distance Between Stations (km)': string;
  'Weather Conditions': string;
  'Day of the Week': string;
  'Time of Day': string;
  'Train Type': string;
  'Historical Delay (min)': string;
  'Route Congestion': string;
}

async function importDelays(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await DelayData.deleteMany({});
    console.log('Cleared existing delay data');

    const delayRecords: any[] = [];
    let count = 0;

    // Read CSV file (adjust path based on where script is run from)
    // CSV lives at repo root (one level above backend/)
    const csvPath = path.join(__dirname, '../../../train delay data.csv');
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: DelayRow) => {
        delayRecords.push({
          distanceBetweenStations: parseFloat(row['Distance Between Stations (km)']) || 0,
          weatherConditions: row['Weather Conditions'].trim(),
          dayOfWeek: row['Day of the Week'].trim(),
          timeOfDay: row['Time of Day'].trim(),
          trainType: row['Train Type'].trim(),
          historicalDelay: parseFloat(row['Historical Delay (min)']) || 0,
          routeCongestion: row['Route Congestion'].trim()
        });

        count++;
        if (count % 100 === 0) {
          console.log(`Processed ${count} records...`);
        }
      })
      .on('end', async () => {
        console.log(`Total records to import: ${delayRecords.length}`);
        
        // Insert in batches
        const batchSize = 500;
        for (let i = 0; i < delayRecords.length; i += batchSize) {
          const batch = delayRecords.slice(i, i + batchSize);
          await DelayData.insertMany(batch);
          console.log(`Imported ${Math.min(i + batchSize, delayRecords.length)}/${delayRecords.length} records`);
        }

        console.log('Delay data import completed!');
        console.log(`Total delay records imported: ${await DelayData.countDocuments()}`);
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

importDelays();

