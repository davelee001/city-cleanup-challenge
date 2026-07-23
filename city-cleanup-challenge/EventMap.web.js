import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { API_BASE_URL } from './apiConfig';

export default function EventMapWeb({ username }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/events`)
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.message || 'Unable to load cleanup events');
        }
        setEvents(data.events || []);
      })
      .catch(fetchError => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.message}>Loading cleanup locations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cleanup Locations</Text>
      <Text style={styles.subtitle}>
        Interactive native maps are available in the mobile app. Web cleanup
        events are listed below.
      </Text>

      {events.length === 0 ? (
        <Text style={styles.empty}>No cleanup events are available yet.</Text>
      ) : (
        events.map(event => (
          <View key={event.id} style={styles.card}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventMeta}>{event.location}</Text>
            <Text style={styles.eventMeta}>
              {event.date} {event.time ? `at ${event.time}` : ''}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              onPress={() => {}}
            >
              <Text style={styles.buttonText}>
                {username ? 'Open event details' : 'Sign in to participate'}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f8f4',
    minHeight: '100%'
  },
  centered: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  message: {
    marginTop: 12,
    color: '#35523a'
  },
  error: {
    color: '#b3261e',
    textAlign: 'center'
  },
  title: {
    color: '#174d2a',
    fontSize: 28,
    fontWeight: '700'
  },
  subtitle: {
    color: '#55705d',
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 8
  },
  empty: {
    color: '#55705d',
    paddingVertical: 30,
    textAlign: 'center'
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#d8e5da',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16
  },
  eventTitle: {
    color: '#174d2a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6
  },
  eventMeta: {
    color: '#55705d',
    marginBottom: 4
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  }
});
