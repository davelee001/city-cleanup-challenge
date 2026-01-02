import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import Login from './Login';
import Signup from './Signup';

  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
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
            <Login onLogin={setUser} />
            <Text style={styles.switchText} onPress={() => setShowSignup(true)}>
              Don't have an account? Sign up
            </Text>
          </>
        )
      ) : (
        <View>
          <Text style={styles.title}>City Cleanup Challenge</Text>
          <Text style={styles.subtitle}>Welcome, {user}!</Text>
          <Text style={styles.link}>Check the backend health page for status.</Text>
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
