import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const LoadingState = ({ theme }) => {
  return (
    <View style={[styles.container, theme.card]}>
      <View style={styles.skeletonLoader}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonLine}>
            <View style={[styles.skeleton, styles.skeleton1]} />
            <View style={[styles.skeleton, styles.skeleton2]} />
          </View>
        ))}
      </View>
      <Text style={[styles.loadingText, theme.text]}>Loading data...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  skeletonLoader: {
    marginBottom: 12,
  },
  skeletonLine: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 12,
  },
  skeleton1: {
    height: 40,
    flex: 2,
  },
  skeleton2: {
    height: 40,
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default LoadingState;
