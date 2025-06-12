import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Keyboard,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { getApiUrl, API_ENDPOINTS } from '../config';
import { Swipeable } from 'react-native-gesture-handler';
import { saveUserData } from '../src/utils/userData';
import MapView, { Marker } from 'react-native-maps';

type ScheduleInputScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ScheduleInput'
>;
type ScheduleInputScreenRouteProp = RouteProp<RootStackParamList, 'ScheduleInput'>;

interface Props {
  navigation: ScheduleInputScreenNavigationProp;
  route: ScheduleInputScreenRouteProp;
}

interface CourseDetails {
  code: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  roomNumber?: string;
  locationCoords?: { latitude: number; longitude: number } | null;
}

interface LocationSuggestion {
  description: string;
  place_id: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
});

const GOOGLE_API_KEY = 'AIzaSyA5blZoZ1RLVNeDYk-8qKATJQyn-XQ0y-g';

export default function ScheduleInputScreen({ navigation, route }: Props) {
  const { courses, editingIndex } = route.params;
  const [courseDetails, setCourseDetails] = useState<CourseDetails[]>(
    courses.map((course: any) => ({
      code: course.code || course,
      days: course.days || [],
      startTime: course.startTime || '',
      endTime: course.endTime || '',
      location: course.location || '',
      roomNumber: course.roomNumber || '',
    }))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [activeCourseIndex, setActiveCourseIndex] = useState<number | null>(null);
  const [editingCourse, setEditingCourse] = useState<number | null>(editingIndex !== undefined ? editingIndex : null);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[][]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState<number | null>(null);
  const [locationCoords, setLocationCoords] = useState<{ [index: number]: { latitude: number; longitude: number } | null }>(() => {
    const initialCoords: { [index: number]: { latitude: number; longitude: number } | null } = {};
    courses.forEach((course: any, idx: number) => {
      if (course.locationCoords) {
        initialCoords[idx] = course.locationCoords;
      }
    });
    return initialCoords;
  });
  const [locationLoading, setLocationLoading] = useState<{ [index: number]: boolean }>({});
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateCourseDetail = (
    index: number,
    field: keyof CourseDetails,
    value: any
  ) => {
    setCourseDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleDay = (courseIndex: number, day: string) => {
    setCourseDetails(prev => {
      const updated = [...prev];
      const course = updated[courseIndex];
      const days = course.days.includes(day)
        ? course.days.filter(d => d !== day)
        : [...course.days, day];
      updated[courseIndex] = { ...course, days };
      return updated;
    });
  };

  const validateInputs = () => {
    for (const course of courseDetails) {
      if (
        course.days.length === 0 ||
        !course.startTime ||
        !course.endTime ||
        !course.location
      ) {
        return false;
      }
    }
    return true;
  };

  const generateSchedule = async () => {
    if (!validateInputs()) {
      Alert.alert('Incomplete Information', 'Please fill in all fields for each course.');
      return;
    }

    setIsGenerating(true);

    try {
      // Prepare data for Firestore, including locationCoords
      const scheduleToSave = courseDetails.map((course, index) => ({
        ...course,
        locationCoords: locationCoords[index] || null,
      }));

      await saveUserData({ schedule: scheduleToSave });

      const response = await fetch(getApiUrl(API_ENDPOINTS.GENERATE_SCHEDULE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courses: courseDetails }),
      });

      const data = await response.json();

      if (response.ok) {
        // Pass both processed schedule and original course details to ScheduleView
        navigation.navigate('ScheduleView', { schedule: data.schedule, scheduleDetails: scheduleToSave });
      } else {
        Alert.alert('Error', data.error || 'Failed to generate schedule');
      }
    } catch (error) {
      console.error('Schedule generation error:', error);
      Alert.alert(
        'Connection Error',
        'Failed to connect to server. Please check:\n\n' +
        '1. The backend server is running\n' +
        '2. You are connected to the same network\n' +
        '3. The server address is correct'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const addOneHour = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutesRaw] = time.split(':');
    let hoursNum = Number(hours);
    let minutesNum = Number(minutesRaw) || 0;
    let newHour = hoursNum + 1;
    let newPeriod = period;

    if (hoursNum === 12) {
      newHour = 1;
      if (period === 'AM') newPeriod = 'AM';
      else newPeriod = 'PM';
    } else if (newHour === 12) {
      newPeriod = period === 'AM' ? 'PM' : 'AM';
    } else if (newHour > 12) {
      newHour = 1;
      newPeriod = period === 'AM' ? 'PM' : 'AM';
    }

    return `${newHour}:${minutesNum.toString().padStart(2, '0')} ${newPeriod}`;
  };

  const handleTimeSelect = (index: number, courseIndex: number, isStart: boolean) => {
    if (index === TIME_OPTIONS.length) {
      // "Other" option selected
      setIsCustomTime(true);
      setShowStartTimeModal(false);
      setShowEndTimeModal(false);
    } else {
      const time = TIME_OPTIONS[index];
      updateCourseDetail(courseIndex, isStart ? 'startTime' : 'endTime', time);
      
      // If selecting start time, automatically set end time to 1 hour later
      if (isStart) {
        const endTime = addOneHour(time);
        updateCourseDetail(courseIndex, 'endTime', endTime);
      }
      
      setShowStartTimeModal(false);
      setShowEndTimeModal(false);
    }
  };

  const renderTimeModal = (courseIndex: number, isStart: boolean) => (
    <Modal
      visible={isStart ? showStartTimeModal : showEndTimeModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Select {isStart ? 'Start' : 'End'} Time
          </Text>
          <ScrollView style={styles.timeOptionsList}>
            {TIME_OPTIONS.map((time, index) => (
              <TouchableOpacity
                key={time}
                style={styles.timeOption}
                onPress={() => handleTimeSelect(index, courseIndex, isStart)}
              >
                <Text style={styles.timeOptionText}>{time}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => handleTimeSelect(TIME_OPTIONS.length, courseIndex, isStart)}
            >
              <Text style={styles.timeOptionText}>Other (Custom Time)</Text>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => {
              setShowStartTimeModal(false);
              setShowEndTimeModal(false);
            }}
          >
            <Text style={styles.closeModalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const handleDeleteCourse = (index: number) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCourseDetails(prev => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleEditCourse = (index: number) => {
    setEditingCourse(index);
    setNewCourseCode(courseDetails[index].code);
  };

  const handleSaveEdit = () => {
    if (newCourseCode.trim()) {
      setCourseDetails(prev => {
        const updated = [...prev];
        updated[editingCourse!] = {
          ...updated[editingCourse!],
          code: newCourseCode.trim(),
        };
        return updated;
      });
    }
    setEditingCourse(null);
  };

  const handleAddCourse = () => {
    if (newCourseCode.trim()) {
      setCourseDetails(prev => [
        ...prev,
        {
          code: newCourseCode.trim(),
          days: [],
          startTime: '',
          endTime: '',
          location: '',
        },
      ]);
      setNewCourseCode('');
    }
  };

  const renderRightActions = (index: number) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.editButton]}
        onPress={() => handleEditCourse(index)}
      >
        <Text style={styles.swipeButtonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDeleteCourse(index)}
      >
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const fetchLocationSuggestions = (query: string, courseIndex: number) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (query.length < 3) {
      setLocationSuggestions(prev => {
        const updated = [...prev];
        updated[courseIndex] = [];
        return updated;
      });
      setShowLocationSuggestions(null);
      return;
    }
    setLocationLoading(prev => ({ ...prev, [courseIndex]: true }));
    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_API_KEY}&components=country:us|locality:West Lafayette|administrative_area:IN`
        );
        const data = await response.json();
        setLocationSuggestions(prev => {
          const updated = [...prev];
          updated[courseIndex] = data.predictions || [];
          return updated;
        });
        setShowLocationSuggestions(courseIndex);
      } catch (error) {
        setLocationSuggestions(prev => {
          const updated = [...prev];
          updated[courseIndex] = [];
          return updated;
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, [courseIndex]: false }));
      }
    }, 400);
  };

  const fetchLocationCoords = async (placeId: string, courseIndex: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.result && data.result.geometry && data.result.geometry.location) {
        setLocationCoords(prev => ({
          ...prev,
          [courseIndex]: {
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng,
          },
        }));
      }
    } catch (e) {
      // fallback: do nothing
    }
  };

  const renderCourseInput = (course: CourseDetails, index: number) => (
    <Swipeable
      key={course.code}
      renderRightActions={() => renderRightActions(index)}
    >
      <View style={styles.courseCard}>
        {editingCourse === index ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={newCourseCode}
              onChangeText={setNewCourseCode}
              placeholder="Enter course code"
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editActionButton, styles.cancelButton]}
                onPress={() => setEditingCourse(null)}
              >
                <Text style={styles.editActionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editActionButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.editActionButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.courseTitle}>{course.code}</Text>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Meeting Days</Text>
          <View style={styles.daysContainer}>
            {DAYS.map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  course.days.includes(day) && styles.dayButtonSelected,
                ]}
                onPress={() => toggleDay(index, day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    course.days.includes(day) && styles.dayButtonTextSelected,
                  ]}
                >
                  {day.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.timeContainer}>
          <View style={styles.timeInput}>
            <Text style={styles.inputLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => {
                setActiveCourseIndex(index);
                setShowStartTimeModal(true);
              }}
            >
              <Text style={styles.timeSelectorText}>
                {isCustomTime && activeCourseIndex === index ? 'Custom Time' : (course.startTime || 'Select Start Time')}
              </Text>
            </TouchableOpacity>
            {isCustomTime && activeCourseIndex === index && (
              <TextInput
                style={[styles.textInput, styles.customTimeInput]}
                placeholder="Enter custom time (e.g., 9:15 AM)"
                value={course.startTime}
                onChangeText={text => {
                  updateCourseDetail(index, 'startTime', text);
                  // Automatically set end time when custom start time is entered
                  const endTime = addOneHour(text);
                  updateCourseDetail(index, 'endTime', endTime);
                }}
              />
            )}
          </View>
          <View style={styles.timeInput}>
            <Text style={styles.inputLabel}>End Time</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => {
                setActiveCourseIndex(index);
                setShowEndTimeModal(true);
              }}
            >
              <Text style={styles.timeSelectorText}>
                {isCustomTime && activeCourseIndex === index ? 'Custom Time' : (course.endTime || 'Select End Time')}
              </Text>
            </TouchableOpacity>
            {isCustomTime && activeCourseIndex === index && (
              <TextInput
                style={[styles.textInput, styles.customTimeInput]}
                placeholder="Enter custom time (e.g., 10:45 AM)"
                value={course.endTime}
                onChangeText={text => updateCourseDetail(index, 'endTime', text)}
              />
            )}
          </View>
        </View>

        {activeCourseIndex === index && (
          <>
            {renderTimeModal(index, true)}
            {renderTimeModal(index, false)}
          </>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Location</Text>
          <TextInput
            style={styles.textInput}
            placeholder="MATH 175"
            value={course.location}
            onChangeText={text => {
              updateCourseDetail(index, 'location', text);
              fetchLocationSuggestions(text, index);
            }}
            onFocus={() => course.location.length > 2 && setShowLocationSuggestions(index)}
            onBlur={() => setTimeout(() => setShowLocationSuggestions(null), 200)}
          />
          {showLocationSuggestions === index && locationSuggestions[index] && locationSuggestions[index].length > 0 && (
            <View style={styles.suggestionsContainerBelow}>
              {locationSuggestions[index].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.place_id}
                  style={styles.suggestionItem}
                  onPress={() => {
                    updateCourseDetail(index, 'location', suggestion.description);
                    fetchLocationCoords(suggestion.place_id, index);
                    setShowLocationSuggestions(null);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Room Number (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 101A"
            value={course.roomNumber || ''}
            onChangeText={text => updateCourseDetail(index, 'roomNumber', text)}
          />
        </View>
      </View>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Enter Schedule Details</Text>
            <Text style={styles.subtitle}>
              Please provide the meeting times and locations for each course.
            </Text>
          </View>

          <View style={styles.addCourseContainer}>
            <TextInput
              style={styles.addCourseInput}
              value={newCourseCode}
              onChangeText={setNewCourseCode}
              placeholder="Enter new course code"
            />
            <TouchableOpacity
              style={styles.addCourseButton}
              onPress={handleAddCourse}
            >
              <Text style={styles.addCourseButtonText}>Add Course</Text>
            </TouchableOpacity>
          </View>

          {courseDetails.map((course, index) => renderCourseInput(course, index))}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.generateButton,
                (!validateInputs() || isGenerating) && styles.generateButtonDisabled,
              ]}
              onPress={generateSchedule}
              disabled={!validateInputs() || isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.generateButtonText}>Generate Schedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  courseCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B1810B',
    marginBottom: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dayButtonSelected: {
    backgroundColor: '#B1810B',
    borderColor: '#B1810B',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
  },
  textInput: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  generateButton: {
    flex: 1,
    backgroundColor: '#B1810B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeOptionsList: {
    maxHeight: 300,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
  },
  closeModalButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  timeSelector: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  customTimeInput: {
    marginTop: 8,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
    marginHorizontal: 2,
  },
  editButton: {
    backgroundColor: '#B1810B',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  editContainer: {
    marginBottom: 16,
  },
  editInput: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 8,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#B1810B',
  },
  editActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addCourseContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addCourseInput: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  addCourseButton: {
    backgroundColor: '#B1810B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addCourseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  suggestionsContainer: {
    display: 'none',
  },
  suggestionsContainerBelow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    maxHeight: 200,
    width: '100%',
    zIndex: 10,
    position: 'relative',
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
});