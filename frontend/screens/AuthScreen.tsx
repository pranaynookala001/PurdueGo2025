import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, SafeAreaView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { auth } from '../FirebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { loadUserData } from '../src/utils/userData';
import { getApiUrl, API_ENDPOINTS } from '../config';

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
};

const AuthScreen = ({ navigation }: AuthScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      if (user) {
        // Load user data from Firestore
        const userData = await loadUserData();
        if (userData && userData.schedule) {
          // Prepare the body for the schedule generation request
          const requestBody: { courses: any[]; dormCoords?: { latitude: number; longitude: number } } = {
            courses: userData.schedule,
          };

          if (userData.travel && userData.travel.dormCoords) {
            requestBody.dormCoords = userData.travel.dormCoords;
          }

          const response = await fetch(getApiUrl(API_ENDPOINTS.GENERATE_SCHEDULE), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          if (response.ok) {
            navigation.replace('ScheduleView', { schedule: data.schedule, scheduleDetails: userData.schedule });
          } else {
            navigation.replace('Home');
          }
        } else {
          navigation.replace('Home');
        }
      }
    } catch (error: any) {
      alert('Sign in failed: ' + error.message);
    }
  };

  const handleSignUp = async () => {
    try {
      const user = await createUserWithEmailAndPassword(auth, email, password);
      if (user) navigation.replace('Home');
    } catch (error: any) {
      alert('Sign up failed: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/purdue_logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={styles.title}>Welcome to PurdueGo</Text>
      <TextInput 
        style={styles.textInput} 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.textInput} 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#B1810B',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AuthScreen; 