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
          label: 'New',
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
                  backgroundColor: '#4CAF50',
                }
              ]}
            />
            <Text style={[styles.label, theme.text]}>{item.value}</Text>
            <Text style={[styles.xLabel, theme.text]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.info, theme.text]}>Updates every 3 seconds</Text>
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
    width: 30,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  xLabel: {
    fontSize: 10,
  },
  info: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default RealTimeChart;
