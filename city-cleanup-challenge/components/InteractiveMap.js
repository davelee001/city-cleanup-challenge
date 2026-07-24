import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const InteractiveMap = ({ theme }) => {
  const locations = [
    { id: 1, name: 'Juba Central', lat: 4.8594, lng: 31.5713, status: 'Active' },
    { id: 2, name: 'Munuki', lat: 4.8462, lng: 31.5511, status: 'Active' },
    { id: 3, name: 'Kator', lat: 4.8376, lng: 31.5768, status: 'Review' },
    { id: 4, name: 'Gudele', lat: 4.8731, lng: 31.5254, status: 'Scheduled' },
  ];

  return (
    <View style={[styles.container, theme.card]}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>⌖</Text>
        <Text style={[styles.mapText, theme.text]}>Community cleanup coverage</Text>
        <Text style={[styles.mapSubtext, theme.text]}>Verified and scheduled activity by location</Text>
      </View>
      
      <View style={styles.locationsList}>
        <Text style={[styles.listTitle, theme.text]}>Active locations</Text>
        {locations.map((loc) => (
          <View key={loc.id} style={[styles.locationItem, theme.card]}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={[styles.locationName, theme.text]}>{loc.name}</Text>
              <Text style={[styles.locationCoords, theme.text]}>
                {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
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
    Active: { color: '#72D7CA', backgroundColor: '#123B3D' },
    Review: { color: '#F5D67A', backgroundColor: '#3A321A' },
    Scheduled: { color: '#8DBDFF', backgroundColor: '#153755' },
  };
  return colors[status] || colors.Active;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#091B30',
    borderBottomWidth: 1,
    borderBottomColor: '#244B70',
  },
  mapIcon: { color: '#61D6C6', fontSize: 30, marginBottom: 10 },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  mapSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
  locationsList: {
    paddingTop: 17,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 11,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#315574',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#61D6C6',
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
    borderRadius: 999,
  },
});

export default InteractiveMap;
