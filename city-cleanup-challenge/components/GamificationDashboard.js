import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const GamificationDashboard = ({ username, onClose }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaderboards, setLeaderboards] = useState({});
  const [achievements, setAchievements] = useState([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchLeaderboards();
    fetchAchievements();
  }, [username]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/v1/gamification/dashboard/${username}`, {
        headers: {
          'Authorization': username,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.dashboard);
      } else {
        Alert.alert('Error', 'Failed to load gamification data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Network error while loading data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboards = async () => {
    try {
      const types = ['points', 'waste', 'streak', 'achievements'];
      const leaderboardPromises = types.map(async (type) => {
        const response = await fetch(`http://localhost:3000/api/v1/gamification/leaderboard?type=${type}&limit=10`);
        const result = await response.json();
        return { type, data: result.success ? result.leaderboard : [] };
      });

      const results = await Promise.all(leaderboardPromises);
      const leaderboardData = {};
      results.forEach(({ type, data }) => {
        leaderboardData[type] = data;
      });

      setLeaderboards(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    }
  };

  const fetchAchievements = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/v1/gamification/achievements/${username}`, {
        headers: {
          'Authorization': username,
        },
      });

      const result = await response.json();
      if (result.success) {
        setAchievements(result.achievements || []);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchLeaderboards(),
      fetchAchievements(),
    ]);
    setRefreshing(false);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getLevelProgress = (level) => {
    if (!level) return 0;
    return Math.min((level.currentPoints / (level.pointsToNext + level.currentPoints)) * 100, 100);
  };

  const renderOverviewTab = () => {
    const { userStats, currentLevel, streakInfo, environmentalImpact, recentAchievements } = dashboardData || {};

    return (
      <ScrollView style={styles.tabContent}>
        {/* Level Card */}
        <LinearGradient
          colors={['#4CAF50', '#8BC34A']}
          style={styles.levelCard}
        >
          <View style={styles.levelHeader}>
            <Text style={styles.levelTitle}>
              {currentLevel?.levelTitle || 'Eco Beginner'}
            </Text>
            <Text style={styles.levelNumber}>
              Level {currentLevel?.currentLevel || 1}
            </Text>
          </View>
          <View style={styles.levelProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getLevelProgress(currentLevel)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {currentLevel?.currentPoints || 0} / {currentLevel?.pointsToNext + (currentLevel?.currentPoints || 0) || 100} XP
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <Text style={styles.statNumber}>{formatNumber(userStats?.totalPoints || 0)}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.statNumber}>{streakInfo?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="leaf" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{formatNumber(environmentalImpact?.totalWasteCollected || 0)}</Text>
            <Text style={styles.statLabel}>kg Waste</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="medal" size={24} color="#9C27B0" />
            <Text style={styles.statNumber}>{userStats?.totalAchievements || 0}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {/* Environmental Impact */}
        <View style={styles.impactCard}>
          <Text style={styles.cardTitle}>Environmental Impact</Text>
          <View style={styles.impactRow}>
            <Ionicons name="cloud" size={20} color="#2196F3" />
            <Text style={styles.impactText}>
              {formatNumber(environmentalImpact?.totalCO2Saved || 0)} kg CO₂ saved
            </Text>
          </View>
          <View style={styles.impactRow}>
            <Ionicons name="water" size={20} color="#00BCD4" />
            <Text style={styles.impactText}>
              {formatNumber(environmentalImpact?.totalWaterSaved || 0)} L water saved
            </Text>
          </View>
          <View style={styles.impactRow}>
            <Ionicons name="flash" size={20} color="#FFC107" />
            <Text style={styles.impactText}>
              {formatNumber(environmentalImpact?.totalEnergySaved || 0)} kWh energy saved
            </Text>
          </View>
        </View>

        {/* Recent Achievements */}
        {recentAchievements && recentAchievements.length > 0 && (
          <View style={styles.achievementsCard}>
            <Text style={styles.cardTitle}>Recent Achievements</Text>
            {recentAchievements.map((achievement, index) => (
              <TouchableOpacity
                key={index}
                style={styles.achievementRow}
                onPress={() => {
                  setSelectedAchievement(achievement);
                  setShowAchievementModal(true);
                }}
              >
                <Text style={styles.achievementIcon}>{achievement.achievementIcon}</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{achievement.achievementName}</Text>
                  <Text style={styles.achievementPoints}>+{achievement.pointsAwarded} points</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderLeaderboardTab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        {Object.entries(leaderboards).map(([type, data]) => (
          <View key={type} style={styles.leaderboardCard}>
            <Text style={styles.cardTitle}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Leaders
            </Text>
            {data && data.length > 0 ? (
              data.slice(0, 5).map((entry, index) => (
                <View key={index} style={styles.leaderboardRow}>
                  <View style={styles.rankContainer}>
                    <Text style={styles.rank}>#{entry.rank}</Text>
                  </View>
                  <Text style={[
                    styles.username,
                    entry.username === username && styles.currentUser
                  ]}>
                    {entry.username}
                  </Text>
                  <Text style={styles.score}>{formatNumber(entry.score)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>No data available</Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderAchievementsTab = () => {
    const groupedAchievements = achievements.reduce((groups, achievement) => {
      const category = achievement.achievementCategory || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(achievement);
      return groups;
    }, {});

    return (
      <ScrollView style={styles.tabContent}>
        {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
          <View key={category} style={styles.achievementCategory}>
            <Text style={styles.categoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            <View style={styles.achievementGrid}>
              {categoryAchievements.map((achievement, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.achievementCard}
                  onPress={() => {
                    setSelectedAchievement(achievement);
                    setShowAchievementModal(true);
                  }}
                >
                  <Text style={styles.achievementCardIcon}>
                    {achievement.achievementIcon}
                  </Text>
                  <Text style={styles.achievementCardName}>
                    {achievement.achievementName}
                  </Text>
                  <Text style={styles.achievementCardDate}>
                    {new Date(achievement.earnedAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        {achievements.length === 0 && (
          <View style={styles.noAchievements}>
            <Ionicons name="medal-outline" size={64} color="#ccc" />
            <Text style={styles.noAchievementsText}>No achievements yet</Text>
            <Text style={styles.noAchievementsSubtext}>
              Participate in events to earn your first achievement!
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderAchievementModal = () => {
    return (
      <Modal
        visible={showAchievementModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAchievement && (
              <>
                <Text style={styles.modalIcon}>{selectedAchievement.achievementIcon}</Text>
                <Text style={styles.modalTitle}>{selectedAchievement.achievementName}</Text>
                <Text style={styles.modalDescription}>
                  {selectedAchievement.achievementDescription}
                </Text>
                <Text style={styles.modalPoints}>
                  +{selectedAchievement.pointsAwarded} points earned
                </Text>
                <Text style={styles.modalDate}>
                  Earned on {new Date(selectedAchievement.earnedAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowAchievementModal(false)}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gamification</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your achievements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#8BC34A']}
        style={styles.header}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gamification</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>
            Level {dashboardData?.currentLevel?.currentLevel || 1} • {formatNumber(dashboardData?.userStats?.totalPoints || 0)} XP
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="home" 
            size={20} 
            color={activeTab === 'overview' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'leaderboard' && styles.activeTab]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Ionicons 
            name="trophy" 
            size={20} 
            color={activeTab === 'leaderboard' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
            Leaderboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'achievements' && styles.activeTab]}
          onPress={() => setActiveTab('achievements')}
        >
          <Ionicons 
            name="medal" 
            size={20} 
            color={activeTab === 'achievements' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
            Achievements
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'leaderboard' && renderLeaderboardTab()}
        {activeTab === 'achievements' && renderAchievementsTab()}
      </ScrollView>

      {renderAchievementModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerStats: {
    marginTop: 10,
  },
  headerStatsText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  levelCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  levelNumber: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  levelProgress: {},
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 5,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  impactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  impactText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  achievementsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  achievementPoints: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rankContainer: {
    width: 40,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  currentUser: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  score: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  achievementCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  achievementCard: {
    width: (width - 60) / 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: 5,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementCardDate: {
    fontSize: 10,
    color: '#666',
  },
  noAchievements: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  noAchievementsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  noAchievementsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: width * 0.85,
    maxWidth: 300,
  },
  modalIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  modalDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GamificationDashboard;