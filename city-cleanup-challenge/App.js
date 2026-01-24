import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
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

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [showSignup, setShowSignup] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  
  const handleLogin = (username, role = 'user') => {
    setUser(username);
    setUserRole(role);
  };
  
  const handleLogout = () => {
    setUser(null);
    setUserRole('user');
    resetViews();
  };
  
  const handleUsernameChange = (newUsername) => {
    setUser(newUsername);
  };

  const resetViews = () => {
    setShowProfile(false);
    setShowPosts(false);
    setShowChatbot(false);
    setShowEvents(false);
    setShowMap(false);
    setShowProgress(false);
    setShowDashboard(false);
    setShowAdminPanel(false);
    setShowSubscription(false);
  };

  const handleShowAdminPanel = () => {
    resetViews();
    setShowAdminPanel(true);
  };

  const handleShowDashboard = () => {
    resetViews();
    setShowDashboard(true);
  };

  const handleShowSubscription = () => {
    resetViews();
    setShowSubscription(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {!user ? (
        showSignup ? (
          <Signup onSignup={() => setShowSignup(false)} onSwitchToLogin={() => setShowSignup(false)} />
        ) : (
          <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />
        )
      ) : showProfile ? (
        <>
          <Button title="Back to Home" onPress={() => setShowProfile(false)} />
          <Profile username={user} onLogout={handleLogout} onUsernameChange={handleUsernameChange} />
        </>
      ) : showChatbot ? (
        <>
          <Button title="Back to Home" onPress={() => setShowChatbot(false)} />
          <Chatbot />
        </>
      ) : showPosts ? (
        <>
          <Button title="Back to Home" onPress={() => setShowPosts(false)} />
          <Posts username={user} />
        </>
      ) : showEvents ? (
        <>
          <Button title="Back to Home" onPress={() => setShowEvents(false)} />
          <Events username={user} onShowMap={() => { setShowEvents(false); setShowMap(true); }} />
        </>
      ) : showMap ? (
        <>
          <Button title="Back to Events" onPress={() => { setShowMap(false); setShowEvents(true); }} />
          <EventMap username={user} />
        </>
      ) : showProgress ? (
        <>
          <Button title="Back to Home" onPress={() => setShowProgress(false)} />
          <Progress username={user} />
        </>
      ) : showDashboard ? (
        <>
          <Button title="Back to Home" onPress={() => setShowDashboard(false)} />
          <Dashboard 
            username={user} 
            userRole={userRole} 
            onAdminPanel={handleShowAdminPanel} 
          />
        </>
      ) : showAdminPanel ? (
        <>
          <Button title="Back to Home" onPress={() => setShowAdminPanel(false)} />
          <AdminPanel username={user} />
        </>
      ) : showSubscription ? (
        <>
          <Button title="Back to Home" onPress={() => setShowSubscription(false)} />
          <SubscriptionDashboard />
        </>
      ) : (
        <View style={styles.homeContainer}>
          <Text style={styles.welcome}>Welcome, {user}!</Text>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.gridButton} onPress={() => setShowProfile(true)}>
              <Text style={styles.gridText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={() => setShowPosts(true)}>
              <Text style={styles.gridText}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={() => setShowEvents(true)}>
              <Text style={styles.gridText}>Events</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={() => setShowMap(true)}>
              <Text style={styles.gridText}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={() => setShowProgress(true)}>
              <Text style={styles.gridText}>My Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={handleShowDashboard}>
              <Text style={styles.gridText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={handleShowSubscription}>
              <Text style={styles.gridText}>Subscription</Text>
            </TouchableOpacity>
            {userRole === 'admin' && (
              <TouchableOpacity style={styles.gridButton} onPress={handleShowAdminPanel}>
                <Text style={styles.gridText}>Admin Panel</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.footer}>
            <Button title="Logout" onPress={handleLogout} color="#d9534f" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  gridButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    margin: 10,
    width: 150,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  gridText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 20,
  },
});
