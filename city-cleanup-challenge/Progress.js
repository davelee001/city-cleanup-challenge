import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import ProgressPhotoUploader from './components/ProgressPhotoUploader';
import EnhancedImageUploader from './components/EnhancedImageUploader';

import { API_BASE_URL, apiFetch } from './apiConfig';
import { colors } from './theme';
import ThemedButton from './components/ThemedButton';

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
      const res = await apiFetch(`${API_BASE_URL}/users/${username}/progress`);
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
      const res = await apiFetch(`${API_BASE_URL}/users/${username}/checkins`);
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
        const res = await apiFetch(`${API_BASE_URL}/enhanced/progress/${checkin.eventId}/analysis`);
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
      const res = await apiFetch(`${API_BASE_URL}/events/${eventId}/progress`, {
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
              <FontAwesome5 name="brain" size={16} color={colors.accentTeal} />
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
            color={!enhancedMode ? colors.white : colors.accentBlue} 
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
            color={enhancedMode ? colors.white : colors.accentBlue} 
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
                    placeholderTextColor={colors.textMuted}
                    value={progressData.wasteCollected}
                    onChangeText={(text) => setProgressData({ ...progressData, wasteCollected: text })}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Type of waste (e.g., plastic, paper, general)"
                    placeholderTextColor={colors.textMuted}
                    value={progressData.wasteType}
                    onChangeText={(text) => setProgressData({ ...progressData, wasteType: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.textMuted}
                    value={progressData.notes}
                    onChangeText={(text) => setProgressData({ ...progressData, notes: text })}
                    multiline
                  />
                  <View style={styles.buttonRow}>
                    <ThemedButton
                      title="Save Progress"
                      onPress={() => handleUpdateProgress(checkin.eventId)}
                      disabled={loading}
                    />
                    <ThemedButton
                      title="Cancel"
                      onPress={() => setShowProgressForm(null)}
                      variant="secondary"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.actionButtons}>
                  <ThemedButton
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
                      <FontAwesome5 name="brain" size={14} color={colors.white} />
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
                  <ThemedButton
                    title="Close"
                    onPress={() => setShowPhotoUploader(null)}
                    variant="secondary"
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
                  
                  <ThemedButton
                    title="Close Enhanced Uploader"
                    onPress={() => setShowEnhancedUploader(null)}
                    variant="secondary"
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
                <FontAwesome5 name="brain" size={32} color={colors.textMuted} />
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
                            { color: progress.impactAnalysis.locationValidation.valid ? colors.success : colors.danger }
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
  container: { flex: 1, padding: 24, backgroundColor: colors.pageBackground },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16, color: colors.textPrimary },
  summaryCard: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24
  },
  summaryTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  totalWaste: { color: colors.accentTeal, fontSize: 36, fontWeight: '600', marginVertical: 8 },
  summarySubtext: { color: colors.textSecondary, fontSize: 14 },

  // Enhanced Summary Styles
  enhancedSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.cardDeep,
    borderWidth: 1,
    borderColor: colors.borderSoft,
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
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  aiStatSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center'
  },
  
  // Mode Toggle Styles
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.pageBackground,
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
    backgroundColor: colors.accentBlue,
    shadowColor: colors.accentBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  modeToggleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentBlue
  },
  modeToggleTextActive: {
    color: colors.white
  },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: colors.textPrimary },
  eventCard: {
    backgroundColor: colors.cardDeeper,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  eventTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: colors.textPrimary },
  eventLocation: { fontSize: 14, color: colors.textFaint, marginBottom: 2 },
  eventDate: { fontSize: 14, color: colors.textFaint, marginBottom: 12 },
  progressForm: { marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: colors.cardDeep,
    color: colors.textPrimary
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionButtons: { 
    flexDirection: 'column',
    gap: 8,
  },
  photoButton: {
    backgroundColor: colors.accentTeal,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  photoButtonText: {
    color: colors.pageBackground,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Enhanced Button Styles
  enhancedButton: {
    backgroundColor: colors.accentBlue,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  photoUploaderWrapper: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.cardDeeper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  
  // Enhanced Uploader Styles
  enhancedUploaderWrapper: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.accentBlueSoft,
    borderWidth: 2
  },
  enhancedUploaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accentBlueSoft,
    textAlign: 'center',
    marginBottom: 4
  },
  enhancedUploaderSubtitle: {
    fontSize: 12,
    color: colors.accentBlueSoft,
    textAlign: 'center',
    marginBottom: 16,
  },
  enhancedPhotoSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  enhancedPhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center'
  },
  enhancedUploaderComponent: {
    backgroundColor: 'transparent'
  },
  
  progressList: { flex: 1 },
  progressCard: {
    backgroundColor: colors.successBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success
  },
  
  // Enhanced Progress Card Styles
  enhancedProgressCard: {
    backgroundColor: colors.cardAlt,
    borderLeftColor: colors.accentBlue
  },
  enhancedProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  
  progressEventTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: colors.textPrimary },
  progressLocation: { fontSize: 14, color: colors.textFaint, marginBottom: 2 },
  progressDate: { fontSize: 14, color: colors.textFaint, marginBottom: 8 },
  progressStats: { marginBottom: 8 },
  progressAmount: { fontSize: 16, fontWeight: '600', color: colors.success },
  progressType: { fontSize: 14, color: colors.textFaint, marginTop: 2 },
  
  // GPS Section Styles
  gpsSection: {
    backgroundColor: colors.successBg,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8
  },
  gpsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 4
  },
  gpsCoordinates: {
    fontSize: 11,
    color: colors.success,
    fontFamily: 'monospace'
  },
  
  // AI Analysis Section Styles
  aiAnalysisSection: {
    backgroundColor: colors.cardDeep,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  aiAnalysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentBlue,
    marginBottom: 8
  },
  impactScoreContainer: {
    marginBottom: 8
  },
  impactScoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentBlue,
    marginBottom: 4
  },
  impactScoreBar: {
    height: 6,
    backgroundColor: colors.cardDeeper,
    borderRadius: 3,
    overflow: 'hidden'
  },
  impactScoreProgress: {
    height: '100%',
    backgroundColor: colors.accentBlue,
    borderRadius: 3
  },
  progressReportSection: {
    marginBottom: 8
  },
  progressReportTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentBlue,
    marginBottom: 4
  },
  progressReportText: {
    fontSize: 11,
    color: colors.textFaint,
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
    color: colors.textFaint,
    marginBottom: 8
  },
  progressUpdated: { fontSize: 12, color: colors.textMuted },
  error: { color: colors.danger, marginBottom: 8, textAlign: 'center' },
  empty: { 
    color: colors.textMuted,
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
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic'
  }
});
