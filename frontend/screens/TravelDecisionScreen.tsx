import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type TravelDecisionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TravelDecision'>;

interface Props {
  navigation: TravelDecisionScreenNavigationProp;
}

export default function TravelDecisionScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Travel Notifications</Text>
          <Text style={styles.subtitle}>
            Would you like to receive notifications about when to leave for your classes?
          </Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <Text style={styles.featureItem}>• Get notified when it's time to leave for class</Text>
          <Text style={styles.featureItem}>• Real-time travel time calculations</Text>
          <Text style={styles.featureItem}>• Automatic scheduling based on your class times</Text>
          <Text style={styles.featureItem}>• Location-based reminders</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.yesButton]}
            onPress={() => navigation.navigate('TravelSetup')}
          >
            <Text style={styles.buttonText}>Yes, Enable Travel Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.noButton]}
            onPress={() => navigation.navigate('Upload')}
          >
            <Text style={styles.buttonText}>No, Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#B1810B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  features: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#B1810B',
  },
  noButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 