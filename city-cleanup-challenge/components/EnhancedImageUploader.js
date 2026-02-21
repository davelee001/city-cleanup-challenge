/**
 * Enhanced Image Uploader with GPS, AI Analysis, and Progress Tracking
 * Supports avatar uploads and progress photos with advanced features
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  Alert, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const EnhancedImageUploader = ({
  type = 'avatar', // 'avatar', 'progress', 'before', 'after'
  eventId = null,
  username,
  onUploadComplete,
  onError,
  maxPhotos = 1,
  enableGPS = true,
  enableAIAnalysis = true,
  style = {}
}) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle', 'requesting', 'success', 'error'
  const [analysisResults, setAnalysisResults] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (!enableGPS) return;

    try {
      setGpsStatus('requesting');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('error');
        Alert.alert(
          'GPS Permission Required',
          'Location permission is needed to add GPS metadata to your photos for better cleanup tracking.',
          [
            { text: 'Skip GPS', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000
      });

      setGpsLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date().toISOString()
      });
      setGpsStatus('success');
    } catch (error) {
      console.error('GPS Error:', error);
      setGpsStatus('error');
    }
  };

  const pickImage = async () => {
    if (images.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can only upload ${maxPhotos} photo(s).`);
      return;
    }

    try {
      // Ask for camera/gallery choice
      Alert.alert(
        'Select Photo Source',
        'Choose how you want to add the photo',
        [
          { 
            text: 'Camera', 
            onPress: () => openImagePicker(true),
            style: 'default'
          },
          { 
            text: 'Gallery', 
            onPress: () => openImagePicker(false),
            style: 'default'
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Image picker error:', error);
      onError && onError(error);
    }
  };

  const openImagePicker = async (useCamera) => {
    try {
      let result;
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [4, 3],
        quality: 0.9,
        exif: true, // Include EXIF data for potential GPS info
      };

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Gallery Permission', 'Gallery permission is required to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.cancelled && result.uri) {
        const newImage = {
          id: Date.now(),
          uri: result.uri,
          type: result.type || 'image',
          width: result.width,
          height: result.height,
          exif: result.exif || null,
          timestamp: new Date().toISOString(),
          gpsLocation: gpsLocation,
          source: useCamera ? 'camera' : 'gallery'
        };

        setImages(prev => [...prev, newImage]);

        // Auto-upload if single image type
        if (maxPhotos === 1) {
          uploadImages([newImage]);
        }
      }
    } catch (error) {
      console.error('Image selection error:', error);
      onError && onError(error);
    }
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const uploadImages = async (imagesToUpload = images) => {
    if (imagesToUpload.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to upload.');
      return;
    }

    if (!username) {
      Alert.alert('Error', 'Username is required for upload.');
      return;
    }

    setUploading(true);
    setUploadProgress({});

    try {
      const uploadPromises = imagesToUpload.map(async (image, index) => {
        const formData = new FormData();
        
        // Determine field name based on type
        const fieldName = type === 'avatar' ? 'avatar' : 
                         type === 'before' ? 'beforePhoto' :
                         type === 'after' ? 'afterPhoto' : 'image';

        // Create file object
        const filename = `${type}_${username}_${image.timestamp}.jpg`;
        formData.append(fieldName, {
          uri: image.uri,
          type: 'image/jpeg',
          name: filename,
        });

        // Add metadata
        formData.append('username', username);
        if (eventId) formData.append('eventId', eventId);
        
        // Add GPS data if available
        if (image.gpsLocation) {
          formData.append('latitude', image.gpsLocation.latitude.toString());
          formData.append('longitude', image.gpsLocation.longitude.toString());
        }

        // Add image metadata
        if (image.width) formData.append('imageWidth', image.width.toString());
        if (image.height) formData.append('imageHeight', image.height.toString());

        // Update progress
        setUploadProgress(prev => ({ ...prev, [image.id]: 0 }));

        // Choose endpoint based on type and features
        const endpoint = enableAIAnalysis ? 
          (type === 'avatar' ? '/api/v1/enhanced/upload/avatar' : '/api/v1/enhanced/upload/progress/' + eventId) :
          (type === 'avatar' ? '/api/v1/upload/avatar' : '/api/v1/upload/progress/' + eventId);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Update progress
        setUploadProgress(prev => ({ ...prev, [image.id]: 50 }));

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Upload failed');
        }

        // Update progress
        setUploadProgress(prev => ({ ...prev, [image.id]: 100 }));

        return { ...result, imageId: image.id };
      });

      const results = await Promise.all(uploadPromises);

      // Collect analysis results if available
      const combinedAnalysis = results.reduce((acc, result) => {
        if (result.analysis) acc.push(result.analysis);
        if (result.impactAnalysis) acc.push(result.impactAnalysis);
        return acc;
      }, []);

      if (combinedAnalysis.length > 0) {
        setAnalysisResults(combinedAnalysis);
      }

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          success: true,
          results: results,
          analysis: combinedAnalysis.length > 0 ? combinedAnalysis : null,
          gpsData: gpsLocation
        });
      }

      // Reset for multiple uploads
      if (maxPhotos > 1) {
        setImages([]);
      }

      Alert.alert(
        'Upload Successful', 
        `${results.length} image(s) uploaded successfully${enableAIAnalysis ? ' with AI analysis' : ''}!`
      );

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload images.');
      if (onError) onError(error);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const getGPSStatusIcon = () => {
    switch (gpsStatus) {
      case 'requesting':
        return <ActivityIndicator size="small" color="#007AFF" />;
      case 'success':
        return <MaterialIcons name="gps-fixed" size={16} color="#4CAF50" />;
      case 'error':
        return <MaterialIcons name="gps-off" size={16} color="#F44336" />;
      default:
        return <MaterialIcons name="gps-not-fixed" size={16} color="#9E9E9E" />;
    }
  };

  const renderAnalysisResults = () => {
    if (!analysisResults || analysisResults.length === 0) return null;

    return (
      <View style={styles.analysisContainer}>
        <Text style={styles.analysisTitle}>AI Analysis Results</Text>
        {analysisResults.map((analysis, index) => (
          <View key={index} style={styles.analysisItem}>
            {analysis.impactAnalysis && (
              <View style={styles.impactScore}>
                <FontAwesome5 name="brain" size={16} color="#007AFF" />
                <Text style={styles.impactText}>
                  Impact Score: {(analysis.impactAnalysis.score * 100).toFixed(1)}%
                </Text>
              </View>
            )}
            {analysis.waste && (
              <View style={styles.wasteInfo}>
                <FontAwesome5 name="trash" size={14} color="#FF9500" />
                <Text style={styles.wasteText}>
                  Waste Detected: {analysis.waste.confidence > 0.7 ? 'Yes' : 'Uncertain'}
                </Text>
              </View>
            )}
            {analysis.quality && (
              <View style={styles.qualityInfo}>
                <FontAwesome5 name="image" size={14} color="#34C759" />
                <Text style={styles.qualityText}>
                  Image Quality: {analysis.quality.overall > 0.8 ? 'Excellent' : 
                                 analysis.quality.overall > 0.6 ? 'Good' : 'Fair'}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, style]}>
      {/* GPS Status */}
      {enableGPS && (
        <View style={styles.gpsStatus}>
          {getGPSStatusIcon()}
          <Text style={styles.gpsText}>
            {gpsStatus === 'success' ? 
              `GPS: ${gpsLocation?.latitude.toFixed(4)}, ${gpsLocation?.longitude.toFixed(4)}` :
              gpsStatus === 'error' ? 'GPS Unavailable' :
              gpsStatus === 'requesting' ? 'Getting GPS...' : 'GPS Not Ready'
            }
          </Text>
        </View>
      )}

      {/* Image Preview Grid */}
      <View style={styles.imageGrid}>
        {images.map((image) => (
          <View key={image.id} style={styles.imageContainer}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            
            {/* Upload Progress */}
            {uploadProgress[image.id] !== undefined && (
              <View style={styles.progressOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.progressText}>{uploadProgress[image.id]}%</Text>
              </View>
            )}

            {/* Remove Button */}
            {!uploading && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeImage(image.id)}
              >
                <MaterialIcons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            )}

            {/* GPS Indicator */}
            {image.gpsLocation && (
              <View style={styles.gpsIndicator}>
                <MaterialIcons name="gps-fixed" size={12} color="#4CAF50" />
              </View>
            )}
          </View>
        ))}

        {/* Add Photo Button */}
        {images.length < maxPhotos && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={pickImage}
            disabled={uploading}
          >
            <MaterialIcons 
              name="add-a-photo" 
              size={32} 
              color={uploading ? "#9E9E9E" : "#007AFF"} 
            />
            <Text style={[styles.addButtonText, { color: uploading ? "#9E9E9E" : "#007AFF" }]}>
              Add {type === 'avatar' ? 'Avatar' : 'Photo'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Upload Button (for multiple images) */}
      {maxPhotos > 1 && images.length > 0 && (
        <TouchableOpacity 
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={() => uploadImages()}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <MaterialIcons name="cloud-upload" size={20} color="#FFF" />
          )}
          <Text style={styles.uploadButtonText}>
            {uploading ? 'Uploading...' : `Upload ${images.length} Photo(s)`}
          </Text>
        </TouchableOpacity>
      )}

      {/* AI Analysis Results */}
      {renderAnalysisResults()}

      {/* Feature Info */}
      <View style={styles.featureInfo}>
        <Text style={styles.featureTitle}>Enhanced Features:</Text>
        <View style={styles.featureList}>
          {enableGPS && (
            <View style={styles.featureItem}>
              <MaterialIcons name="gps-fixed" size={14} color="#4CAF50" />
              <Text style={styles.featureText}>GPS Metadata</Text>
            </View>
          )}
          {enableAIAnalysis && (
            <View style={styles.featureItem}>
              <FontAwesome5 name="brain" size={14} color="#007AFF" />
              <Text style={styles.featureText}>AI Analysis</Text>
            </View>
          )}
          <View style={styles.featureItem}>
            <MaterialIcons name="cloud" size={14} color="#9C27B0" />
            <Text style={styles.featureText}>Cloud Sync</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  gpsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: (screenWidth - 48) / 2,
    height: (screenWidth - 48) / 2,
    marginBottom: 16,
    borderRadius: 8,
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 10,
    padding: 4,
  },
  addButton: {
    width: (screenWidth - 48) / 2,
    height: (screenWidth - 48) / 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginvertical: 16,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  analysisContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  analysisItem: {
    marginBottom: 8,
  },
  impactScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  impactText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  wasteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wasteText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
  },
  qualityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 8,
  },
  featureInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 4,
  },
});

export default EnhancedImageUploader;