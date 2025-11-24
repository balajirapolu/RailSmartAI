import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Train as TrainIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Station {
  code: string;
  name: string;
}

interface TrainStop {
  stationCode: string;
  stationName: string;
  arrivalTime: string;
  departureTime: string;
  distance: number;
}

interface Train {
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

interface Suggestion {
  type: 'warning' | 'info' | 'suggestion' | 'success' | 'alternative';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface DelayPrediction {
  predictedDelay: number;
  delayCategory: string;
  suggestions: Suggestion[];
  confidence: number;
  note?: string;
}

const COLORS = {
  navy: '#001f3f',
  white: '#ffffff',
  accent: '#0a74da'
};

function App() {
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [trains, setTrains] = useState<Train[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [delayPredictions, setDelayPredictions] = useState<Record<string, DelayPrediction>>({});
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);

  useEffect(() => {
    // Load stations list
    loadStations();
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  const loadStations = async (): Promise<void> => {
    try {
      const response = await axios.get<{ stations: Station[] }>(`${API_BASE_URL}/trains/stations`);
      setStations(response.data.stations);
    } catch (err) {
      console.error('Error loading stations:', err);
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!source || !destination) {
      setError('Please enter both source and destination stations');
      return;
    }

    setLoading(true);
    setError(null);
    setTrains([]);
    setDelayPredictions({});
    setSearchAttempted(true);

    try {
      const response = await axios.get<{ trains: Train[] }>(`${API_BASE_URL}/trains/search`, {
        params: { source, destination, date }
      });

      setTrains(response.data.trains || []);

      // Predict delays for each train
      if (response.data.trains && response.data.trains.length > 0) {
        await predictDelaysForTrains(response.data.trains);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error searching trains. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const predictDelaysForTrains = async (trainList: Train[]): Promise<void> => {
    const predictions: Record<string, DelayPrediction> = {};
    
    for (const train of trainList) {
      try {
        // Get current day and time
        const now = new Date();
        const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = now.getHours();
        let timeOfDay = 'Morning';
        if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
        else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';
        else if (hour >= 21 || hour < 6) timeOfDay = 'Night';

        // Predict delay
        const delayResponse = await axios.post<DelayPrediction>(`${API_BASE_URL}/delays/predict`, {
          distance: train.distance,
          weatherConditions: 'Clear', // Can be enhanced with weather API
          dayOfWeek: dayOfWeek as any,
          timeOfDay: timeOfDay as any,
          trainType: train.trainType as any,
          routeCongestion: 'Medium' // Can be enhanced with real-time data
        });

        predictions[train.trainNo] = delayResponse.data;
      } catch (err) {
        console.error(`Error predicting delay for train ${train.trainNo}:`, err);
      }
    }

    setDelayPredictions(predictions);
  };

  const getDelayColor = (delay: number): "success" | "info" | "warning" | "error" => {
    if (delay <= 5) return 'success';
    if (delay <= 15) return 'info';
    if (delay <= 30) return 'warning';
    return 'error';
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          background: COLORS.white,
          border: `2px solid ${COLORS.navy}`
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <TrainIcon sx={{ fontSize: 60, color: COLORS.navy, mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            RailSmartAI
          </Typography>
          <Typography variant="h6" sx={{ color: COLORS.navy }}>
            Intelligent Train Search with AI-Powered Delay Prediction
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Source Station Code"
              value={source}
              onChange={(e) => setSource(e.target.value.toUpperCase())}
              placeholder="e.g., BBS"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Destination Station Code"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="e.g., BNC"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Travel Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            sx={{
              px: 4,
              py: 1.5,
              backgroundColor: COLORS.navy,
              '&:hover': {
                backgroundColor: '#03305d'
              },
              color: COLORS.white
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Search Trains'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {trains.length > 0 && (
        <Typography variant="h5" sx={{ mb: 2, color: COLORS.white, fontWeight: 'bold' }}>
          Found {trains.length} Train(s)
        </Typography>
      )}

      {searchAttempted && !loading && !error && trains.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: COLORS.white,
            borderLeft: `6px solid ${COLORS.navy}`
          }}
        >
          <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 600 }}>
            No trains found for that route
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Double-check the station codes (e.g., BBS, SBC) and ensure trains exist for this route on the selected date.
          </Typography>
        </Paper>
      )}

      {trains.map((train) => (
        <Card key={train.trainNo} sx={{ mb: 3, elevation: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
              <Box>
                <Typography variant="h5" component="h2" gutterBottom>
                  {train.trainName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Train No: {train.trainNo}
                </Typography>
                <Chip
                  label={train.trainType}
                  color={train.trainType === 'Superfast' ? 'primary' : train.trainType === 'Express' ? 'info' : 'default'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
              {delayPredictions[train.trainNo] && (
                <Chip
                  icon={<ScheduleIcon />}
                  label={`${delayPredictions[train.trainNo].predictedDelay} min delay`}
                  color={getDelayColor(delayPredictions[train.trainNo].predictedDelay)}
                  size="medium"
                />
              )}
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="h6">
                    {train.sourceStation.name} ({train.sourceStation.code})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Departure: {train.sourceStation.departureTime}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Destination
                  </Typography>
                  <Typography variant="h6">
                    {train.destinationStation.name} ({train.destinationStation.code})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Arrival: {train.destinationStation.arrivalTime}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="body2" sx={{ mb: 2 }}>
              Distance: {train.distance} km | Total Stops: {train.totalStops}
            </Typography>

            {delayPredictions[train.trainNo] && (
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    <Typography variant="subtitle1">
                      Delay Prediction & AI Suggestions
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Predicted Delay: {delayPredictions[train.trainNo].predictedDelay} minutes
                    </Typography>
                    <Chip
                      label={delayPredictions[train.trainNo].delayCategory}
                      color={getDelayColor(delayPredictions[train.trainNo].predictedDelay)}
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  
                  {delayPredictions[train.trainNo].suggestions && (
                    <List>
                      {delayPredictions[train.trainNo].suggestions.map((suggestion, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <Box sx={{ display: 'flex', alignItems: 'start', gap: 1, width: '100%' }}>
                              {getSuggestionIcon(suggestion.type)}
                              <ListItemText
                                primary={suggestion.message}
                                secondary={`Priority: ${suggestion.priority}`}
                              />
                            </Box>
                          </ListItem>
                          {index < delayPredictions[train.trainNo].suggestions.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </AccordionDetails>
              </Accordion>
            )}

            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">View Full Route ({train.route.length} stops)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {train.route.map((stop, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${stop.stationName} (${stop.stationCode})`}
                        secondary={`Arr: ${stop.arrivalTime} | Dep: ${stop.departureTime} | Distance: ${stop.distance} km`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}

export default App;
