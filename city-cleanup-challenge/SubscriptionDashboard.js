import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const subscriptions = [
  { id: '1', name: 'Basic', price: '$9.99/month', features: ['Access to all events', 'Track your progress'] },
  { id: '2', name: 'Premium', price: '$19.99/month', features: ['All basic features', 'Create your own events', 'Advanced analytics'] },
  { id: '3', name: 'Pro', price: '$29.99/month', features: ['All premium features', 'Priority support', 'Exclusive event invitations'] },
];

export default function SubscriptionDashboard() {
  const [selected, setSelected] = useState(null);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, selected === item.id && styles.selectedCard]}
      onPress={() => setSelected(item.id)}
    >
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardPrice}>{item.price}</Text>
      <View style={styles.featuresContainer}>
        {item.features.map((feature, index) => (
          <Text key={index} style={styles.featureText}>• {feature}</Text>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Plan</Text>
      <FlatList
        data={subscriptions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        extraData={selected}
      />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Subscribe</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCard: {
    borderColor: '#007bff',
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardPrice: {
    fontSize: 18,
    color: '#888',
    marginVertical: 10,
  },
  featuresContainer: {
    marginTop: 10,
  },
  featureText: {
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 4,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
