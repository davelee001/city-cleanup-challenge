import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';

const DataExport = ({ onExport, theme }) => {
  const exportFormats = [
    { format: 'pdf', label: '📄 PDF', icon: '📄' },
    { format: 'excel', label: '📊 Excel', icon: '📊' },
    { format: 'csv', label: '📋 CSV', icon: '📋' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.description, theme.text]}>
        Download your data in your preferred format:
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

      <View style={[styles.infoBox, { backgroundColor: '#e8f5e9' }]}>
        <Text style={[styles.infoText, { color: '#2e7d32' }]}>
          ✓ All data exported with timestamps and metadata
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exportButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  buttonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default DataExport;
