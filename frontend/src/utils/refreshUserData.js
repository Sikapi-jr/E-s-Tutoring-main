// Utility to refresh user data if required fields are missing
import api from '../api';

export const refreshUserDataIfNeeded = async (user, setUser) => {
  if (!user) return;

  // Check if tutor_referral_code is missing for tutors
  if (user.roles === 'tutor' && !user.tutor_referral_code) {
    try {
      console.log('Refreshing user data - tutor_referral_code missing');
      const response = await api.get('/api/user/');

      if (response.data) {
        // Update user with fresh data
        setUser(response.data);
        console.log('User data refreshed successfully');
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }

  return false;
};
