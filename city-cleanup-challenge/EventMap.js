import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';

export default function EventMap({ username }) {
  const [events, setEvents] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkedInEvents, setCheckedInEvents] = useState(new Set());

  useEffect(() => {
    getUserLocation();
    fetchEvents();
    fetchUserCheckins();
  }, []);

  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required for map functionality');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    } catch (err) {
      setError('Failed to get location');
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:3000/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      } else {
        setError('Failed to load events');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const fetchUserCheckins = async () => {
    try {
      const res = await fetch(`http://localhost:3000/users/${username}/checkins`);
      const data = await res.json();
      if (data.success) {
        const checkedInEventIds = new Set(data.checkins.map(checkin => checkin.eventId));
        setCheckedInEvents(checkedInEventIds);
      }
    } catch (err) {
      console.log('Failed to fetch user checkins:', err);
    }
  };

  const handleCheckIn = async (eventId) => {
    if (!userLocation) {
      Alert.alert('Error', 'Location is required for check-in');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Checked in successfully!');
        setCheckedInEvents(prev => new Set([...prev, eventId]));
      } else {
        Alert.alert('Error', data.message || 'Check-in failed');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getMarkerColor = (event) => {
    if (checkedInEvents.has(event.id)) {
      return '#28a745'; // Green for checked-in events
    }
    return '#dc3545'; // Red for events not checked into
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading map...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const initialRegion = userLocation ? {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : {
    latitude: 40.7128, // Default to NYC
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cleanup Events Map</Text>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#dc3545' }]} />
          <Text style={styles.legendText}>Available Events</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#28a745' }]} />
          <Text style={styles.legendText}>Checked In</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#007bff' }]} />
          <Text style={styles.legendText}>Your Location</Text>
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            }}
            title="Your Location"
            pinColor="#007bff"
          />
        )}

        {/* Event markers */}
        {events.map(event => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude
            }}
            pinColor={getMarkerColor(event)}
          >
            <Callout style={styles.callout}>
              <View style={styles.calloutContent}>
                <Text style={styles.calloutTitle}>{event.title}</Text>
                <Text style={styles.calloutDesc}>{event.description}</Text>
                <Text style={styles.calloutLocation}>📍 {event.location}</Text>
                <Text style={styles.calloutDate}>📅 {formatDate(event.date)} at {event.time}</Text>
                <Text style={styles.calloutCreator}>👤 Created by {event.creator}</Text>
                
                {checkedInEvents.has(event.id) ? (
                  <Text style={styles.checkedInText}>✅ Checked In</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.checkinButton}
                    onPress={() => handleCheckIn(event.id)}
                  >
                    <Text style={styles.checkinButtonText}>Check In</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          📍 {events.length} events • ✅ {checkedInEvents.size} checked in
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  callout: {
    width: 250,
  },
  calloutContent: {
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  calloutLocation: {
    fontSize: 12,
    marginBottom: 2,
  },
  calloutDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  calloutCreator: {
    fontSize: 10,
    color: '#888',
    marginBottom: 8,
  },
  checkinButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  checkinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  checkedInText: {
    color: '#28a745',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stats: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
});