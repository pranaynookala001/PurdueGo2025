import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';

interface AddressSuggestion {
  description: string;
  place_id: string;
}

export default function TravelSetup() {
  const navigation = useNavigation();
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [dormAddress, setDormAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wantsNotifications, setWantsNotifications] = useState(false);
  const [dormCoords, setDormCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      }
    })();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(status === 'granted');
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
    } else {
      Alert.alert('Permission Denied', 'Location permission is required for this feature.');
    }
  };

  // Debounced fetch for suggestions
  const fetchAddressSuggestions = (query: string) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setSuggestionError(null);
      return;
    }
    setIsLoading(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=AIzaSyA5blZoZ1RLVNeDYk-8qKATJQyn-XQ0y-g&components=country:us`
        );
        const data = await response.json();
        if (data.status !== 'OK') {
          setSuggestionError(data.error_message || 'No suggestions found.');
          setAddressSuggestions([]);
        } else {
          setAddressSuggestions(data.predictions || []);
          setSuggestionError(null);
        }
        setShowSuggestions(true);
      } catch (error) {
        setSuggestionError('Error fetching suggestions. Check your network/API key.');
        setAddressSuggestions([]);
        console.error('Address suggestion fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 400);
  };

  // Get coordinates for a place_id
  const fetchPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=AIzaSyA5blZoZ1RLVNeDYk-8qKATJQyn-XQ0y-g`
      );
      const data = await response.json();
      if (data.result && data.result.geometry && data.result.geometry.location) {
        setDormCoords({
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        });
      }
    } catch (e) {
      // fallback: do nothing
    }
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setDormAddress(suggestion.description);
    setShowSuggestions(false);
    fetchPlaceDetails(suggestion.place_id);
    Keyboard.dismiss();
  };

  const handleDormAddressChange = (text: string) => {
    setDormAddress(text);
    fetchAddressSuggestions(text);
  };

  const handleNotificationYes = async () => {
    setWantsNotifications(true);
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Sample Travel Notification',
          body: 'This is how your travel reminder will look!',
        },
        trigger: null,
      });
    } else {
      Alert.alert('Permission Denied', 'Please enable notifications to receive travel reminders.');
    }
  };

  const handleNotificationNo = () => {
    setWantsNotifications(false);
  };

  const handleSubmit = async () => {
    if (!dormAddress) {
      Alert.alert('Error', 'Please enter your dorm address');
      return;
    }
    // Save preferences here if needed
    Alert.alert('Success', 'Your travel preferences have been saved!');
    setTimeout(() => {
      navigation.navigate('Upload');
    }, 500);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {!hasLocationPermission ? (
          <TouchableOpacity style={styles.button} onPress={requestLocationPermission}>
            <Text style={styles.buttonText}>Enable Location Services</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dorm Location</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your dorm address"
                  value={dormAddress}
                  onChangeText={handleDormAddressChange}
                  onFocus={() => dormAddress.length > 2 && setShowSuggestions(true)}
                />
                {isLoading && <ActivityIndicator style={styles.loader} />}
              </View>
              {showSuggestions && (
                <View style={styles.suggestionsContainer}>
                  {suggestionError && (
                    <Text style={{ color: 'red', padding: 10 }}>{suggestionError}</Text>
                  )}
                  {addressSuggestions.length === 0 && !suggestionError && !isLoading && (
                    <Text style={{ color: '#888', padding: 10 }}>No suggestions found.</Text>
                  )}
                  {addressSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.place_id}
                      style={styles.suggestionItem}
                      onPress={() => handleAddressSelect(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <View style={styles.notificationContainer}>
                <Text style={styles.notificationText}>
                  Would you like to receive notifications about when to leave for your classes?
                </Text>
                <View style={styles.notificationButtons}>
                  <TouchableOpacity
                    style={[
                      styles.notificationButton,
                      wantsNotifications && styles.notificationButtonActive,
                    ]}
                    onPress={handleNotificationYes}
                  >
                    <Text style={[
                      styles.notificationButtonText,
                      wantsNotifications && styles.notificationButtonTextActive,
                    ]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.notificationButton,
                      !wantsNotifications && styles.notificationButtonActive,
                    ]}
                    onPress={handleNotificationNo}
                  >
                    <Text style={[
                      styles.notificationButtonText,
                      !wantsNotifications && styles.notificationButtonTextActive,
                    ]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {(dormCoords || currentLocation) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Map Preview</Text>
                <MapView
                  style={styles.map}
                  region={
                    dormCoords
                      ? {
                          latitude: dormCoords.latitude,
                          longitude: dormCoords.longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }
                      : currentLocation
                      ? {
                          latitude: currentLocation.coords.latitude,
                          longitude: currentLocation.coords.longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }
                      : undefined
                  }
                >
                  {dormCoords && (
                    <Marker
                      coordinate={dormCoords}
                      title="Dorm Location"
                    />
                  )}
                  {!dormCoords && currentLocation && (
                    <Marker
                      coordinate={{
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude,
                      }}
                      title="Current Location"
                    />
                  )}
                </MapView>
              </View>
            )}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Save Preferences</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  loader: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  notificationContainer: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 8,
  },
  notificationText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  notificationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  notificationButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B1810B',
    alignItems: 'center',
  },
  notificationButtonActive: {
    backgroundColor: '#B1810B',
  },
  notificationButtonText: {
    fontSize: 16,
    color: '#B1810B',
    fontWeight: 'bold',
  },
  notificationButtonTextActive: {
    color: '#fff',
  },
  map: {
    height: 200,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#B1810B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#B1810B',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 