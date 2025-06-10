import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import HomeScreen from './screens/HomeScreen';
import UploadScreen from './screens/UploadScreen';
import CourseConfirmationScreen from './screens/CourseConfirmationScreen';
import ScheduleInputScreen from './screens/ScheduleInputScreen';
import ScheduleViewScreen from './screens/ScheduleViewScreen';

export type RootStackParamList = {
  Home: undefined;
  Upload: undefined;
  CourseConfirmation: { courses: string[] };
  ScheduleInput: { courses: string[] };
  ScheduleView: { schedule: any };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator 
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#B1810B', // Purdue Gold
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ title: 'PurdueGo' }}
            />
            <Stack.Screen 
              name="Upload" 
              component={UploadScreen} 
              options={{ title: 'Upload Schedule PDF' }}
            />
            <Stack.Screen 
              name="CourseConfirmation" 
              component={CourseConfirmationScreen} 
              options={{ title: 'Confirm Courses' }}
            />
            <Stack.Screen 
              name="ScheduleInput" 
              component={ScheduleInputScreen} 
              options={{ title: 'Enter Schedule Details' }}
            />
            <Stack.Screen 
              name="ScheduleView" 
              component={ScheduleViewScreen} 
              options={{ title: 'Your Schedule' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}