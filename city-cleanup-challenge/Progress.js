import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';

export default function Progress({ username }) {
  const [userProgress, setUserProgress] = useState([]);
  const [checkedInEvents, setCheckedInEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProgressForm, setShowProgressForm] = useState(null);
  const [progressData, setProgressData] = useState({
    wasteCollected: '',
    wasteType: '',
    notes: ''
  });
  const [totalWaste, setTotalWaste] = useState(0);

  useEffect(() => {
    fetchUserProgress();
    fetchCheckedInEvents();
  }, []);

  const fetchUserProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/users/${username}/progress`);
      const data = await res.json();
      if (data.success) {
        setUserProgress(data.progress);
        setTotalWaste(data.totalWasteCollected);
      } else {
        setError('Failed to load progress data');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const fetchCheckedInEvents = async () => {
    try {
      const res = await fetch(`http://localhost:3000/users/${username}/checkins`);
      const data = await res.json();
      if (data.success) {
        setCheckedInEvents(data.checkins);
      }
    } catch {
      setError('Failed to load checked-in events');
    }
  };

  const handleUpdateProgress = async (eventId) => {
    if (!progressData.wasteCollected || isNaN(parseFloat(progressData.wasteCollected))) {
      Alert.alert('Error', 'Please enter a valid amount of waste collected');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/events/${eventId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          wasteCollected: parseFloat(progressData.wasteCollected),
          wasteType: progressData.wasteType,
          notes: progressData.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Progress updated successfully!');
        setProgressData({ wasteCollected: '', wasteType: '', notes: '' });
        setShowProgressForm(null);
        fetchUserProgress();
      } else {
        Alert.alert('Error', data.message || 'Failed to update progress');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getProgressForEvent = (eventId) => {
    return userProgress.find(p => p.eventId === eventId);
  };

  const eventsWithoutProgress = checkedInEvents.filter(
    checkin => !userProgress.some(p => p.eventId === checkin.eventId)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Cleanup Progress</Text>
      
      {/* Total Impact Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Your Total Impact</Text>
        <Text style={styles.totalWaste}>{totalWaste.toFixed(1)} kg</Text>
        <Text style={styles.summarySubtext}>Total waste collected</Text>
        <Text style={styles.summarySubtext}>
          {userProgress.length} events with recorded progress
        </Text>
      </View>

      {/* Events without progress tracking */}
      {eventsWithoutProgress.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Progress Tracking</Text>
          {eventsWithoutProgress.map(checkin => (
            <View key={checkin.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{checkin.title}</Text>
              <Text style={styles.eventLocation}>📍 {checkin.location}</Text>
              <Text style={styles.eventDate}>📅 {formatDate(checkin.date)}</Text>
              
              {showProgressForm === checkin.eventId ? (
                <View style={styles.progressForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Waste collected (kg)"
                    value={progressData.wasteCollected}
                    onChangeText={(text) => setProgressData({ ...progressData, wasteCollected: text })}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Type of waste (e.g., plastic, paper, general)"
                    value={progressData.wasteType}
                    onChangeText={(text) => setProgressData({ ...progressData, wasteType: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Notes (optional)"
                    value={progressData.notes}
                    onChangeText={(text) => setProgressData({ ...progressData, notes: text })}
                    multiline
                  />
                  <View style={styles.buttonRow}>
                    <Button 
                      title="Save Progress" 
                      onPress={() => handleUpdateProgress(checkin.eventId)}
                      disabled={loading}
                    />
                    <Button 
                      title="Cancel" 
                      onPress={() => setShowProgressForm(null)}
                      color="#6c757d"
                    />
                  </View>
                </View>
              ) : (
                <Button
                  title="Track Progress"
                  onPress={() => setShowProgressForm(checkin.eventId)}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator style={{ margin: 10 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Progress History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress History</Text>
        <ScrollView style={styles.progressList}>
          {userProgress.length === 0 && !loading ? (
            <Text style={styles.empty}>
              No progress tracked yet. Check into an event and start tracking your cleanup impact!
            </Text>
          ) : (
            userProgress.map(progress => (
              <View key={progress.id} style={styles.progressCard}>
                <Text style={styles.progressEventTitle}>{progress.title}</Text>
                <Text style={styles.progressLocation}>📍 {progress.location}</Text>
                <Text style={styles.progressDate}>📅 {formatDate(progress.date)}</Text>
                
                <View style={styles.progressStats}>
                  <Text style={styles.progressAmount}>
                    🗑️ {progress.wasteCollected} kg collected
                  </Text>
                  {progress.wasteType && (
                    <Text style={styles.progressType}>
                      📦 Type: {progress.wasteType}
                    </Text>
                  )}
                </View>
                
                {progress.notes && (
                  <Text style={styles.progressNotes}>💭 {progress.notes}</Text>
                )}
                
                <Text style={styles.progressUpdated}>
                  Last updated: {new Date(progress.updatedAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  summaryCard: { 
    backgroundColor: '#28a745', 
    padding: 20, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 24 
  },
  summaryTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  totalWaste: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  summarySubtext: { color: '#fff', fontSize: 14, opacity: 0.9 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  eventCard: { 
    backgroundColor: '#f8f9fa', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  eventTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  eventLocation: { fontSize: 14, color: '#666', marginBottom: 2 },
  eventDate: { fontSize: 14, color: '#666', marginBottom: 12 },
  progressForm: { marginTop: 12 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 4, 
    padding: 10, 
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressList: { flex: 1 },
  progressCard: { 
    backgroundColor: '#e8f5e8', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745'
  },
  progressEventTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  progressLocation: { fontSize: 14, color: '#666', marginBottom: 2 },
  progressDate: { fontSize: 14, color: '#666', marginBottom: 8 },
  progressStats: { marginBottom: 8 },
  progressAmount: { fontSize: 16, fontWeight: 'bold', color: '#28a745' },
  progressType: { fontSize: 14, color: '#666', marginTop: 2 },
  progressNotes: { 
    fontSize: 14, 
    fontStyle: 'italic', 
    color: '#666',
    marginBottom: 8
  },
  progressUpdated: { fontSize: 12, color: '#888' },
  error: { color: 'red', marginBottom: 8, textAlign: 'center' },
  empty: { 
    color: '#888', 
    textAlign: 'center', 
    marginTop: 20,
    fontStyle: 'italic'
  }
});