
import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Button } from 'react-native';
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
  
  const handleLogin = (username, role = 'user') => {
    setUser(username);
    setUserRole(role);
  };
  
  const handleLogout = () => {
    setUser(null);
    setUserRole('user');
    setShowProfile(false);
    setShowPosts(false);
    setShowChatbot(false);
    setShowEvents(false);
    setShowMap(false);
    setShowProgress(false);
    setShowDashboard(false);
    setShowAdminPanel(false);
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
  };

  const handleShowAdminPanel = () => {
    resetViews();
    setShowAdminPanel(true);
  };

  const handleShowDashboard = () => {
    resetViews();
    setShowDashboard(true);
  };
  return (
    <SafeAreaView style={styles.container}>
      {!user ? (
        showSignup ? (
          <>
            <Signup onSignup={() => setShowSignup(false)} />
            <Text style={styles.switchText} onPress={() => setShowSignup(false)}>
              Already have an account? Log in
            </Text>
          </>
        ) : (
          <>
            <Login onLogin={handleLogin} />
            <Text style={styles.switchText} onPress={() => setShowSignup(true)}>
              Don't have an account? Sign up
            </Text>
          </>
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
          <AdminPanel 
            username={user} 
            onBack={() => setShowAdminPanel(false)}
          />
        </>
      ) : (
        <View>
          <Text style={styles.title}>City Cleanup Challenge</Text>
          <Text style={styles.subtitle}>Welcome, {user}! {userRole === 'admin' && '👑 Admin'}</Text>
          <Text style={styles.description}>Join cleanup events in your area and make a difference!</Text>
          
          <View style={styles.mainButtons}>
            <Button title="🗺️ Events & Map" onPress={() => setShowEvents(true)} />
            <Button title="📊 My Progress" onPress={() => setShowProgress(true)} />
            <Button title="💬 Posts" onPress={() => setShowPosts(true)} />
            <Button title="🤖 Chatbot Guide" onPress={() => setShowChatbot(true)} />
            <Button title="📈 Dashboard" onPress={handleShowDashboard} />
            {userRole === 'admin' && (
              <Button 
                title="⚙️ Admin Panel" 
                onPress={handleShowAdminPanel}
                color="#dc3545"
              />
            )}
            <Button title="👤 Profile" onPress={() => setShowProfile(true)} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  mainButtons: {
    width: '100%',
    gap: 12,
  },
  link: {
    fontSize: 16,
    color: '#007bff',
    textAlign: 'center',
  },
  switchText: {
    color: '#007bff',
    marginTop: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});
