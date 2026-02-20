import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, ActivityIndicator } from 'react-native';

const ImageUploader = ({ 
  onImageUploaded, 
  uploadType = 'avatar', 
  currentImageUrl = null, 
  username,
  eventId = null,
  style = {},
  placeholder = 'Choose Image'
}) => {
  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState(currentImageUrl);

  // Platform-specific image picker (simplified for React Native Web)
  const pickImage = () => {
    // Create file input element for web
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleImagePicked(e.target.files[0]);
    input.click();
  };

  const handleImagePicked = async (file) => {
    if (!file) return;

    try {
      setUploading(true);
      await uploadImage(file);
    } catch (error) {
      Alert.alert('Upload Error', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append(getFieldName(), file);
    formData.append('username', username);
    
    if (eventId) {
      formData.append('eventId', eventId);
    }

    const endpoint = getUploadEndpoint();
    
    const response = await fetch(`http://localhost:3001/api/v1${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Upload failed');
    }

    // Update local image display
    const newImageUrl = result.avatarUrl || result.photos?.beforePhoto || result.photos?.afterPhoto;
    if (newImageUrl) {
      setImageUri(newImageUrl);
    }

    // Notify parent component
    if (onImageUploaded) {
      onImageUploaded(result);
    }

    return result;
  };

  const getFieldName = () => {
    switch (uploadType) {
      case 'avatar': return 'avatar';
      case 'beforePhoto': return 'beforePhoto';
      case 'afterPhoto': return 'afterPhoto';
      case 'eventPhoto': return 'photos';
      default: return 'image';
    }
  };

  const getUploadEndpoint = () => {
    switch (uploadType) {
      case 'avatar': return '/upload/avatar';
      case 'beforePhoto':
      case 'afterPhoto': return `/upload/progress/${eventId}`;
      case 'eventPhoto': return `/upload/event/${eventId}`;
      default: return '/upload/avatar';
    }
  };

  const renderImagePreview = () => {
    if (imageUri) {
      return (
        <Image 
          source={{ uri: imageUri }} 
          style={styles.imagePreview}
          resizeMode="cover"
        />
      );
    }
    
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📷</Text>
        <Text style={styles.placeholderLabel}>{placeholder}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={pickImage}
        disabled={uploading}
      >
        {renderImagePreview()}
        
        {uploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
      </TouchableOpacity>
      
      {uploading && (
        <Text style={styles.statusText}>Uploading image...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  uploadButton: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  imagePreview: {
    width: 120,
    height: 120,
  },
  placeholder: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: '#999',
    marginBottom: 4,
  },
  placeholderLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default ImageUploader;