import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import ImageUploader from './ImageUploader';

const ProgressPhotoUploader = ({ username, eventId, onProgressUpdated }) => {
  const [wasteCollected, setWasteCollected] = useState('');
  const [wasteType, setWasteType] = useState('');
  const [notes, setNotes] = useState('');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleBeforePhotoUploaded = (result) => {
    if (result.photos?.before) {
      setBeforePhotoUrl(result.photos.before);
    }
  };

  const handleAfterPhotoUploaded = (result) => {
    if (result.photos?.after) {
      setAfterPhotoUrl(result.photos.after);
    }
  };

  const saveProgress = async () => {
    if (!beforePhotoUrl && !afterPhotoUrl) {
      Alert.alert('Missing Photos', 'Please upload at least one before or after photo.');
      return;
    }

    try {
      setSaving(true);

      // Since photos are already uploaded via ImageUploader, we just need to save the metadata
      const response = await fetch(`http://localhost:3001/api/v1/upload/progress/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          wasteCollected: parseFloat(wasteCollected) || 0,
          wasteType,
          notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', 'Your cleanup progress has been saved!');
        if (onProgressUpdated) {
          onProgressUpdated(result);
        }
        // Reset form
        setWasteCollected('');
        setWasteType('');
        setNotes('');
        setBeforePhotoUrl(null);
        setAfterPhotoUrl(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upload Cleanup Progress</Text>
      
      <View style={styles.photoSection}>
        <Text style={styles.sectionTitle}>Before & After Photos</Text>
        
        <View style={styles.photoRow}>
          <View style={styles.photoColumn}>
            <Text style={styles.photoLabel}>Before Cleanup</Text>
            <ImageUploader
              uploadType="beforePhoto" 
              username={username}
              eventId={eventId}
              onImageUploaded={handleBeforePhotoUploaded}
              placeholder="Before Photo"
              style={styles.photoUploader}
            />
          </View>
          
          <View style={styles.photoColumn}>
            <Text style={styles.photoLabel}>After Cleanup</Text>
            <ImageUploader
              uploadType="afterPhoto"
              username={username}
              eventId={eventId} 
              onImageUploaded={handleAfterPhotoUploaded}
              placeholder="After Photo"
              style={styles.photoUploader}
            />
          </View>
        </View>
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Cleanup Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Waste Collected (kg)</Text>
          <TextInput
            style={styles.input}
            value={wasteCollected}
            onChangeText={setWasteCollected}
            placeholder="e.g., 5.5"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Waste Type</Text>
          <TextInput
            style={styles.input}
            value={wasteType}
            onChangeText={setWasteType}
            placeholder="e.g., plastic bottles, paper, mixed waste"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional comments about the cleanup..."
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveProgress}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving Progress...' : 'Save Progress'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2e8b57',
  },
  photoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoColumn: {
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#555',
  },
  photoUploader: {
    marginBottom: 8,
  },
  detailsSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#2e8b57',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ProgressPhotoUploader;