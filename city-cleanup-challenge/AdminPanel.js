import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import Toast from 'react-hot-toast';

const AdminPanel = ({ username, onBack }) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({});
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    code: '',
    area: '',
    targetWaste: '',
    estimatedDuration: '',
    difficulty: 'medium'
  });

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'plans') {
      fetchPlans();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/admin/analytics?username=${username}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        Toast.error(data.message || 'Failed to load analytics');
      }
    } catch (error) {
      Toast.error('Network error loading analytics');
    }
    setLoading(false);
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/plans?adminView=true&username=${username}`);
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      } else {
        Toast.error(data.message || 'Failed to load plans');
      }
    } catch (error) {
      Toast.error('Network error loading plans');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/admin/users?username=${username}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        Toast.error(data.message || 'Failed to load users');
      }
    } catch (error) {
      Toast.error('Network error loading users');
    }
    setLoading(false);
  };

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/admin/activity?username=${username}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities);
      } else {
        Toast.error(data.message || 'Failed to load activity');
      }
    } catch (error) {
      Toast.error('Network error loading activity');
    }
    setLoading(false);
  };

  const handleCreatePlan = async () => {
    if (!newPlan.title || !newPlan.description || !newPlan.code || !newPlan.area) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPlan,
          targetWaste: parseFloat(newPlan.targetWaste) || 0,
          estimatedDuration: parseInt(newPlan.estimatedDuration) || 0,
          username
        })
      });
      const data = await response.json();
      if (data.success) {
        Toast.success('Plan created successfully!');
        setNewPlan({ title: '', description: '', code: '', area: '', targetWaste: '', estimatedDuration: '', difficulty: 'medium' });
        setShowCreatePlan(false);
        fetchPlans();
      } else {
        Toast.error(data.message || 'Failed to create plan');
      }
    } catch (error) {
      Toast.error('Network error creating plan');
    }
    setLoading(false);
  };

  const handleDeletePlan = async (planId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://localhost:3000/admin/plans/${planId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
              });
              const data = await response.json();
              if (data.success) {
                Toast.success('Plan deleted successfully');
                fetchPlans();
              } else {
                Toast.error(data.message || 'Failed to delete plan');
              }
            } catch (error) {
              Toast.error('Network error deleting plan');
            }
          }
        }
      ]
    );
  };

  const handleUpdateUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    Alert.alert(
      'Change User Role',
      `Change user role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await fetch(`http://localhost:3000/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole, username })
              });
              const data = await response.json();
              if (data.success) {
                Toast.success(`User role updated to ${newRole}`);
                fetchUsers();
              } else {
                Toast.error(data.message || 'Failed to update user role');
              }
            } catch (error) {
              Toast.error('Network error updating user role');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const renderAnalytics = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>System Analytics</Text>
      
      {loading ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{analytics.userStats?.totalUsers || 0}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
              <Text style={styles.statSubtext}>{analytics.userStats?.adminUsers || 0} admins</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{analytics.eventStats?.totalEvents || 0}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
              <Text style={styles.statSubtext}>{analytics.eventStats?.activeEvents || 0} active</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{analytics.planStats?.totalPlans || 0}</Text>
              <Text style={styles.statLabel}>Cleanup Plans</Text>
              <Text style={styles.statSubtext}>{analytics.planStats?.activePlans || 0} active</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{(analytics.progressStats?.totalWaste || 0).toFixed(1)} kg</Text>
              <Text style={styles.statLabel}>Waste Collected</Text>
              <Text style={styles.statSubtext}>{analytics.progressStats?.totalProgress || 0} entries</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {analytics.recentActivity?.slice(0, 5).map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <Text style={styles.activityUser}>{activity.username}</Text>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderPlans = () => (
    <ScrollView style={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cleanup Plans & Codes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreatePlan(true)}
        >
          <Text style={styles.addButtonText}>+ Add Plan</Text>
        </TouchableOpacity>
      </View>

      {showCreatePlan && (
        <View style={styles.createForm}>
          <Text style={styles.formTitle}>Create New Plan</Text>
          <TextInput
            style={styles.input}
            placeholder="Plan Title *"
            value={newPlan.title}
            onChangeText={(text) => setNewPlan({ ...newPlan, title: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Description *"
            value={newPlan.description}
            onChangeText={(text) => setNewPlan({ ...newPlan, description: text })}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Plan Code (e.g., PARK-001) *"
            value={newPlan.code}
            onChangeText={(text) => setNewPlan({ ...newPlan, code: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Area (e.g., Central Park) *"
            value={newPlan.area}
            onChangeText={(text) => setNewPlan({ ...newPlan, area: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Target Waste (kg)"
            value={newPlan.targetWaste}
            onChangeText={(text) => setNewPlan({ ...newPlan, targetWaste: text })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Estimated Duration (hours)"
            value={newPlan.estimatedDuration}
            onChangeText={(text) => setNewPlan({ ...newPlan, estimatedDuration: text })}
            keyboardType="numeric"
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.createButton} onPress={handleCreatePlan} disabled={loading}>
              <Text style={styles.createButtonText}>Create Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreatePlan(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : (
        plans.map((plan) => (
          <View key={plan.id} style={[styles.planCard, plan.status !== 'active' && styles.inactivePlan]}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <View style={styles.planStatus}>
                <Text style={[styles.statusText, plan.status === 'active' ? styles.activeStatus : styles.inactiveStatus]}>
                  {plan.status}
                </Text>
              </View>
            </View>
            
            <Text style={styles.planCode}>Code: {plan.code}</Text>
            <Text style={styles.planDesc}>{plan.description}</Text>
            <Text style={styles.planArea}>📍 {plan.area}</Text>
            
            <View style={styles.planStats}>
              <Text style={styles.planStat}>🎯 {plan.targetWaste} kg target</Text>
              <Text style={styles.planStat}>⏱️ {plan.estimatedDuration}h estimated</Text>
              <Text style={styles.planStat}>📊 {plan.difficulty} difficulty</Text>
            </View>
            
            <View style={styles.planFooter}>
              <Text style={styles.planCreated}>Created: {formatDate(plan.createdAt)}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePlan(plan.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderUsers = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>User Management</Text>
      
      {loading ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : (
        users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{user.username}</Text>
              <Text style={styles.userDate}>Joined: {formatDate(user.createdAt)}</Text>
              {user.lastLogin && (
                <Text style={styles.userDate}>Last Login: {formatDate(user.lastLogin)}</Text>
              )}
            </View>
            
            <View style={styles.roleSection}>
              <View style={styles.roleSwitch}>
                <Text style={styles.roleLabel}>Admin</Text>
                <Switch
                  value={user.role === 'admin'}
                  onValueChange={() => handleUpdateUserRole(user.id, user.role)}
                />
              </View>
              <Text style={[styles.roleText, user.role === 'admin' ? styles.adminRole : styles.userRole]}>
                {user.role}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderActivity = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>System Activity Log</Text>
      
      {loading ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : (
        activities.map((activity) => (
          <View key={activity.id} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityUser}>{activity.username}</Text>
              <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
            </View>
            <Text style={styles.activityAction}>{activity.action}</Text>
            {activity.target && (
              <Text style={styles.activityTarget}>Target: {activity.target}</Text>
            )}
            {activity.details && activity.details !== 'null' && (
              <Text style={styles.activityDetails}>Details: {activity.details}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <View style={styles.tabContainer}>
        {['analytics', 'plans', 'users', 'activity'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'plans' && renderPlans()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'activity' && renderActivity()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  createForm: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  createButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  createButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  inactivePlan: {
    borderLeftColor: '#dc3545',
    backgroundColor: '#f8f9fa',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  planStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatus: {
    color: '#28a745',
  },
  inactiveStatus: {
    color: '#dc3545',
  },
  planCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  planArea: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planStat: {
    fontSize: 12,
    color: '#666',
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCreated: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  roleSection: {
    alignItems: 'center',
  },
  roleSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminRole: {
    color: '#dc3545',
  },
  userRole: {
    color: '#28a745',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityAction: {
    fontSize: 14,
    color: '#666',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityTarget: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default AdminPanel;