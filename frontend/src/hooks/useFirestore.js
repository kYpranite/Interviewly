import { collection, getDocs, query, limit, orderBy, startAt, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from './useAuth';

export function useQuestions() {
  const getRandomQuestion = async () => {
    try {
      // Get total count of questions first
      const questionsRef = collection(db, 'questions');
      const snapshot = await getDocs(questionsRef);
      const totalQuestions = snapshot.size;
      
      if (totalQuestions === 0) {
        throw new Error('No questions found');
      }
      
      // Generate random index
      const randomIndex = Math.floor(Math.random() * totalQuestions);
      
      // Get all questions and return the random one
      const questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return questions[randomIndex];
    } catch (error) {
      console.error('Error getting random question:', error);
      throw error;
    }
  };

  const getQuestionById = async (questionId) => {
    try {
      const questionRef = doc(db, 'questions', questionId);
      const questionDoc = await getDoc(questionRef);
      
      if (questionDoc.exists()) {
        return {
          id: questionDoc.id,
          ...questionDoc.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting question by ID:', error);
      throw error;
    }
  };

  return { getRandomQuestion, getQuestionById };
}

export function useSessions() {
  const { user } = useAuth();

  // Upload transcript to Firebase Storage as JSON
  const uploadTranscriptToStorage = async (transcript, sessionId) => {
    try {
      if (!transcript || transcript.length === 0) {
        return null;
      }

      // Create JSON blob
      const transcriptJson = JSON.stringify(transcript, null, 2);
      const blob = new Blob([transcriptJson], { type: 'application/json' });
      
      // Create storage reference
      const storageRef = ref(storage, `transcripts/${user.uid}/${sessionId}.json`);
      
      // Upload file
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading transcript:', error);
      throw error;
    }
  };

  const createSession = async ({ 
    startTime, 
    endTime, 
    language, 
    questionId, 
    questionName, 
    finalScore 
  }) => {
    try {
      if (!user) {
        throw new Error('User must be authenticated to create a session');
      }

      const durationSec = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
      
      const sessionData = {
        createdAt: new Date(startTime),
        endedAt: new Date(endTime),
        durationSec,
        language,
        companyTag: "Google",
        question: { 
          id: questionId, 
          name: questionName 
        },
        hasFeedback: true,
        finalScore
      };

      const userSessionsRef = collection(db, 'users', user.uid, 'sessions');
      const docRef = await addDoc(userSessionsRef, sessionData);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };

  const createSessionWithFeedback = async ({ 
    startTime, 
    endTime, 
    language, 
    questionId, 
    questionName, 
    finalScore,
    evaluation,
    codeSubmission,
    transcript
  }) => {
    try {
      if (!user) {
        throw new Error('User must be authenticated to create a session');
      }

      const durationSec = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
      
      // Create session data
      const sessionData = {
        createdAt: new Date(startTime),
        endedAt: new Date(endTime),
        durationSec,
        language,
        companyTag: "Google",
        question: { 
          id: questionId, 
          name: questionName 
        },
        hasFeedback: true,
        finalScore
      };

      // Create session document
      const userSessionsRef = collection(db, 'users', user.uid, 'sessions');
      const sessionDocRef = await addDoc(userSessionsRef, sessionData);
      const sessionId = sessionDocRef.id;

      // Upload transcript to storage and get URL
      const transcriptUrl = await uploadTranscriptToStorage(transcript, sessionId);

      // Create feedback document with the same ID
      const feedbackData = {
        timeOfInterview: new Date(startTime),
        endedAt: new Date(endTime),
        question: questionName,
        criterions: evaluation.criteria?.map(criterion => ({
          nameOfCriterion: criterion.name,
          scoreOfCriterion: criterion.score, // Keep original 1-5 scale
          reasoningForScore: criterion.justification
        })) || [],
        language,
        code: codeSubmission,
        finalScore,
        feedbackFromLLM: evaluation.overall_feedback || '',
        transcriptUrl: transcriptUrl // Store URL instead of full transcript
      };

      const feedbackRef = collection(db, 'users', user.uid, 'sessions', sessionId, 'feedback');
      await addDoc(feedbackRef, feedbackData);
      
      console.log('Session and feedback created with ID:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('Error creating session with feedback:', error);
      throw error;
    }
  };

  const getUserSessions = async () => {
    try {
      if (!user) {
        throw new Error('User must be authenticated to fetch sessions');
      }

      const userSessionsRef = collection(db, 'users', user.uid, 'sessions');
      const sessionsQuery = query(userSessionsRef, orderBy('createdAt', 'desc'));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      const sessions = await Promise.all(
        sessionsSnapshot.docs.map(async (sessionDoc) => {
          const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
          
          // Fetch feedback for this session
          const feedbackRef = collection(db, 'users', user.uid, 'sessions', sessionDoc.id, 'feedback');
          const feedbackSnapshot = await getDocs(feedbackRef);
          
          let feedbackData = null;
          if (!feedbackSnapshot.empty) {
            feedbackData = feedbackSnapshot.docs[0].data();
          }
          
          return {
            ...sessionData,
            feedback: feedbackData
          };
        })
      );
      
      return sessions;
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  };

  return { createSession, createSessionWithFeedback, getUserSessions };
}