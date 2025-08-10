import { collection, getDocs, query, limit, orderBy, startAt } from 'firebase/firestore';
import { db } from '../firebase';

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

  return { getRandomQuestion };
}