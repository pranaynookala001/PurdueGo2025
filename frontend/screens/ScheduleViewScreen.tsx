import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { Ionicons } from '@expo/vector-icons';

type ScheduleViewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ScheduleView'
>;
type ScheduleViewScreenRouteProp = RouteProp<RootStackParamList, 'ScheduleView'>;

interface Props {
  navigation: ScheduleViewScreenNavigationProp;
  route: ScheduleViewScreenRouteProp;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM
const HOUR_HEIGHT = 60; // Height for each hour block in pixels
const TIMELINE_WIDTH = Dimensions.get('window').width - 80; // Account for hour labels and padding

export default function ScheduleViewScreen({ navigation, route }: Props) {
  const { schedule = {}, scheduleDetails = [] } = route.params;
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState('Monday');

  const parseTime = (timeStr: string) => {
    const [timeRange] = timeStr.split(' at ');
    const [startTimeStr] = timeRange.split('–');
    const [timeValue, period] = startTimeStr.trim().split(' ');
    const [hours, minutes] = timeValue.split(':').map(Number);
    let hour = hours;
    if (period === 'PM' && hours !== 12) hour += 12;
    if (period === 'AM' && hours === 12) hour = 0;
    return hour + minutes / 60;
  };

  const renderWeeklyView = () => (
    <ScrollView style={styles.weeklyContainer} showsVerticalScrollIndicator={false}>
      {DAYS.map(day => (
        <View key={day} style={styles.dayContainer}>
          <Text style={styles.dayHeader}>{day}</Text>
          <View style={styles.classesContainer}>
            {schedule[day] && schedule[day].length > 0 ? (
              schedule[day].map((item: any, index: number) => (
                <View key={index} style={styles.classCard}>
                  <Text style={styles.classText}>{item.info}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noClassCard}>
                <Text style={styles.noClassText}>No classes scheduled</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const handleDayChange = (direction: 'prev' | 'next') => {
    const currentIndex = DAYS.indexOf(selectedDay);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : DAYS.length - 1;
    } else {
      newIndex = currentIndex < DAYS.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedDay(DAYS[newIndex]);
  };

  const renderDailyView = () => (
    <View style={styles.dailyContainer}>
      <View style={styles.selectedDayContainer}>
        <Text style={styles.selectedDayHeader}>{selectedDay}</Text>
        <ScrollView style={styles.timelineContainer}>
          <View style={styles.timeline}>
            {HOURS.map(hour => (
              <View key={hour} style={styles.hourBlock}>
                <Text style={styles.hourLabel}>
                  {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </Text>
                <View style={styles.hourLine} />
              </View>
            ))}
            {schedule[selectedDay] && schedule[selectedDay].map((item: any, index: number) => {
              const startTime = parseTime(item.startTime);
              const endTime = parseTime(item.endTime);
              const top = (startTime - 7) * HOUR_HEIGHT;
              const height = (endTime - startTime) * HOUR_HEIGHT;

              // Find the original course details for editing
              const originalCourseIndex = scheduleDetails.findIndex(
                (course: any) => course.code === (item.info.match(/([^ ]+) at (.+)/) ? item.info.match(/([^ ]+) at (.+)/)[1] : null) && // Extract course code
                  parseTime(course.startTime) === startTime &&
                  parseTime(course.endTime) === endTime
              );

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (item.type === 'class') { // Only navigate for class blocks
                      if (originalCourseIndex !== -1) {
                        navigation.navigate('ScheduleInput', { courses: scheduleDetails, editingIndex: originalCourseIndex });
                      } else {
                        // Fallback: If original course not found, navigate to add new class
                        navigation.navigate('ScheduleInput', { courses: scheduleDetails });
                      }
                    }
                  }}
                  style={[
                    styles.classBlock,
                    {
                      top,
                      height,
                      width: TIMELINE_WIDTH - 36, // Make block slightly smaller to fit
                      left: 60, // Adjust left position for better alignment
                      backgroundColor: item.color || styles.classBlock.backgroundColor, // Use item color or default
                    },
                  ]}
                >
                  <Text style={styles.classBlockTitle} numberOfLines={2}>
                    {item.info}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleDayChange('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="#B1810B" />
        </TouchableOpacity>
        <Text style={styles.navDayText}>{selectedDay}</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleDayChange('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="#B1810B" />
        </TouchableOpacity>
      </View>

      <View style={styles.scheduleButtonsContainer}>
        <TouchableOpacity
          style={styles.newScheduleButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.newScheduleButtonText}>Create New</Text>
          <Text style={styles.newScheduleButtonText}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modifyScheduleButton}
          onPress={() => navigation.navigate('ScheduleInput', { courses: scheduleDetails })}
        >
          <Text style={styles.modifyScheduleButtonText}>Modify Existing Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Schedule</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'weekly' && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode('weekly')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  viewMode === 'weekly' && styles.toggleButtonTextActive,
                ]}
              >
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'daily' && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode('daily')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  viewMode === 'daily' && styles.toggleButtonTextActive,
                ]}
              >
                Daily
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'weekly' ? renderWeeklyView() : renderDailyView()}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#B1810B',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  weeklyContainer: {
    flex: 1,
  },
  dayContainer: {
    marginBottom: 20,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B1810B',
    marginBottom: 8,
  },
  classesContainer: {
    gap: 8,
  },
  classCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#B1810B',
  },
  classText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  noClassCard: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noClassText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  dailyContainer: {
    flex: 1,
  },
  selectedDayContainer: {
    flex: 1,
  },
  selectedDayHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timelineContainer: {
    flex: 1,
    marginTop: 16,
  },
  timeline: {
    position: 'relative',
    paddingLeft: 60,
    paddingRight: 20,
  },
  hourBlock: {
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    position: 'absolute',
    left: -50,
    width: 45,
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  classBlock: {
    position: 'absolute',
    left: 60, // Fixed left position to align with hour labels
    backgroundColor: '#B1810B',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  classBlockTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  newScheduleButton: {
    backgroundColor: '#B1810B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1, // Make it take equal space
  },
  newScheduleButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  modifyScheduleButton: {
    backgroundColor: '#B1810B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1, // Make it take equal space
    marginLeft: 10, // Add some space between buttons
  },
  modifyScheduleButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  scheduleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  navDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});