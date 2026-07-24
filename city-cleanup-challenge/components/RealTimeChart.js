import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';

const RealTimeChart = ({ theme }) => {
  const [data, setData] = useState([
    { label: 'Jan', value: 65 },
    { label: 'Feb', value: 78 },
    { label: 'Mar', value: 72 },
    { label: 'Apr', value: 85 },
    { label: 'May', value: 92 },
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setData(prevData => [
        ...prevData.slice(1),
        {
          label: 'Now',
          value: Math.floor(Math.random() * 100)
        }
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simple bar chart visualization
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: (item.value / maxValue) * 150,
                  backgroundColor: index === data.length - 1 ? '#61D6C6' : '#367FC3',
                }
              ]}
            />
            <Text style={[styles.label, theme.text]}>{item.value}</Text>
            <Text style={[styles.xLabel, theme.text]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.updateNote}>
        <View style={styles.updateDot} />
        <Text style={[styles.info, theme.text]}>Live activity refreshes every 3 seconds</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 200,
    marginBottom: 12,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 28,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  xLabel: {
    fontSize: 10,
  },
  info: {
    color: '#7890AA',
    fontSize: 12,
  },
  updateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  updateDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#61D6C6' },
});

export default RealTimeChart;
