import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';

export default function Events({ username, onShowMap }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    time: ''
  });
  const [userLocation, setUserLocation] = useState(null);
  const [checkedInEvents, setCheckedInEvents] = useState(new Set());

  useEffect(() => {
    fetchEvents();
    getUserLocation();
    fetchUserCheckins();
  }, []);

  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to create events');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    } catch (err) {
      setError('Failed to get location');
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
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

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.description || !newEvent.location || !newEvent.date || !newEvent.time) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!userLocation) {
      Alert.alert('Error', 'Location is required. Please enable location services.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          creator: username
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewEvent({ title: '', description: '', location: '', date: '', time: '' });
        setShowCreateForm(false);
        fetchEvents();
        Alert.alert('Success', 'Event created successfully!');
      } else {
        setError(data.message || 'Failed to create event');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
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

  const isEventCreator = (event) => {
    return event.creator === username;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cleanup Events</Text>
      
      <View style={styles.buttonRow}>
        <Button 
          title="Create Event" 
          onPress={() => setShowCreateForm(!showCreateForm)} 
        />
        <Button 
          title="View Map" 
          onPress={onShowMap}
          color="#28a745"
        />
      </View>

      {showCreateForm && (
        <View style={styles.createForm}>
          <Text style={styles.formTitle}>Create New Event</Text>
          <TextInput
            style={styles.input}
            placeholder="Event Title"
            value={newEvent.title}
            onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={newEvent.description}
            onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Location (e.g., Central Park)"
            value={newEvent.location}
            onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Date (YYYY-MM-DD)"
            value={newEvent.date}
            onChangeText={(text) => setNewEvent({ ...newEvent, date: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Time (HH:MM)"
            value={newEvent.time}
            onChangeText={(text) => setNewEvent({ ...newEvent, time: text })}
          />
          <View style={styles.buttonRow}>
            <Button title="Create" onPress={handleCreateEvent} disabled={loading} />
            <Button title="Cancel" onPress={() => setShowCreateForm(false)} color="#6c757d" />
          </View>
        </View>
      )}

      {loading && <ActivityIndicator style={{ margin: 10 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView style={styles.eventsList}>
        {events.length === 0 && !loading ? (
          <Text style={styles.empty}>No events available. Create the first one!</Text>
        ) : (
          events.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDesc}>{event.description}</Text>
              <Text style={styles.eventLocation}>📍 {event.location}</Text>
              <Text style={styles.eventDate}>📅 {formatDate(event.date)} at {event.time}</Text>
              <Text style={styles.eventCreator}>👤 Created by {event.creator}</Text>
              
              <View style={styles.eventActions}>
                {checkedInEvents.has(event.id) ? (
                  <View style={styles.checkedIn}>
                    <Text style={styles.checkedInText}>✅ Checked In</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.checkinButton}
                    onPress={() => handleCheckIn(event.id)}
                  >
                    <Text style={styles.checkinButtonText}>Check In</Text>
                  </TouchableOpacity>
                )}
                
                {isEventCreator(event) && (
                  <Text style={styles.creatorBadge}>Your Event</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  createForm: { 
    backgroundColor: '#f8f9fa', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 16 
  },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 4, 
    padding: 10, 
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  eventsList: { flex: 1 },
  eventCard: { 
    backgroundColor: '#f0f0f0', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  eventTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  eventDesc: { fontSize: 14, color: '#666', marginBottom: 8 },
  eventLocation: { fontSize: 14, marginBottom: 4 },
  eventDate: { fontSize: 14, marginBottom: 4 },
  eventCreator: { fontSize: 12, color: '#888', marginBottom: 8 },
  eventActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  checkinButton: { 
    backgroundColor: '#007bff', 
    padding: 8, 
    borderRadius: 4 
  },
  checkinButtonText: { color: '#fff', fontWeight: 'bold' },
  checkedIn: { 
    backgroundColor: '#28a745', 
    padding: 8, 
    borderRadius: 4 
  },
  checkedInText: { color: '#fff', fontWeight: 'bold' },
  creatorBadge: { 
    backgroundColor: '#ffc107', 
    color: '#000', 
    padding: 4, 
    borderRadius: 4, 
    fontSize: 12 
  },
  error: { color: 'red', marginBottom: 8 },
  empty: { color: '#888', textAlign: 'center', marginTop: 20 }
});