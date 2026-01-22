import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const InteractiveMap = ({ theme }) => {
  const locations = [
    { id: 1, name: 'North Field', lat: 40.7128, lng: -74.0060, status: 'Active' },
    { id: 2, name: 'South Field', lat: 34.0522, lng: -118.2437, status: 'Operational' },
    { id: 3, name: 'East Field', lat: 41.8781, lng: -87.6298, status: 'Active' },
    { id: 4, name: 'West Field', lat: 47.6062, lng: -122.3321, status: 'Maintenance' },
  ];

  return (
    <View style={[styles.container, theme.card]}>
      <View style={styles.mapPlaceholder}>
        <Text style={[styles.mapText, theme.text]}>🗺️ Interactive Map</Text>
        <Text style={[styles.mapSubtext, theme.text]}>Oil Field Locations</Text>
      </View>
      
      <View style={styles.locationsList}>
        <Text style={[styles.listTitle, theme.text]}>Field Locations:</Text>
        {locations.map((loc) => (
          <View key={loc.id} style={[styles.locationItem, theme.card]}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={[styles.locationName, theme.text]}>{loc.name}</Text>
              <Text style={[styles.locationCoords, theme.text]}>
                📍 {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.statusBadge, getStatusColor(loc.status)]}>
              {loc.status}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const getStatusColor = (status) => {
  const colors = {
    Active: { color: '#4CAF50' },
    Operational: { color: '#2196F3' },
    Maintenance: { color: '#FF9800' },
  };
  return colors[status] || colors.Active;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderBottomWidth: 1,
    borderBottomColor: '#bbb',
  },
  mapText: {
    fontSize: 24,
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
  locationsList: {
    padding: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 11,
    opacity: 0.7,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});

export default InteractiveMap;
