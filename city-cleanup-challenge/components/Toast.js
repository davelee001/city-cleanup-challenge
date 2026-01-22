import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return { toasts, showToast };
};

const Toast = ({ message, type }) => {
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <View style={[styles.toast, { backgroundColor: colors[type] }]}>
      <Text style={styles.icon}>{icons[type]}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const ToastContainer = ({ toasts }) => {
  return (
    <View style={styles.container}>
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  icon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  message: {
    color: '#fff',
    fontSize: 14,
  },
});

export { useToast, ToastContainer };
