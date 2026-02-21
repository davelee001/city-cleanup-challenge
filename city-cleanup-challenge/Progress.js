import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import ProgressPhotoUploader from './components/ProgressPhotoUploader';
import EnhancedImageUploader from './components/EnhancedImageUploader';

const API_BASE_URL = 'http://localhost:3001/api/v1';

export default function Progress({ username }) {
  const [userProgress, setUserProgress] = useState([]);
  const [checkedInEvents, setCheckedInEvents] = useState([]);
  const [enhancedProgress, setEnhancedProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProgressForm, setShowProgressForm] = useState(null);
  const [showPhotoUploader, setShowPhotoUploader] = useState(null);
  const [showEnhancedUploader, setShowEnhancedUploader] = useState(null);
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [progressData, setProgressData] = useState({
    wasteCollected: '',
    wasteType: '',
    notes: ''
  });
  const [totalWaste, setTotalWaste] = useState(0);
  const [aggregateAIStats, setAggregateAIStats] = useState(null);

  useEffect(() => {
    fetchUserProgress();
    fetchCheckedInEvents();
    if (enhancedMode) {
      fetchEnhancedProgress();
    }
  }, [enhancedMode]);

  const fetchUserProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${username}/progress`);
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
      const res = await fetch(`${API_BASE_URL}/users/${username}/checkins`);
      const data = await res.json();
      if (data.success) {
        setCheckedInEvents(data.checkins);
      }
    } catch {
      setError('Failed to load checked-in events');
    }
  };

  const fetchEnhancedProgress = async () => {
    try {
      // Fetch enhanced progress for each checked-in event
      const enhancedData = [];
      let totalImpactScore = 0;
      let validScores = 0;
      
      for (const checkin of checkedInEvents) {
        const res = await fetch(`${API_BASE_URL}/enhanced/progress/${checkin.eventId}/analysis`);
        if (res.ok) {
          const data = await res.json();
          if (data.enhancedProgress) {
            const userEnhancedProgress = data.enhancedProgress.filter(p => p.username === username);
            enhancedData.push(...userEnhancedProgress);
            
            // Calculate aggregate stats
            userEnhancedProgress.forEach(progress => {
              if (progress.impactAnalysis && progress.impactAnalysis.impactAnalysis) {
                totalImpactScore += progress.impactAnalysis.impactAnalysis.score;
                validScores++;
              }
            });
          }
        }
      }
      
      setEnhancedProgress(enhancedData);
      
      // Set aggregate stats
      if (validScores > 0) {
        setAggregateAIStats({
          averageImpactScore: totalImpactScore / validScores,
          totalAnalyzedPhotos: validScores,
          enhancedEvents: enhancedData.length
        });
      }
      
    } catch (error) {
      console.error('Error fetching enhanced progress:', error);
    }
  };

  const handleUpdateProgress = async (eventId) => {
    if (!progressData.wasteCollected || isNaN(parseFloat(progressData.wasteCollected))) {
      Alert.alert('Error', 'Please enter a valid amount of waste collected');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${eventId}/progress`, {
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
        
        {/* Enhanced AI Stats */}
        {enhancedMode && aggregateAIStats && (
          <View style={styles.enhancedSummary}>
            <View style={styles.aiStatRow}>
              <FontAwesome5 name="brain" size={16} color="#FFF" />
              <Text style={styles.aiStatText}>
                AI Impact Score: {(aggregateAIStats.averageImpactScore * 100).toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.aiStatSubtext}>
              {aggregateAIStats.totalAnalyzedPhotos} photos analyzed with AI
            </Text>
          </View>
        )}
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[styles.modeToggle, !enhancedMode && styles.modeToggleActive]}
          onPress={() => setEnhancedMode(false)}
        >
          <MaterialIcons 
            name="assessment" 
            size={18} 
            color={!enhancedMode ? '#FFF' : '#007AFF'} 
          />
          <Text style={[styles.modeToggleText, !enhancedMode && styles.modeToggleTextActive]}>
            Basic View
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeToggle, enhancedMode && styles.modeToggleActive]}
          onPress={() => setEnhancedMode(true)}
        >
          <FontAwesome5 
            name="brain" 
            size={16} 
            color={enhancedMode ? '#FFF' : '#007AFF'} 
          />
          <Text style={[styles.modeToggleText, enhancedMode && styles.modeToggleTextActive]}>
            Enhanced View
          </Text>
        </TouchableOpacity>
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
                <View style={styles.actionButtons}>
                  <Button
                    title="Track Progress"
                    onPress={() => setShowProgressForm(checkin.eventId)}
                  />
                  <TouchableOpacity 
                    style={styles.photoButton}
                    onPress={() => setShowPhotoUploader(checkin.eventId)}
                  >
                    <Text style={styles.photoButtonText}>📷 Add Photos</Text>
                  </TouchableOpacity>
                  
                  {enhancedMode && (
                    <TouchableOpacity 
                      style={[styles.photoButton, styles.enhancedButton]}
                      onPress={() => setShowEnhancedUploader(checkin.eventId)}
                    >
                      <FontAwesome5 name="brain" size={14} color="#FFF" />
                      <Text style={[styles.photoButtonText, { marginLeft: 8 }]}>
                        Enhanced Upload
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {/* Photo Uploader Modal */}
              {showPhotoUploader === checkin.eventId && (
                <View style={styles.photoUploaderWrapper}>
                  <ProgressPhotoUploader
                    username={username}
                    eventId={checkin.eventId}
                    onProgressUpdated={(result) => {
                      setShowPhotoUploader(null);
                      fetchUserProgress(); // Refresh data
                      Alert.alert('Success', 'Progress and photos uploaded successfully!');
                    }}
                  />
                  <Button 
                    title="Close" 
                    onPress={() => setShowPhotoUploader(null)}
                    color="#6c757d"
                  />
                </View>
              )}

              {/* Enhanced Photo Uploader */}
              {showEnhancedUploader === checkin.eventId && (
                <View style={[styles.photoUploaderWrapper, styles.enhancedUploaderWrapper]}>
                  <Text style={styles.enhancedUploaderTitle}>
                    🧠 Enhanced Upload with GPS & AI Analysis
                  </Text>
                  <Text style={styles.enhancedUploaderSubtitle}>
                    Upload photos with GPS metadata and AI impact analysis
                  </Text>
                  
                  {/* Before Photo */}
                  <View style={styles.enhancedPhotoSection}>
                    <Text style={styles.enhancedPhotoLabel}>Before Cleanup Photo</Text>
                    <EnhancedImageUploader
                      type="before"
                      eventId={checkin.eventId}
                      username={username}
                      maxPhotos={1}
                      enableGPS={true}
                      enableAIAnalysis={true}
                      onUploadComplete={(result) => {
                        console.log('Enhanced before photo uploaded:', result);
                        if (enhancedMode) fetchEnhancedProgress();
                        fetchUserProgress();
                      }}
                      onError={(error) => {
                        console.error('Enhanced upload error:', error);
                        Alert.alert('Upload Error', error.message);
                      }}
                      style={styles.enhancedUploaderComponent}
                    />
                  </View>

                  {/* After Photo */}
                  <View style={styles.enhancedPhotoSection}>
                    <Text style={styles.enhancedPhotoLabel}>After Cleanup Photo</Text>
                    <EnhancedImageUploader
                      type="after"
                      eventId={checkin.eventId}
                      username={username}
                      maxPhotos={1}
                      enableGPS={true}
                      enableAIAnalysis={true}
                      onUploadComplete={(result) => {
                        console.log('Enhanced after photo uploaded:', result);
                        if (enhancedMode) fetchEnhancedProgress();
                        fetchUserProgress();
                        if (result.analysis && result.analysis.length > 0) {
                          Alert.alert(
                            'AI Analysis Complete', 
                            `Impact Score: ${(result.analysis[0].impactAnalysis?.score * 100 || 0).toFixed(1)}%`
                          );
                        }
                      }}
                      onError={(error) => {
                        console.error('Enhanced upload error:', error);
                        Alert.alert('Upload Error', error.message);
                      }}
                      style={styles.enhancedUploaderComponent}
                    />
                  </View>
                  
                  <Button 
                    title="Close Enhanced Uploader" 
                    onPress={() => setShowEnhancedUploader(null)}
                    color="#6c757d"
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator style={{ margin: 10 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Progress History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {enhancedMode ? 'Enhanced Progress History' : 'Progress History'}
        </Text>
        <ScrollView style={styles.progressList}>
          {enhancedMode ? (
            enhancedProgress.length === 0 && !loading ? (
              <View style={styles.emptyEnhanced}>
                <FontAwesome5 name="brain" size={32} color="#CCC" />
                <Text style={styles.empty}>
                  No AI-enhanced progress yet.
                </Text>
                <Text style={styles.emptySubtext}>
                  Use enhanced upload to generate AI analysis and GPS metadata!
                </Text>
              </View>
            ) : (
              enhancedProgress.map((progress, index) => (
                <View key={`enhanced-${index}`} style={[styles.progressCard, styles.enhancedProgressCard]}>
                  <View style={styles.enhancedProgressHeader}>
                    <Text style={styles.progressEventTitle}>{progress.eventTitle || 'Cleanup Event'}</Text>
                    <FontAwesome5 name="brain" size={16} color="#007AFF" />
                  </View>
                  
                  <Text style={styles.progressDate}>📅 {new Date(progress.updatedAt).toLocaleDateString()}</Text>
                  
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
                  
                  {/* GPS Information */}
                  {(progress.gpsData?.before || progress.gpsData?.after) && (
                    <View style={styles.gpsSection}>
                      <Text style={styles.gpsSectionTitle}>📍 GPS Metadata:</Text>
                      {progress.gpsData.before && (
                        <Text style={styles.gpsCoordinates}>
                          Before: {progress.gpsData.before.latitude.toFixed(4)}, {progress.gpsData.before.longitude.toFixed(4)}
                        </Text>
                      )}
                      {progress.gpsData.after && (
                        <Text style={styles.gpsCoordinates}>
                          After: {progress.gpsData.after.latitude.toFixed(4)}, {progress.gpsData.after.longitude.toFixed(4)}
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {/* AI Analysis Results */}
                  {progress.impactAnalysis && (
                    <View style={styles.aiAnalysisSection}>
                      <Text style={styles.aiAnalysisTitle}>🧠 AI Impact Analysis:</Text>
                      
                      {progress.impactAnalysis.impactAnalysis && (
                        <View style={styles.impactScoreContainer}>
                          <Text style={styles.impactScoreText}>
                            Impact Score: {(progress.impactAnalysis.impactAnalysis.score * 100).toFixed(1)}%
                          </Text>
                          <View style={styles.impactScoreBar}>
                            <View 
                              style={[
                                styles.impactScoreProgress, 
                                { width: `${progress.impactAnalysis.impactAnalysis.score * 100}%` }
                              ]} 
                            />
                          </View>
                        </View>
                      )}
                      
                      {progress.impactAnalysis.progressReport && (
                        <View style={styles.progressReportSection}>
                          <Text style={styles.progressReportTitle}>📊 Analysis Summary:</Text>
                          <Text style={styles.progressReportText}>
                            {progress.impactAnalysis.progressReport.summary}
                          </Text>
                        </View>
                      )}
                      
                      {progress.impactAnalysis.locationValidation && (
                        <View style={styles.locationValidation}>
                          <Text style={[
                            styles.locationValidationText,
                            { color: progress.impactAnalysis.locationValidation.valid ? '#4CAF50' : '#F44336' }
                          ]}>
                            {progress.impactAnalysis.locationValidation.valid ? '✅' : '❌'} Location: {progress.impactAnalysis.locationValidation.message}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  {progress.notes && (
                    <Text style={styles.progressNotes}>💭 {progress.notes}</Text>
                  )}
                  
                  <Text style={styles.progressUpdated}>
                    Last updated: {new Date(progress.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )
          ) : (
            userProgress.length === 0 && !loading ? (
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
            )
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
  
  // Enhanced Summary Styles
  enhancedSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    alignSelf: 'stretch'
  },
  aiStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  aiStatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  aiStatSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center'
  },
  
  // Mode Toggle Styles
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 4,
    marginBottom: 20
  },
  modeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  modeToggleActive: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  modeToggleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF'
  },
  modeToggleTextActive: {
    color: '#FFF'
  },
  
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
  actionButtons: { 
    flexDirection: 'column',
    gap: 8,
  },
  photoButton: {
    backgroundColor: '#20c997',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Enhanced Button Styles
  enhancedButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  photoUploaderWrapper: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  
  // Enhanced Uploader Styles
  enhancedUploaderWrapper: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 2
  },
  enhancedUploaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 4
  },
  enhancedUploaderSubtitle: {
    fontSize: 12,
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8
  },
  enhancedPhotoSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  enhancedPhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center'
  },
  enhancedUploaderComponent: {
    backgroundColor: 'transparent'
  },
  
  progressList: { flex: 1 },
  progressCard: { 
    backgroundColor: '#e8f5e8', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745'
  },
  
  // Enhanced Progress Card Styles
  enhancedProgressCard: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#007AFF'
  },
  enhancedProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  
  progressEventTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  progressLocation: { fontSize: 14, color: '#666', marginBottom: 2 },
  progressDate: { fontSize: 14, color: '#666', marginBottom: 8 },
  progressStats: { marginBottom: 8 },
  progressAmount: { fontSize: 16, fontWeight: 'bold', color: '#28a745' },
  progressType: { fontSize: 14, color: '#666', marginTop: 2 },
  
  // GPS Section Styles
  gpsSection: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8
  },
  gpsSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4
  },
  gpsCoordinates: {
    fontSize: 11,
    color: '#4CAF50',
    fontFamily: 'monospace'
  },
  
  // AI Analysis Section Styles
  aiAnalysisSection: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  aiAnalysisTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8
  },
  impactScoreContainer: {
    marginBottom: 8
  },
  impactScoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  impactScoreBar: {
    height: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  impactScoreProgress: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3
  },
  progressReportSection: {
    marginBottom: 8
  },
  progressReportTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  progressReportText: {
    fontSize: 11,
    color: '#555',
    lineHeight: 16
  },
  locationValidation: {
    marginTop: 8
  },
  locationValidationText: {
    fontSize: 11,
    fontWeight: '500'
  },
  
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
  },
  
  // Enhanced Empty State
  emptyEnhanced: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptySubtext: {
    color: '#AAA',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic'
  }
});