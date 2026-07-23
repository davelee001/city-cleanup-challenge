import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Login from './Login';
import Signup from './Signup';
import Chatbot from './Chatbot';
import Posts from './Posts';
import Profile from './Profile';
import Events from './Events';
import EventMap from './EventMap';
import Progress from './Progress';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import SubscriptionDashboard from './SubscriptionDashboard';
import GamificationDashboard from './components/GamificationDashboard';
import SocialDashboard from './components/SocialDashboard';
import { getStoredUser, logoutAuthSession } from './apiConfig';

const BackButton = ({ label = 'Back to home', onPress }) => (
  <TouchableOpacity style={styles.backButton} onPress={onPress} accessibilityRole="button">
    <Text style={styles.backButtonText}>‹  {label}</Text>
  </TouchableOpacity>
);

const homeItems = [
  { key: 'profile', icon: '◎', title: 'Profile', hint: 'Account and personal details' },
  { key: 'posts', icon: '▣', title: 'Cleanup posts', hint: 'Share your cleanup evidence' },
  { key: 'chatbot', icon: '◌', title: 'Cleanup assistant', hint: 'Get help planning your work' },
  { key: 'events', icon: '◈', title: 'Events', hint: 'Join community cleanups' },
  { key: 'map', icon: '⌖', title: 'Map', hint: 'Explore cleanup locations' },
  { key: 'progress', icon: '↗', title: 'My progress', hint: 'See your verified impact' },
  { key: 'dashboard', icon: '▥', title: 'Dashboard', hint: 'Review community activity' },
  { key: 'subscription', icon: '◇', title: 'Subscription', hint: 'Manage your plan' },
  { key: 'gamification', icon: '★', title: 'Achievements', hint: 'Rewards, points, and badges' },
  { key: 'social', icon: '♢', title: 'Community', hint: 'Teams and shared goals' },
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
      ? [...homeItems, { key: 'admin', icon: '⚙', title: 'Admin panel', hint: 'Manage users and content' }]
      : homeItems;

    return (
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.eyebrow}>CITY CLEANUP</Text>
            <Text style={styles.welcome}>Welcome back, {user}</Text>
            <Text style={styles.welcomeSubtitle}>Choose where you want to make an impact today.</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.gridButton}
              onPress={() => setActiveView(item.key)}
              activeOpacity={0.82}
            >
              <Text style={styles.gridIcon}>{item.icon}</Text>
              <Text style={styles.gridText}>{item.title}</Text>
              <Text style={styles.gridHint}>{item.hint}</Text>
            </TouchableOpacity>
          ))}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 42,
  },
  homeHeader: {
    width: '100%',
    maxWidth: 1060,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 30,
  },
  eyebrow: { color: '#69B4FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  welcome: {
    color: '#F5F8FF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 7,
  },
  welcomeSubtitle: { color: '#93A9C0', fontSize: 15, marginTop: 7 },
  grid: {
    width: '100%',
    maxWidth: 1080,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  gridButton: {
    backgroundColor: '#10243E',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    width: 200,
    minHeight: 155,
    justifyContent: 'center',
    alignItems: 'flex-start',
    shadowColor: '#020912',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  gridIcon: { color: '#61D6C6', fontSize: 27, fontWeight: '700', marginBottom: 14 },
  gridText: { color: '#EDF5FF', fontSize: 17, fontWeight: '800' },
  gridHint: { color: '#8298AF', fontSize: 12, lineHeight: 18, marginTop: 6 },
  logoutButton: {
    borderColor: '#3C6A94',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  logoutText: { color: '#BBD8F7', fontSize: 14, fontWeight: '800' },
  backButton: {
    backgroundColor: '#0B1E36',
    borderBottomColor: '#244B70',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  backButtonText: { color: '#8DBDFF', fontSize: 14, fontWeight: '800' },
});
