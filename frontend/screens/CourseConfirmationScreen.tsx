import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { Swipeable } from 'react-native-gesture-handler';

type CourseConfirmationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CourseConfirmation'
>;
type CourseConfirmationScreenRouteProp = RouteProp<RootStackParamList, 'CourseConfirmation'>;

interface Props {
  navigation: CourseConfirmationScreenNavigationProp;
  route: CourseConfirmationScreenRouteProp;
}

export default function CourseConfirmationScreen({ navigation, route }: Props) {
  const { courses: initialCourses } = route.params;
  const [courses, setCourses] = useState(initialCourses);
  const [newCourse, setNewCourse] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  const handleDeleteCourse = (index: number) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            swipeableRefs.current[index]?.close();
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCourses(prev => prev.filter((_, i) => i !== index));
            swipeableRefs.current[index]?.close();
          },
        },
      ]
    );
  };

  const handleEditCourse = (index: number) => {
    setEditingIndex(index);
    setEditingText(courses[index]);
    swipeableRefs.current[index]?.close();
  };

  const handleSaveEdit = () => {
    if (editingText.trim() && editingIndex !== null) {
      setCourses(prev => {
        const updated = [...prev];
        updated[editingIndex] = editingText.trim();
        return updated;
      });
    }
    setEditingIndex(null);
  };

  const handleAddCourse = () => {
    if (newCourse.trim()) {
      setCourses(prev => [...prev, newCourse.trim()]);
      setNewCourse('');
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

  const handleConfirm = () => {
    navigation.navigate('ScheduleInput', { courses });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Your Courses</Text>
            <Text style={styles.subtitle}>
              Review and manage your courses. You can:
            </Text>
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>• Swipe left on a course to edit or delete it</Text>
              <Text style={styles.instructionText}>• Add new courses using the input below</Text>
              <Text style={styles.instructionText}>• Edit course codes by swiping and tapping edit</Text>
            </View>
          </View>

          <View style={styles.addCourseContainer}>
            <TextInput
              style={styles.addCourseInput}
              value={newCourse}
              onChangeText={setNewCourse}
              placeholder="Enter new course code"
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.addCourseButton}
              onPress={handleAddCourse}
            >
              <Text style={styles.addCourseButtonText}>Add Course</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.coursesList}>
            {courses.map((course, index) => (
              <Swipeable
                key={index}
                ref={ref => {
                  if (ref) {
                    swipeableRefs.current[index] = ref;
                  }
                }}
                renderRightActions={() => renderRightActions(index)}
                friction={2}
                rightThreshold={40}
                overshootRight={false}
              >
                <View style={styles.courseItem}>
                  {editingIndex === index ? (
                    <View style={styles.editContainer}>
                      <View style={styles.editHeader}>
                        <Text style={styles.editTitle}>Edit Course Code</Text>
                        <TouchableOpacity
                          style={styles.closeEditButton}
                          onPress={() => setEditingIndex(null)}
                        >
                          <Text style={styles.closeEditButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.editInput}
                        value={editingText}
                        onChangeText={setEditingText}
                        placeholder="Enter course code"
                        autoFocus
                        autoCapitalize="characters"
                        returnKeyType="done"
                        onSubmitEditing={handleSaveEdit}
                      />
                      <View style={styles.editButtons}>
                        <TouchableOpacity
                          style={[styles.editActionButton, styles.cancelButton]}
                          onPress={() => setEditingIndex(null)}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editActionButton, styles.saveButton]}
                          onPress={handleSaveEdit}
                        >
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.courseText}>{course}</Text>
                  )}
                </View>
              </Swipeable>
            ))}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm & Continue</Text>
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
    marginBottom: 12,
  },
  instructions: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
  coursesList: {
    marginBottom: 24,
  },
  courseItem: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  courseText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
  },
  editButton: {
    backgroundColor: '#B1810B',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  swipeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  editContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeEditButton: {
    padding: 4,
  },
  closeEditButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  editInput: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#B1810B',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  confirmButton: {
    flex: 1,
    backgroundColor: '#B1810B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});