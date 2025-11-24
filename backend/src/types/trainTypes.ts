export interface TrainStop {
  stationCode: string;
  stationName: string;
  arrivalTime: string;
  departureTime: string;
  distance: number;
}

export interface TrainDetail {
  trainNo: string;
  trainName: string;
  trainType: string;
  sourceStation: {
    code: string;
    name: string;
    arrivalTime: string;
    departureTime: string;
  };
  destinationStation: {
    code: string;
    name: string;
    arrivalTime: string;
    departureTime: string;
  };
  distance: number;
  totalStops: number;
  route: TrainStop[];
}

