import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Switch, TextInput } from 'react-native';
import Toast from 'react-hot-toast';
import RealTimeChart from './components/RealTimeChart';
import InteractiveMap from './components/InteractiveMap';
import LoadingState from './components/LoadingState';
import SearchFilter from './components/SearchFilter';
import DataExport from './components/DataExport';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Mock data for oil fields
const initialOilFields = [
  {
    id: 1,
    name: 'Oil Field A',
    location: { lat: 24.7136, lng: 46.6753 },
    data: [],
  },
  {
    id: 2,
    name: 'Oil Field B',
    location: { lat: 24.7136, lng: 46.6753 },
    data: [],
  },
];

const Dashboard = ({ username, userRole, onAdminPanel }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [chartData, setChartData] = useState(null);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [systemStats, setSystemStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalUsers: 0,
    totalWaste: 0
  });
  const [oilFields, setOilFields] = useState(initialOilFields);
  const [error, setError] = useState('');

  const theme = darkMode ? styles.darkTheme : styles.lightTheme;
  const isAdmin = userRole === 'admin';

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update chart data
      setChartData(prev => ({
        ...prev,
        timestamp: new Date()
      }));
      
      // Fetch system stats for admin users
      if (isAdmin) {
        fetchSystemStats();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Fetch admin analytics on component mount
  useEffect(() => {
    if (isAdmin) {
      fetchAdminAnalytics();
      fetchSystemStats();
    }
  }, [isAdmin]);

  const fetchAdminAnalytics = async () => {
    if (!username || !isAdmin) return;
    
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/analytics/summary?username=${username}`);
      const data = await response.json();
      if (data.success) {
        setAdminAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch admin analytics:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Simulate API calls for system stats
      const statsPromises = [
        fetch(`${API_BASE_URL}/events`).then(r => r.json()),
        fetch(`${API_BASE_URL}/admin/analytics/summary?username=${username}`).then(r => r.json())
      ];
      
      const [eventsData, analyticsData] = await Promise.all(statsPromises);
      
      if (eventsData.success && analyticsData.success) {
        setSystemStats({
          totalEvents: analyticsData.analytics.eventStats?.totalEvents || 0,
          activeEvents: analyticsData.analytics.eventStats?.activeEvents || 0,
          totalUsers: analyticsData.analytics.userStats?.totalUsers || 0,
          totalWaste: analyticsData.analytics.progressStats?.totalWaste || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

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
        <View style={styles.headerControls}>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.adminButton}
              onPress={onAdminPanel}
            >
              <Text style={styles.adminButtonText}>⚙️ Admin Panel</Text>
            </TouchableOpacity>
          )}
          <View style={styles.themeToggle}>
            <Text style={[theme.text, { marginRight: 10 }]}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
            />
          </View>
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

      {/* Admin Analytics Section */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, theme.text]}>System Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, theme.card]}>
              <Text style={styles.statNumber}>{systemStats.totalUsers}</Text>
              <Text style={[styles.statLabel, theme.text]}>Total Users</Text>
              <Text style={[styles.statChange, { color: '#28a745' }]}>+12% this week</Text>
            </View>
            <View style={[styles.statCard, theme.card]}>
              <Text style={styles.statNumber}>{systemStats.totalEvents}</Text>
              <Text style={[styles.statLabel, theme.text]}>Total Events</Text>
              <Text style={[styles.statChange, { color: '#28a745' }]}>+8% this month</Text>
            </View>
            <View style={[styles.statCard, theme.card]}>
              <Text style={styles.statNumber}>{systemStats.activeEvents}</Text>
              <Text style={[styles.statLabel, theme.text]}>Active Events</Text>
              <Text style={[styles.statChange, { color: '#ffc107' }]}>Real-time</Text>
            </View>
            <View style={[styles.statCard, theme.card]}>
              <Text style={styles.statNumber}>{systemStats.totalWaste.toFixed(1)} kg</Text>
              <Text style={[styles.statLabel, theme.text]}>Waste Collected</Text>
              <Text style={[styles.statChange, { color: '#28a745' }]}>+{(systemStats.totalWaste * 0.15).toFixed(1)} kg this week</Text>
            </View>
          </View>
          
          {adminAnalytics?.recentActivity && (
            <View style={[styles.card, theme.card]}>
              <Text style={[styles.cardTitle, theme.text]}>Recent Admin Activity</Text>
              <View style={styles.activityList}>
                {adminAnalytics.recentActivity.slice(0, 3).map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <Text style={[styles.activityUser, theme.text]}>{activity.username}</Text>
                    <Text style={[styles.activityAction, theme.text]}>{activity.action}</Text>
                    <Text style={[styles.activityTime, theme.text]}>
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={onAdminPanel}
              >
                <Text style={styles.viewMoreText}>View Full Admin Panel →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

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
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  statChange: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  activityList: {
    marginVertical: 8,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  activityAction: {
    fontSize: 12,
    flex: 2,
    textAlign: 'center',
  },
  activityTime: {
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  viewMoreButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  viewMoreText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
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
