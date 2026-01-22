import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Switch, TextInput } from 'react-native';
import Toast from 'react-hot-toast';
import RealTimeChart from './components/RealTimeChart';
import InteractiveMap from './components/InteractiveMap';
import LoadingState from './components/LoadingState';
import SearchFilter from './components/SearchFilter';
import DataExport from './components/DataExport';

const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [chartData, setChartData] = useState(null);

  const theme = darkMode ? styles.darkTheme : styles.lightTheme;

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update chart data
      setChartData(prev => ({
        ...prev,
        timestamp: new Date()
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = (format) => {
    setLoading(true);
    setTimeout(() => {
      Toast.success(`Data exported as ${format.toUpperCase()}!`);
      setLoading(false);
    }, 1000);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    Toast.success(`Searching for: ${query}`);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    Toast.success('Filters applied!');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    Toast.success(`${!darkMode ? 'Dark' : 'Light'} mode enabled!`);
  };

  return (
    <ScrollView style={[styles.container, theme.container]}>
      {/* Header with Dark Mode Toggle */}
      <View style={[styles.header, theme.header]}>
        <Text style={[styles.title, theme.text]}>Dashboard</Text>
        <View style={styles.themeToggle}>
          <Text style={[theme.text, { marginRight: 10 }]}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
          />
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.section}>
        <SearchFilter
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          theme={theme}
        />
      </View>

      {/* Loading State */}
      {loading && <LoadingState theme={theme} />}

      {/* Real-time Charts */}
      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, theme.text]}>Real-time Analytics</Text>
        <RealTimeChart theme={theme} />
      </View>

      {/* Interactive Map */}
      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, theme.text]}>Oil Field Locations</Text>
        <InteractiveMap theme={theme} />
      </View>

      {/* Data Export */}
      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, theme.text]}>Export Data</Text>
        <DataExport onExport={handleExport} theme={theme} />
      </View>

      {/* Offline Mode Indicator */}
      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, theme.text]}>Status</Text>
        <Text style={[theme.text]}>✓ Online - All features available</Text>
        <Text style={[styles.offlineHint, theme.text]}>PWA installed - Works offline too!</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  offlineHint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  lightTheme: {
    container: { backgroundColor: '#f5f5f5' },
    header: { backgroundColor: '#fff', borderBottomColor: '#e0e0e0' },
    card: { backgroundColor: '#fff', borderColor: '#e0e0e0' },
    text: { color: '#000' },
  },
  darkTheme: {
    container: { backgroundColor: '#1e1e1e' },
    header: { backgroundColor: '#2d2d2d', borderBottomColor: '#444' },
    card: { backgroundColor: '#2d2d2d', borderColor: '#444' },
    text: { color: '#fff' },
  },
});

export default Dashboard;
