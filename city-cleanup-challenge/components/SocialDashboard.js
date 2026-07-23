import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCIAL_API_BASE_URL, apiFetch } from '../apiConfig';

const { width, height } = Dimensions.get('window');

const SocialDashboard = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('feed');
  const [user, setUser] = useState(null);
  const [socialData, setSocialData] = useState({
    feed: [],
    teams: [],
    challenges: [],
    friendChallenges: [],
    recognition: [],
    stats: {},
    notifications: [],
    spotlights: []
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('post');

  // Enhanced form states
  const [postForm, setPostForm] = useState({
    content: '',
    privacy_level: 'public',
    media_urls: [],
    mentions: [],
    poll_options: null
  });
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    team_type: 'public',
    max_members: 50,
    team_color: '#4CAF50',
    cleanup_focus: 'general',
    collaboration_tools: []
  });
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    challenge_type: 'individual',
    category: 'waste_collection',
    target_metric: 'waste_kg',
    target_value: '',
    reward_points: '',
    start_date: '',
    end_date: '',
    difficulty_level: 'medium'
  });
  const [friendChallengeForm, setFriendChallengeForm] = useState({
    title: '',
    description: '',
    challenge_type: 'competitive',
    target_metric: 'waste_kg',
    target_value: '',
    duration_days: 7,
    selected_friends: [],
    prize_description: ''
  });
  const [kudosForm, setKudosForm] = useState({
    recipient_id: '',
    kudos_type: 'general',
    category: 'helpful',
    message: '',
    visibility: 'public'
  });
  
  // Enhanced UI states
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [selectedReaction, setSelectedReaction] = useState('like');
  const [activeFilter, setActiveFilter] = useState('all'); // for feed filtering
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  useEffect(() => {
    loadUserData();
    loadSocialData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadSocialData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Enhanced social feed with personalized content
      const feedResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/feed?feed_type=personal&limit=20&sort_by=${activeFilter}`, {
      });
      const feedData = await feedResponse.json();

      // Load user teams
      const teamsResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/teams`, {
      });
      const teamsData = await teamsResponse.json();

      // Load active challenges
      const challengesResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/challenges`, {
      });
      const challengesData = await challengesResponse.json();

      // Load friend challenges
      const friendChallengesResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/user-active-challenges`, {
      });
      const friendChallengesData = await friendChallengesResponse.json();

      // Load community recognition
      const recognitionResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/recognition-summary/${user.id}`, {
      });
      const recognitionData = await recognitionResponse.json();

      // Load community spotlights
      const spotlightsResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/spotlights?limit=5`);
      const spotlightsData = await spotlightsResponse.json();

      // Load notifications
      const notificationsResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/notifications?limit=20`, {
      });
      const notificationsData = await notificationsResponse.json();

      // Load enhanced social stats
      const statsResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/user-stats/${user.id}`, {
      });
      const statsData = await statsResponse.json();

      setSocialData({
        feed: feedData.success ? feedData.posts : [],
        teams: teamsData.success ? teamsData.teams : [],
        challenges: challengesData.success ? challengesData.challenges : [],
        friendChallenges: friendChallengesData.success ? {
          friend_challenges: friendChallengesData.friend_challenges || [],
          group_challenges: friendChallengesData.group_challenges || []
        } : { friend_challenges: [], group_challenges: [] },
        recognition: recognitionData.success ? recognitionData.summary : {},
        spotlights: spotlightsData.success ? spotlightsData.spotlights : [],
        stats: statsData.success ? statsData.stats : {},
        notifications: notificationsData.success ? notificationsData.notifications : []
      });
    } catch (error) {
      console.error('Error loading social data:', error);
      Alert.alert('Error', 'Failed to load social data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSocialData();
    setRefreshing(false);
  };

  const handleLikePost = async (postId, reactionType = 'like') => {
    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reaction_type: reactionType })
      });

      const result = await response.json();
      if (result.success) {
        await loadSocialData(); // Refresh data to show updated reactions
      }
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleCreateFriendChallenge = async () => {
    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/friend-challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...friendChallengeForm,
          target_value: parseFloat(friendChallengeForm.target_value)
        })
      });

      const result = await response.json();
      if (result.success) {
        setModalVisible(false);
        setFriendChallengeForm({
          title: '', description: '', challenge_type: 'competitive',
          target_metric: 'waste_kg', target_value: '', duration_days: 7,
          selected_friends: [], prize_description: ''
        });
        await loadSocialData();
        Alert.alert('Success', 'Friend challenge created and invitations sent!');
      } else {
        Alert.alert('Error', result.message || 'Failed to create friend challenge');
      }
    } catch (error) {
      console.error('Error creating friend challenge:', error);
      Alert.alert('Error', 'Failed to create friend challenge');
    }
  };

  const handleGiveKudos = async (recipientId) => {
    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/kudos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          ...kudosForm
        })
      });

      const result = await response.json();
      if (result.success) {
        setKudosForm({
          recipient_id: '', kudos_type: 'general', category: 'helpful',
          message: '', visibility: 'public'
        });
        await loadSocialData();
        Alert.alert('Success', `Kudos given successfully! ${result.points_awarded} points awarded.`);
      } else {
        Alert.alert('Error', result.message || 'Failed to give kudos');
      }
    } catch (error) {
      console.error('Error giving kudos:', error);
      Alert.alert('Error', 'Failed to give kudos');
    }
  };

  const handleJoinFriendChallenge = async (challengeId, response) => {
    try {
      const apiResponse = await apiFetch(`${SOCIAL_API_BASE_URL}/friend-challenges/${challengeId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response })
      });

      const result = await apiResponse.json();
      if (result.success) {
        await loadSocialData();
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.message || 'Failed to respond to challenge');
      }
    } catch (error) {
      console.error('Error responding to challenge:', error);
      Alert.alert('Error', 'Failed to respond to challenge');
    }
  };

  const handleSharePost = async (postId, shareType = 'share', customMessage = '') => {
    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          share_type: shareType,
          custom_message: customMessage
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadSocialData();
        Alert.alert('Success', 'Post shared successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to share post');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const handleJoinTeam = async (teamId) => {
    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/teams/${teamId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Join request sent!');
        loadSocialData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error joining team:', error);
    }
  };

  const handleJoinChallenge = async (challengeId) => {
    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Successfully joined challenge!');
        loadSocialData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const createPost = async () => {
    if (!postForm.content.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }

    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: postForm.content,
          post_type: 'text',
          privacy_level: postForm.privacy_level,
          tags: ['cleanup', 'environment']
        })
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Post created successfully!');
        setModalVisible(false);
        setPostForm({ content: '', privacy_level: 'public', media_urls: [] });
        loadSocialData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const createTeam = async () => {
    if (!teamForm.name.trim() || !teamForm.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamForm)
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Team created successfully!');
        setModalVisible(false);
        setTeamForm({
          name: '', description: '', team_type: 'public',
          max_members: 50, team_color: '#4CAF50'
        });
        loadSocialData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const createChallenge = async () => {
    if (!challengeForm.title.trim() || !challengeForm.target_value) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await apiFetch(`${SOCIAL_API_BASE_URL}/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...challengeForm,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Challenge created successfully!');
        setModalVisible(false);
        setChallengeForm({
          title: '', description: '', challenge_type: 'individual',
          category: 'waste_collection', target_metric: 'waste_kg',
          target_value: '', reward_points: '', difficulty_level: 'medium'
        });
        loadSocialData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error creating challenge:', error);
    }
  };

  const renderPostItem = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.postTime}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {item.team_name && (
          <View style={styles.teamBadge}>
            <Text style={styles.teamName}>{item.team_name}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.postContent}>{item.content}</Text>
      
      {item.event_title && (
        <View style={styles.eventTag}>
          <Ionicons name="calendar" size={16} color="#4CAF50" />
          <Text style={styles.eventTitle}>{item.event_title}</Text>
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity 
          style={[styles.actionButton, item.user_reaction ? styles.activeAction : null]}
          onPress={() => handleLikePost(item.id, item.user_reaction ? 'unlike' : 'like')}
        >
          <Ionicons 
            name={item.user_reaction ? "heart" : "heart-outline"} 
            size={20} 
            color={item.user_reaction ? "#FF6B6B" : "#666"} 
          />
          <Text style={styles.actionText}>{item.like_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{item.comment_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleSharePost(item.id)}
        >
          <Ionicons name="share-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{item.share_count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTeamItem = ({ item }) => (
    <View style={styles.teamCard}>
      <View style={styles.teamHeader}>
        <View style={[styles.teamColorStripe, { backgroundColor: item.team_color }]} />
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{item.name}</Text>
          <Text style={styles.teamDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.teamStats}>
            <Text style={styles.teamStat}>
              {item.current_members}/{item.max_members} members
            </Text>
            <Text style={styles.teamStat}>
              {item.total_events} events
            </Text>
            <Text style={styles.teamStat}>
              {item.total_waste_collected}kg collected
            </Text>
          </View>
        </View>
      </View>
      
      {item.role ? (
        <View style={[styles.roleTag, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => handleJoinTeam(item.id)}
        >
          <Text style={styles.joinButtonText}>Join Team</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderChallengeItem = ({ item }) => (
    <View style={styles.challengeCard}>
      <LinearGradient
        colors={getDifficultyGradient(item.difficulty_level)}
        style={styles.challengeGradient}
      >
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeTitle}>{item.title}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty_level) }]}>
            <Text style={styles.difficultyText}>{item.difficulty_level.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.challengeDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.challengeDetails}>
          <View style={styles.challengeMetric}>
            <Text style={styles.metricLabel}>Target</Text>
            <Text style={styles.metricValue}>
              {item.target_value} {item.target_metric.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.challengeMetric}>
            <Text style={styles.metricLabel}>Reward</Text>
            <Text style={styles.metricValue}>{item.reward_points} pts</Text>
          </View>
          <View style={styles.challengeMetric}>
            <Text style={styles.metricLabel}>Participants</Text>
            <Text style={styles.metricValue}>{item.participant_count}</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${item.progress_percentage || 0}%` }
            ]} 
          />
        </View>

        {!item.is_participating && (
          <TouchableOpacity
            style={styles.challengeJoinButton}
            onPress={() => handleJoinChallenge(item.id)}
          >
            <Text style={styles.challengeJoinText}>Join Challenge</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  const renderRecognitionItem = ({ item }) => (
    <View style={styles.recognitionCard}>
      <View style={styles.recognitionHeader}>
        <Image
          source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
          style={styles.recognitionAvatar}
        />
        <View style={styles.recognitionInfo}>
          <Text style={styles.recognitionTitle}>{item.title}</Text>
          <Text style={styles.recognitionRecipient}>{item.username}</Text>
          <Text style={styles.recognitionType}>
            {item.recognition_type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <View style={styles.recognitionBadge}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
        </View>
      </View>
      <Text style={styles.recognitionDescription}>{item.description}</Text>
      {item.month && item.year && (
        <Text style={styles.recognitionDate}>
          {getMonthName(item.month)} {item.year}
        </Text>
      )}
    </View>
  );

  const getRoleColor = (role) => {
    const colors = {
      owner: '#FF6B6B',
      admin: '#4ECDC4',
      moderator: '#45B7D1',
      member: '#96CEB4'
    };
    return colors[role] || '#96CEB4';
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: '#96CEB4',
      medium: '#FECA57',
      hard: '#FF9FF3',
      extreme: '#FF6B6B'
    };
    return colors[difficulty] || '#96CEB4';
  };

  const getDifficultyGradient = (difficulty) => {
    const gradients = {
      easy: ['#96CEB4', '#FFEAA7'],
      medium: ['#FECA57', '#FF7675'],
      hard: ['#FF9FF3', '#A29BFE'],
      extreme: ['#FF6B6B', '#EE5A6F']
    };
    return gradients[difficulty] || ['#96CEB4', '#FFEAA7'];
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <FlatList
            data={socialData.feed}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        );
      case 'teams':
        return (
          <FlatList
            data={socialData.teams}
            renderItem={renderTeamItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        );
      case 'challenges':
        return (
          <FlatList
            data={socialData.challenges}
            renderItem={renderChallengeItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        );
      case 'friendChallenges':
        return (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Friend Challenges Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Friend Challenges</Text>
              {socialData.friendChallenges && socialData.friendChallenges.length > 0 ? (
                <View>
                  {socialData.friendChallenges.map((item) => (
                    <View key={item.id} style={styles.challengeCard}>
                      <View style={styles.challengeHeader}>
                        <Text style={styles.challengeTitle}>{item.title}</Text>
                        <Text style={[styles.challengeStatus, 
                          item.status === 'active' ? styles.statusActive :
                          item.status === 'completed' ? styles.statusCompleted : styles.statusPending
                        ]}>
                          {item.status}
                        </Text>
                      </View>
                      
                      <Text style={styles.challengeDescription}>{item.description}</Text>
                      
                      <View style={styles.challengeMetrics}>
                        <Text style={styles.challengeMetric}>
                          Target: {item.target_value} {item.target_metric.replace('_', ' ')}
                        </Text>
                        <Text style={styles.challengeMetric}>
                          Duration: {item.duration_days} days
                        </Text>
                      </View>

                      {item.participants && item.participants.length > 0 && (
                        <View style={styles.participantsList}>
                          <Text style={styles.participantsTitle}>Participants:</Text>
                          {item.participants.map(participant => (
                            <View key={participant.user_id} style={styles.participantCard}>
                              <Text style={styles.participantName}>{participant.username}</Text>
                              <Text style={styles.participantProgress}>
                                Progress: {participant.current_value}/{item.target_value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {item.status === 'pending' && item.user_id !== user.id && (
                        <View style={styles.challengeActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleJoinFriendChallenge(item.id, 'accepted')}
                          >
                            <Text style={styles.actionButtonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={() => handleJoinFriendChallenge(item.id, 'declined')}
                          >
                            <Text style={styles.actionButtonText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No friend challenges yet. Create one to challenge your friends!</Text>
              )}
            </View>

            {/* Community Recognition Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Community Recognition</Text>
              
              {/* Recent Kudos */}
              {socialData.recentKudos && socialData.recentKudos.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Recent Kudos</Text>
                  <FlatList
                    data={socialData.recentKudos}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                      <View style={styles.kudosCard}>
                        <View style={styles.kudosHeader}>
                          <Text style={styles.kudosGiver}>
                            {item.giver_username} gave kudos to {item.recipient_username}
                          </Text>
                          <Text style={styles.kudosType}>{item.kudos_type}</Text>
                        </View>
                        <Text style={styles.kudosMessage}>{item.message}</Text>
                        <Text style={styles.kudosCategory}>Category: {item.category}</Text>
                      </View>
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              )}

              {/* Community Badges */}
              {socialData.communityBadges && socialData.communityBadges.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Community Badges</Text>
                  <FlatList
                    data={socialData.communityBadges}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                      <View style={styles.badgeCard}>
                        <Text style={styles.badgeTitle}>{item.badge_name}</Text>
                        <Text style={styles.badgeRecipient}>
                          Awarded to: {item.recipient_username}
                        </Text>
                        <Text style={styles.badgeDescription}>{item.description}</Text>
                        <Text style={styles.badgeDate}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        );
      case 'recognition':
        return (
          <FlatList
            data={socialData.recognition}
            renderItem={renderRecognitionItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return null;
    }
  };

  const renderModal = () => {
    if (modalType === 'post') {
      return (
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={createPost}>
                <Text style={styles.modalSubmit}>Post</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.textArea}
                placeholder="What's happening in your environmental journey?"
                multiline
                numberOfLines={6}
                value={postForm.content}
                onChangeText={(text) => setPostForm({ ...postForm, content: text })}
              />
              
              <View style={styles.privacySelector}>
                <Text style={styles.selectorLabel}>Privacy:</Text>
                <View style={styles.privacyOptions}>
                  {['public', 'team', 'friends'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.privacyOption,
                        postForm.privacy_level === option && styles.selectedOption
                      ]}
                      onPress={() => setPostForm({ ...postForm, privacy_level: option })}
                    >
                      <Text style={styles.privacyOptionText}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      );
    }

    if (modalType === 'team') {
      return (
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Team</Text>
              <TouchableOpacity onPress={createTeam}>
                <Text style={styles.modalSubmit}>Create</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.inputField}
                placeholder="Team Name"
                value={teamForm.name}
                onChangeText={(text) => setTeamForm({ ...teamForm, name: text })}
              />
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder="Team Description"
                multiline
                numberOfLines={4}
                value={teamForm.description}
                onChangeText={(text) => setTeamForm({ ...teamForm, description: text })}
              />
              
              <View style={styles.teamTypeSelector}>
                <Text style={styles.selectorLabel}>Team Type:</Text>
                <View style={styles.teamTypeOptions}>
                  {['public', 'private', 'invite_only'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.teamTypeOption,
                        teamForm.team_type === option && styles.selectedOption
                      ]}
                      onPress={() => setTeamForm({ ...teamForm, team_type: option })}
                    >
                      <Text style={styles.teamTypeOptionText}>
                        {option.replace('_', ' ').charAt(0).toUpperCase() + option.replace('_', ' ').slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={styles.inputField}
                placeholder="Max Members (default: 50)"
                keyboardType="numeric"
                value={teamForm.max_members.toString()}
                onChangeText={(text) => setTeamForm({ ...teamForm, max_members: parseInt(text) || 50 })}
              />
            </ScrollView>
          </View>
        </Modal>
      );
    }

    if (modalType === 'challenge') {
      return (
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Challenge</Text>
              <TouchableOpacity onPress={createChallenge}>
                <Text style={styles.modalSubmit}>Create</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.inputField}
                placeholder="Challenge Title"
                value={challengeForm.title}
                onChangeText={(text) => setChallengeForm({ ...challengeForm, title: text })}
              />
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder="Challenge Description"
                multiline
                numberOfLines={4}
                value={challengeForm.description}
                onChangeText={(text) => setChallengeForm({ ...challengeForm, description: text })}
              />

              <View style={styles.challengeOptions}>
                <View style={styles.optionGroup}>
                  <Text style={styles.selectorLabel}>Category:</Text>
                  <View style={styles.categoryOptions}>
                    {['waste_collection', 'participation', 'photo_upload'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.categoryOption,
                          challengeForm.category === option && styles.selectedOption
                        ]}
                        onPress={() => setChallengeForm({ ...challengeForm, category: option })}
                      >
                        <Text style={styles.categoryOptionText}>
                          {option.replace('_', ' ').charAt(0).toUpperCase() + option.replace('_', ' ').slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.optionGroup}>
                  <Text style={styles.selectorLabel}>Difficulty:</Text>
                  <View style={styles.difficultyOptions}>
                    {['easy', 'medium', 'hard', 'extreme'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.difficultyOption,
                          { backgroundColor: getDifficultyColor(option) },
                          challengeForm.difficulty_level === option && styles.selectedDifficultyOption
                        ]}
                        onPress={() => setChallengeForm({ ...challengeForm, difficulty_level: option })}
                      >
                        <Text style={styles.difficultyOptionText}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.targetGroup}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Target Value"
                  keyboardType="numeric"
                  value={challengeForm.target_value}
                  onChangeText={(text) => setChallengeForm({ ...challengeForm, target_value: text })}
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="Reward Points"
                  keyboardType="numeric"
                  value={challengeForm.reward_points}
                  onChangeText={(text) => setChallengeForm({ ...challengeForm, reward_points: text })}
                />
              </View>
            </ScrollView>
          </View>
        </Modal>
      );
    }

    if (modalType === 'friendChallenge') {
      return (
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Friend Challenge</Text>
              <TouchableOpacity onPress={handleCreateFriendChallenge}>
                <Text style={styles.modalSubmit}>Create</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.inputField}
                placeholder="Challenge Title"
                value={friendChallengeForm.title}
                onChangeText={(text) => setFriendChallengeForm({ ...friendChallengeForm, title: text })}
              />
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder="Challenge Description"
                multiline
                numberOfLines={4}
                value={friendChallengeForm.description}
                onChangeText={(text) => setFriendChallengeForm({ ...friendChallengeForm, description: text })}
              />

              <View style={styles.challengeOptions}>
                <View style={styles.optionGroup}>
                  <Text style={styles.selectorLabel}>Challenge Type:</Text>
                  <View style={styles.typeOptions}>
                    {['competitive', 'collaborative', 'learning'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.typeOption,
                          friendChallengeForm.challenge_type === option && styles.selectedOption
                        ]}
                        onPress={() => setFriendChallengeForm({ ...friendChallengeForm, challenge_type: option })}
                      >
                        <Text style={styles.typeOptionText}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.optionGroup}>
                  <Text style={styles.selectorLabel}>Target Metric:</Text>
                  <View style={styles.metricOptions}>
                    {['waste_kg', 'participation_days', 'photos_uploaded', 'events_attended'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.metricOption,
                          friendChallengeForm.target_metric === option && styles.selectedOption
                        ]}
                        onPress={() => setFriendChallengeForm({ ...friendChallengeForm, target_metric: option })}
                      >
                        <Text style={styles.metricOptionText}>
                          {option.replace('_', ' ').charAt(0).toUpperCase() + option.replace('_', ' ').slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TextInput
                style={styles.inputField}
                placeholder="Target Value"
                value={friendChallengeForm.target_value}
                onChangeText={(text) => setFriendChallengeForm({ ...friendChallengeForm, target_value: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.inputField}
                placeholder="Duration (days)"
                value={friendChallengeForm.duration_days.toString()}
                onChangeText={(text) => setFriendChallengeForm({ ...friendChallengeForm, duration_days: parseInt(text) || 7 })}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.inputField}
                placeholder="Prize Description (optional)"
                value={friendChallengeForm.prize_description}
                onChangeText={(text) => setFriendChallengeForm({ ...friendChallengeForm, prize_description: text })}
              />
            </ScrollView>
          </View>
        </Modal>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header with Stats */}
      <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{socialData.stats.posts_count || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{socialData.stats.teams_count || 0}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{socialData.stats.challenges_active || 0}</Text>
            <Text style={styles.statLabel}>Challenges</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{socialData.stats.followers_count || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'feed', label: 'Feed', icon: 'newspaper-outline' },
          { key: 'teams', label: 'Teams', icon: 'people-outline' },
          { key: 'challenges', label: 'Challenges', icon: 'trophy-outline' },
          { key: 'friendChallenges', label: 'Friends', icon: 'heart-outline' },
          { key: 'recognition', label: 'Recognition', icon: 'star-outline' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? '#4CAF50' : '#666'}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (activeTab === 'feed') {
            setModalType('post');
          } else if (activeTab === 'teams') {
            setModalType('team');
          } else if (activeTab === 'challenges') {
            setModalType('challenge');
          } else if (activeTab === 'friendChallenges') {
            setModalType('friendChallenge');
          }
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07182D',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    minWidth: width * 0.2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#10243E',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabLabel: {
    fontSize: 12,
    color: '#AFC0D4',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  
  // Post styles
  postCard: {
    backgroundColor: '#10243E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
  },
  postTime: {
    color: '#AFC0D4',
    fontSize: 12,
  },
  teamBadge: {
    backgroundColor: '#123B3D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teamName: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  eventTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#142F4D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  eventTitle: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 5,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  activeAction: {
    backgroundColor: '#3D1C29',
  },
  actionText: {
    color: '#AFC0D4',
    fontSize: 12,
    marginLeft: 5,
  },

  // Team styles
  teamCard: {
    backgroundColor: '#10243E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  teamColorStripe: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamDescription: {
    color: '#AFC0D4',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamStat: {
    fontSize: 11,
    color: '#8EA4BC',
  },
  roleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  roleText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Challenge styles
  challengeCard: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  challengeGradient: {
    padding: 15,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  challengeDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 12,
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  challengeMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10243E',
    borderRadius: 3,
  },
  challengeJoinButton: {
    
  // Friend Challenge Styles
  section: {
    margin: 15,
    backgroundColor: '#10243E',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EAF2FF',
    marginBottom: 15,
  },
  subsection: {
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8C7D9',
    marginBottom: 10,
  },
  challengeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#FF6B6B',
  },
  statusActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  statusCompleted: {
    color: '#2196F3',
    fontWeight: '600',
  },
  statusPending: {
    color: '#FF9800',
    fontWeight: '600',
  },
  participantsList: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#0B1E36',
    borderRadius: 8,
  },
  participantsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAF2FF',
    marginBottom: 5,
  },
  participantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  participantName: {
    fontSize: 14,
    color: '#EAF2FF',
    fontWeight: '500',
  },
  participantProgress: {
    fontSize: 12,
    color: '#AFC0D4',
  },
  challengeStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  challengeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  challengeMetric: {
    fontSize: 12,
    color: '#AFC0D4',
  },
  noDataText: {
    textAlign: 'center',
    color: '#7890AA',
    fontStyle: 'italic',
    padding: 20,
  },
  // Community Recognition Styles
  kudosCard: {
    backgroundColor: '#3A321A',
    borderRadius: 8,
    padding: 12,
    marginRight: 15,
    minWidth: 250,
    borderLeft: 4, borderLeftColor: '#ffc107',
  },
  kudosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  kudosGiver: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EAF2FF',
    flex: 1,
  },
  kudosType: {
    fontSize: 10,
    color: '#ffc107',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  kudosMessage: {
    fontSize: 14,
    color: '#EAF2FF',
    marginBottom: 5,
  },
  kudosCategory: {
    fontSize: 10,
    color: '#AFC0D4',
    textTransform: 'capitalize',
  },
  badgeCard: {
    backgroundColor: '#123B3D',
    borderRadius: 8,
    padding: 12,
    marginRight: 15,
    minWidth: 200,
    borderLeft: 4,
    borderLeftColor: '#4CAF50',
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 5,
  },
  badgeRecipient: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EAF2FF',
    marginBottom: 3,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#AFC0D4',
    marginBottom: 5,
  },
  badgeDate: {
    fontSize: 10,
    color: '#7890AA',
  },
  // Form Options Styles
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#132A46',
    marginRight: 10,
    marginBottom: 10,
  },
  typeOptionText: {
    fontSize: 12,
    color: '#AFC0D4',
  },
  metricOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#132A46',
    marginRight: 10,
    marginBottom: 10,
  },
  metricOptionText: {
    fontSize: 12,
    color: '#AFC0D4',
  },
  challengeOptions: {
    marginVertical: 15,
  },
  optionGroup: {
    marginBottom: 15,
  },backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  challengeJoinText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Recognition styles
  recognitionCard: {
    backgroundColor: '#10243E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recognitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recognitionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  recognitionInfo: {
    flex: 1,
  },
  recognitionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EAF2FF',
  },
  recognitionRecipient: {
    fontSize: 13,
    color: '#AFC0D4',
    marginTop: 2,
  },
  recognitionType: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  recognitionBadge: {
    backgroundColor: '#3A321A',
    padding: 8,
    borderRadius: 20,
  },
  recognitionDescription: {
    fontSize: 13,
    color: '#B8C7D9',
    lineHeight: 18,
    marginBottom: 8,
  },
  recognitionDate: {
    fontSize: 11,
    color: '#8EA4BC',
    fontStyle: 'italic',
  },

  // FAB styles
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#4CAF50',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#10243E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCancel: {
    color: '#AFC0D4',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubmit: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#315574',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#315574',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 15,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#EAF2FF',
  },
  privacySelector: {
    marginTop: 20,
  },
  privacyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  privacyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#315574',
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  privacyOptionText: {
    fontSize: 13,
    color: '#EAF2FF',
  },
  teamTypeSelector: {
    marginBottom: 15,
  },
  teamTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  teamTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#315574',
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  teamTypeOptionText: {
    fontSize: 13,
    color: '#EAF2FF',
  },
  challengeOptions: {
    marginBottom: 15,
  },
  optionGroup: {
    marginBottom: 15,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#315574',
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#EAF2FF',
  },
  difficultyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  difficultyOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedDifficultyOption: {
    borderWidth: 2,
    bordercolor: '#EAF2FF',
  },
  difficultyOptionText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  targetGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default SocialDashboard;
