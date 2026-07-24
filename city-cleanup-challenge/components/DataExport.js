import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';

const DataExport = ({ onExport, theme }) => {
  const exportFormats = [
    { format: 'pdf', label: 'PDF', icon: 'PDF' },
    { format: 'excel', label: 'Excel', icon: 'XLS' },
    { format: 'csv', label: 'CSV', icon: 'CSV' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.description, theme.text]}>
        Download verified platform records in your preferred format.
      </Text>
      
      <View style={styles.buttonContainer}>
        {exportFormats.map((item) => (
          <TouchableOpacity
            key={item.format}
            onPress={() => onExport(item.format)}
            style={[styles.exportButton, theme.card]}
          >
            <Text style={styles.buttonIcon}>{item.icon}</Text>
            <Text style={[styles.buttonLabel, theme.text]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.infoBox, { backgroundColor: '#123B3D' }]}>
        <Text style={[styles.infoText, { color: '#72D7CA' }]}>
          ✓ Exports include timestamps and available verification metadata
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  exportButton: {
    flex: 1,
    alignItems: 'center',
    minWidth: 88,
    backgroundColor: '#091B30',
    padding: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#315574',
  },
  buttonIcon: {
    color: '#69B4FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBox: {
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#61D6C6',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default DataExport;
