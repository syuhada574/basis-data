/**
 * Activity Log Helper
 * Handles all activity logging functionality
 */

import { supabase } from './supabase.js';

const Activity = {
  /**
   * Log an activity
   * @param {string} userId 
   * @param {string} action 
   * @param {string} [targetType] 
   * @param {string} [targetId] 
   */
  async log(userId, action, targetType = null, targetId = null) {
    const { error } = await supabase
      .from('activity_logs')
      .insert([
        { 
          user_id: userId, 
          action: action,
          target_type: targetType,
          target_id: targetId 
        }
      ]);

    if (error) console.error('Activity log error:', error);
  },

  /**
   * Get recent activities for a user
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getRecent(userId) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { descending: true })
      .limit(20);

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data.map(log => this.formatAction(log));
  },

  /**
   * Format activity log for display
   * @param {object} log 
   * @returns {object}
   */
  formatAction(log) {
    const actionMap = {
      'create_service': 'Membuat layanan baru',
      'update_service': 'Mengubah layanan',
      'create_order': 'Membuat pesanan',
      'accept_order': 'Menerima pesanan',
      'complete_order': 'Menyelesaikan pesanan',
      'create_review': 'Memberikan ulasan'
    };

    return {
      ...log,
      formatted_action: actionMap[log.action] || log.action
    };
  }
};

// Activity action constants
const ACTIVITY_ACTIONS = {
  REVIEW_GIVEN: 'create_review',
};

const TARGET_TYPES = {
  REVIEW: 'review',
};

// Convenience logging function
async function logActivity(userId, action, targetType, targetId) {
  return Activity.log(userId, action, targetType, targetId);
}

export { Activity, logActivity, ACTIVITY_ACTIONS, TARGET_TYPES };
export default Activity;
