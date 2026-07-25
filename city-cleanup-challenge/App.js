import React, { useEffect, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Login from './Login';
import Signup from './Signup';
import Chatbot from './Chatbot';
import Posts from './Posts';
import Profile from './Profile';
import Events from './Events';
import EventMap from './EventMap';
import Progress from './Progress';
import Evidence from './Evidence';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import SubscriptionDashboard from './SubscriptionDashboard';
import Wallet from './Wallet';
import RewardAdmin from './RewardAdmin';
import GamificationDashboard from './components/GamificationDashboard';
import SocialDashboard from './components/SocialDashboard';
import { getStoredUser, logoutAuthSession } from './apiConfig';

const BackButton = ({ label = 'Back to home', onPress }) => (
  <TouchableOpacity style={styles.backButton} onPress={onPress} accessibilityRole="button">
    <Text style={styles.backButtonText}>‹  {label}</Text>
  </TouchableOpacity>
);

const homeItems = [
  { key: 'evidence', icon: '◉', title: 'Submit evidence', hint: 'Document a completed cleanup', group: 'Action' },
  { key: 'progress', icon: '↗', title: 'My progress', hint: 'Track verified environmental impact', group: 'Impact' },
  { key: 'events', icon: '◈', title: 'Cleanup events', hint: 'Find and join nearby activities', group: 'Discover' },
  { key: 'map', icon: '⌖', title: 'Location map', hint: 'Explore cleanup activity by area', group: 'Discover' },
  { key: 'posts', icon: '▣', title: 'Community posts', hint: 'Share updates with the community', group: 'Connect' },
  { key: 'social', icon: '♢', title: 'Teams & community', hint: 'Collaborate around shared goals', group: 'Connect' },
  { key: 'gamification', icon: '★', title: 'Achievements', hint: 'View rewards, points, and badges', group: 'Rewards' },
  { key: 'wallet', icon: 'CE', title: 'Wallet & payouts', hint: 'Verify your wallet and track CELO rewards', group: 'Rewards' },
  { key: 'dashboard', icon: '▥', title: 'Impact analytics', hint: 'Review activity and performance', group: 'Insights' },
  { key: 'chatbot', icon: '◌', title: 'Cleanup assistant', hint: 'Get guidance for your next cleanup', group: 'Support' },
  { key: 'profile', icon: '◎', title: 'Profile settings', hint: 'Manage account and personal details', group: 'Account' },
  { key: 'subscription', icon: '◇', title: 'Subscription', hint: 'Review and manage your plan', group: 'Account' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [showSignup, setShowSignup] = useState(false);
  const [activeView, setActiveView] = useState('home');

  useEffect(() => {
    getStoredUser().then((storedUser) => {
      if (storedUser) {
        setUser(storedUser.username);
        setUserRole(storedUser.role || 'user');
      }
    });
  }, []);

  const handleLogin = (username, role = 'user') => {
    setUser(username);
    setUserRole(role);
  };

  const handleLogout = async () => {
    await logoutAuthSession();
    setUser(null);
    setUserRole('user');
    setActiveView('home');
  };

  const renderHome = () => {
    const items = userRole === 'admin'
      ? [
        ...homeItems,
        { key: 'reward-admin', icon: 'CE', title: 'Reward operations', hint: 'Control and audit CELO payouts', group: 'Admin' },
        { key: 'admin', icon: '⚙', title: 'Admin panel', hint: 'Manage users and content', group: 'Admin' },
      ]
      : homeItems;

    return (
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <View style={styles.dashboardShell}>
          <View style={styles.homeHeader}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>♻</Text>
              </View>
              <View>
                <Text style={styles.brandName}>CITY CLEANUP</Text>
                <Text style={styles.brandContext}>Impact workspace</Text>
              </View>
            </View>
            <View style={styles.accountControls}>
              <View style={styles.accountBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.accountBadgeText}>{userRole === 'admin' ? 'Administrator' : 'Member'}</Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroPanel}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>YOUR CLEANUP DASHBOARD</Text>
              <Text style={styles.welcome}>Welcome back, {user}</Text>
              <Text style={styles.welcomeSubtitle}>
                Document your work, follow its verification, and see the impact you create.
              </Text>
              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={() => setActiveView('evidence')}
                  activeOpacity={0.86}
                >
                  <Text style={styles.primaryActionIcon}>＋</Text>
                  <Text style={styles.primaryActionText}>Submit cleanup evidence</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => setActiveView('events')}
                  activeOpacity={0.82}
                >
                  <Text style={styles.secondaryActionText}>Explore events</Text>
                  <Text style={styles.secondaryActionArrow}>→</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statusPanel}>
              <Text style={styles.statusLabel}>ACCOUNT STATUS</Text>
              <View style={styles.statusItem}>
                <View style={styles.statusIcon}><Text style={styles.statusIconText}>✓</Text></View>
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>Secure session</Text>
                  <Text style={styles.statusHint}>Protected access is active</Text>
                </View>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <View style={styles.statusIcon}><Text style={styles.statusIconText}>◎</Text></View>
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>Evidence verification</Text>
                  <Text style={styles.statusHint}>Advanced review signals enabled</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Workspace</Text>
              <Text style={styles.sectionSubtitle}>Everything you need to plan, submit, and track cleanup work.</Text>
            </View>
            <Text style={styles.toolCount}>{items.length} tools</Text>
          </View>

          <View style={styles.grid}>
            {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.gridButton}
              onPress={() => setActiveView(item.key)}
              activeOpacity={0.82}
            >
              <View style={styles.cardTop}>
                <View style={styles.gridIconWrap}>
                  <Text style={styles.gridIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.cardArrow}>↗</Text>
              </View>
              <Text style={styles.cardGroup}>{item.group}</Text>
              <Text style={styles.gridText}>{item.title}</Text>
              <Text style={styles.gridHint}>{item.hint}</Text>
            </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderActiveView = () => {
    if (activeView === 'home') return renderHome();

    if (activeView === 'gamification') {
      return <GamificationDashboard username={user} onClose={() => setActiveView('home')} />;
    }
    if (activeView === 'social') {
      return (
        <SocialDashboard
          username={user}
          onClose={() => setActiveView('home')}
          navigation={{ goBack: () => setActiveView('home') }}
        />
      );
    }

    let content;
    let backLabel = 'Back to home';
    switch (activeView) {
      case 'profile':
        content = (
          <Profile
            username={user}
            onLogout={handleLogout}
            onUsernameChange={(newUsername) => setUser(newUsername)}
          />
        );
        break;
      case 'chatbot':
        content = <Chatbot />;
        break;
      case 'posts':
        content = <Posts username={user} />;
        break;
      case 'events':
        content = <Events username={user} onShowMap={() => setActiveView('map')} />;
        break;
      case 'map':
        backLabel = 'Back to events';
        content = <EventMap username={user} />;
        break;
      case 'progress':
        content = <Progress username={user} />;
        break;
      case 'evidence':
        content = <Evidence userRole={userRole} />;
        break;
      case 'wallet':
        content = <Wallet />;
        break;
      case 'reward-admin':
        content = <RewardAdmin />;
        break;
      case 'dashboard':
        content = (
          <Dashboard
            username={user}
            userRole={userRole}
            onAdminPanel={() => setActiveView('admin')}
          />
        );
        break;
      case 'admin':
        content = <AdminPanel username={user} />;
        break;
      case 'subscription':
        content = <SubscriptionDashboard />;
        break;
      default:
        return renderHome();
    }

    return (
      <>
        <BackButton
          label={backLabel}
          onPress={() => setActiveView(activeView === 'map' ? 'events' : 'home')}
        />
        {content}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!user ? (
        showSignup ? (
          <Signup onSignup={() => setShowSignup(false)} onSwitchToLogin={() => setShowSignup(false)} />
        ) : (
          <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />
        )
      ) : (
        renderActiveView()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07182D' },
  homeContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 28 : 18,
    paddingBottom: 54,
  },
  dashboardShell: {
    width: '100%',
    maxWidth: 1160,
  },
  homeHeader: {
    width: '100%',
    minHeight: 88,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomColor: '#1C3855',
    borderBottomWidth: 1,
    marginBottom: 30,
    paddingVertical: 17,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123755',
    borderColor: '#285C82',
    borderWidth: 1,
    borderRadius: 13,
  },
  brandMarkText: { color: '#67D6C8', fontSize: 24, fontWeight: '600' },
  brandName: { color: '#EDF5FF', fontSize: 13, fontWeight: '700', letterSpacing: 1.7 },
  brandContext: { color: '#7890AA', fontSize: 12, marginTop: 3 },
  accountControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#0D243D',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#61D6C6' },
  accountBadgeText: { color: '#ABC0D6', fontSize: 12, fontWeight: '600' },
  heroPanel: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
    backgroundColor: '#0D243D',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 24,
    marginBottom: 38,
    overflow: 'hidden',
    padding: Platform.OS === 'web' ? 34 : 24,
    shadowColor: '#020912',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 34,
    elevation: 5,
  },
  heroCopy: { flex: 1, justifyContent: 'center', minWidth: 0 },
  eyebrow: { color: '#69B4FF', fontSize: 10, fontWeight: '700', letterSpacing: 1.7 },
  welcome: {
    color: '#F5F8FF',
    fontSize: Platform.OS === 'web' ? 34 : 29,
    fontWeight: '600',
    letterSpacing: -0.6,
    marginTop: 10,
  },
  welcomeSubtitle: { color: '#9BB0C6', fontSize: 15, lineHeight: 23, marginTop: 9, maxWidth: 590 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 24 },
  primaryAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2878E4',
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  primaryActionIcon: { color: '#FFFFFF', fontSize: 18, fontWeight: '500' },
  primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#122E4A',
    borderColor: '#315574',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  secondaryActionText: { color: '#BBD8F7', fontSize: 14, fontWeight: '600' },
  secondaryActionArrow: { color: '#69B4FF', fontSize: 17 },
  statusPanel: {
    width: Platform.OS === 'web' ? 310 : '100%',
    backgroundColor: '#091B30',
    borderColor: '#204461',
    borderWidth: 1,
    borderRadius: 17,
    padding: 19,
  },
  statusLabel: { color: '#708AA5', fontSize: 9, fontWeight: '700', letterSpacing: 1.4, marginBottom: 15 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123B3D',
    borderRadius: 10,
  },
  statusIconText: { color: '#72D7CA', fontSize: 15, fontWeight: '700' },
  statusCopy: { flex: 1 },
  statusTitle: { color: '#DCE8F5', fontSize: 13, fontWeight: '600' },
  statusHint: { color: '#7890AA', fontSize: 11, lineHeight: 16, marginTop: 3 },
  statusDivider: { height: 1, backgroundColor: '#1C3855', marginVertical: 15 },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  sectionTitle: { color: '#EDF5FF', fontSize: 21, fontWeight: '600', letterSpacing: -0.2 },
  sectionSubtitle: { color: '#8298AF', fontSize: 13, lineHeight: 19, marginTop: 5 },
  toolCount: { color: '#7890AA', fontSize: 12, fontWeight: '600' },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridButton: {
    backgroundColor: '#10243E',
    borderColor: '#203F5D',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    width: Platform.OS === 'web' ? 216 : '100%',
    minHeight: 174,
    alignItems: 'flex-start',
    shadowColor: '#020912',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 15,
    elevation: 3,
  },
  cardTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  gridIconWrap: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123755',
    borderRadius: 11,
  },
  gridIcon: { color: '#61D6C6', fontSize: 20, fontWeight: '600' },
  cardArrow: { color: '#55728E', fontSize: 15 },
  cardGroup: { color: '#69B4FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  gridText: { color: '#EDF5FF', fontSize: 15, fontWeight: '600' },
  gridHint: { color: '#8298AF', fontSize: 12, lineHeight: 18, marginTop: 7 },
  logoutButton: {
    backgroundColor: '#102A45',
    borderColor: '#315574',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  logoutText: { color: '#BBD8F7', fontSize: 13, fontWeight: '600' },
  backButton: {
    backgroundColor: '#0B1E36',
    borderBottomColor: '#244B70',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  backButtonText: { color: '#8DBDFF', fontSize: 14, fontWeight: '600' },
});
