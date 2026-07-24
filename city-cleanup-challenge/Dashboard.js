import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import Toast from 'react-hot-toast';
import RealTimeChart from './components/RealTimeChart';
import InteractiveMap from './components/InteractiveMap';
import LoadingState from './components/LoadingState';
import SearchFilter from './components/SearchFilter';
import DataExport from './components/DataExport';

import { API_BASE_URL, apiFetch } from './apiConfig';

const Dashboard = ({ username, userRole, onAdminPanel }) => {
  const [loading, setLoading] = useState(false);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [systemStats, setSystemStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalUsers: 0,
    totalWaste: 0
  });

  const theme = { card: styles.surface, text: styles.bodyText };
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!isAdmin) return undefined;
    const interval = setInterval(() => {
      fetchSystemStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminAnalytics();
      fetchSystemStats();
    }
  }, [isAdmin]);

  const fetchAdminAnalytics = async () => {
    if (!username || !isAdmin) return;
    try {
      const response = await apiFetch(`${API_BASE_URL}/admin/analytics/summary?username=${username}`);
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
        apiFetch(`${API_BASE_URL}/events`).then(r => r.json()),
        apiFetch(`${API_BASE_URL}/admin/analytics/summary?username=${username}`).then(r => r.json())
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
    if (query.trim()) Toast.success(`Searching for: ${query}`);
  };

  const handleFilterChange = (newFilters) => {
    if (newFilters.length) Toast.success('Filters applied');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>IMPACT INTELLIGENCE</Text>
          <Text style={styles.title}>Community impact</Text>
          <Text style={styles.subtitle}>
            Monitor cleanup activity, verification progress, and measurable outcomes.
          </Text>
        </View>
        {isAdmin ? (
          <TouchableOpacity style={styles.adminButton} onPress={onAdminPanel}>
            <Text style={styles.adminButtonText}>Admin workspace</Text>
            <Text style={styles.adminButtonArrow}>→</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.memberBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.memberBadgeText}>Live workspace</Text>
          </View>
        )}
      </View>

      <View style={styles.searchSection}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>EXPLORE</Text>
            <Text style={styles.sectionTitle}>Find cleanup records</Text>
          </View>
          <Text style={styles.sectionHint}>Search and filter activity across the platform</Text>
        </View>
        <SearchFilter
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          theme={theme}
        />
      </View>

      {loading && <LoadingState theme={theme} />}

      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>ADMIN OVERVIEW</Text>
              <Text style={styles.sectionTitle}>Platform performance</Text>
            </View>
            <Text style={styles.sectionHint}>Updated automatically every 30 seconds</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statKicker}>MEMBERS</Text>
              <Text style={styles.statNumber}>{systemStats.totalUsers}</Text>
              <Text style={styles.statLabel}>Registered users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statKicker}>EVENTS</Text>
              <Text style={styles.statNumber}>{systemStats.totalEvents}</Text>
              <Text style={styles.statLabel}>Cleanup events</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statKicker}>ACTIVE NOW</Text>
              <Text style={styles.statNumber}>{systemStats.activeEvents}</Text>
              <Text style={styles.statLabel}>Events in progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statKicker}>WASTE REMOVED</Text>
              <Text style={styles.statNumber}>{systemStats.totalWaste.toFixed(1)} kg</Text>
              <Text style={styles.statLabel}>Verified total</Text>
            </View>
          </View>
          
          {adminAnalytics?.recentActivity && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardEyebrow}>OPERATIONS</Text>
                  <Text style={styles.cardTitle}>Recent admin activity</Text>
                </View>
                <TouchableOpacity style={styles.textButton} onPress={onAdminPanel}>
                  <Text style={styles.textButtonText}>View all →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activityList}>
                {adminAnalytics.recentActivity.slice(0, 3).map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityAvatar}>
                      <Text style={styles.activityAvatarText}>
                        {String(activity.username || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.activityCopy}>
                      <Text style={styles.activityUser}>{activity.username}</Text>
                      <Text style={styles.activityAction}>{activity.action}</Text>
                    </View>
                    <Text style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardEyebrow}>ACTIVITY TREND</Text>
            <Text style={styles.cardTitle}>Cleanup momentum</Text>
            <Text style={styles.cardSubtitle}>A live view of recent platform activity.</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Live</Text>
          </View>
        </View>
        <RealTimeChart theme={theme} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardEyebrow}>LOCATION OVERVIEW</Text>
            <Text style={styles.cardTitle}>Cleanup activity map</Text>
            <Text style={styles.cardSubtitle}>See where community action is taking place.</Text>
          </View>
        </View>
        <InteractiveMap theme={theme} />
      </View>

      <View style={styles.bottomGrid}>
        <View style={[styles.card, styles.bottomCard]}>
          <Text style={styles.cardEyebrow}>REPORTING</Text>
          <Text style={styles.cardTitle}>Export impact data</Text>
          <Text style={styles.cardSubtitle}>Prepare records for review or reporting.</Text>
          <DataExport onExport={handleExport} theme={theme} />
        </View>
        <View style={[styles.card, styles.bottomCard]}>
          <Text style={styles.cardEyebrow}>SYSTEM STATUS</Text>
          <Text style={styles.cardTitle}>All services operational</Text>
          <View style={styles.systemStatus}>
            <View style={styles.statusCheck}><Text style={styles.statusCheckText}>✓</Text></View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>Connected and ready</Text>
              <Text style={styles.statusDescription}>
                Platform services and protected account access are available.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07182D' },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 56,
  },
  surface: {
    backgroundColor: '#0D243D',
    borderColor: '#244B70',
    borderWidth: 1,
  },
  bodyText: { color: '#D9E6F5' },
  header: {
    minHeight: 132,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    borderBottomColor: '#1C3855',
    borderBottomWidth: 1,
    marginBottom: 30,
    paddingVertical: 24,
  },
  headerCopy: { flex: 1, minWidth: 260 },
  eyebrow: { color: '#69B4FF', fontSize: 10, fontWeight: '700', letterSpacing: 1.7 },
  title: { color: '#F5F8FF', fontSize: 30, fontWeight: '600', letterSpacing: -0.5, marginTop: 8 },
  subtitle: { color: '#8FA5BC', fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 620 },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#2878E4',
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  adminButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  adminButtonArrow: { color: '#DDEBFF', fontSize: 16 },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D2C42',
    borderColor: '#285773',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  memberBadgeText: { color: '#B5CCE2', fontSize: 12, fontWeight: '600' },
  liveDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#61D6C6' },
  searchSection: { marginBottom: 30 },
  section: { marginBottom: 30 },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionEyebrow: { color: '#69B4FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  sectionTitle: { color: '#EDF5FF', fontSize: 20, fontWeight: '600', marginTop: 5 },
  sectionHint: { color: '#7189A2', fontSize: 12 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 190,
    backgroundColor: '#0D243D',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 15,
    padding: 18,
  },
  statKicker: { color: '#708AA5', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  statNumber: { color: '#F5F8FF', fontSize: 27, fontWeight: '600', marginTop: 11 },
  statLabel: { color: '#8298AF', fontSize: 12, marginTop: 5 },
  card: {
    backgroundColor: '#0D243D',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 18,
    padding: 22,
    shadowColor: '#020912',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  cardEyebrow: { color: '#69B4FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  cardTitle: { color: '#F0F6FF', fontSize: 18, fontWeight: '600', marginTop: 5 },
  cardSubtitle: { color: '#7890AA', fontSize: 12, lineHeight: 18, marginTop: 5 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#123B3D',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  liveBadgeText: { color: '#72D7CA', fontSize: 11, fontWeight: '700' },
  textButton: { paddingHorizontal: 4, paddingVertical: 5 },
  textButtonText: { color: '#8DBDFF', fontSize: 12, fontWeight: '600' },
  activityList: { marginTop: 2 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C3855',
    paddingVertical: 12,
  },
  activityAvatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#153B5D',
    borderRadius: 10,
  },
  activityAvatarText: { color: '#8EC5FF', fontSize: 13, fontWeight: '700' },
  activityCopy: { flex: 1 },
  activityUser: { color: '#E4EEF9', fontSize: 13, fontWeight: '600' },
  activityAction: { color: '#8298AF', fontSize: 11, marginTop: 3 },
  activityTime: { color: '#6F879E', fontSize: 10 },
  bottomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  bottomCard: { flexGrow: 1, minWidth: 280 },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#091B30',
    borderRadius: 13,
    marginTop: 20,
    padding: 15,
  },
  statusCheck: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123B3D',
    borderRadius: 11,
  },
  statusCheckText: { color: '#72D7CA', fontSize: 16, fontWeight: '700' },
  statusCopy: { flex: 1 },
  statusTitle: { color: '#DCE8F5', fontSize: 13, fontWeight: '600' },
  statusDescription: { color: '#7890AA', fontSize: 11, lineHeight: 17, marginTop: 4 },
});

export default Dashboard;
