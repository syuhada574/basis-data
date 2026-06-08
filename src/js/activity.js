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
   * @param {number} [limit=20]
   * @returns {Promise<{data: Array|null, error: any}>}
   */
  async getRecent(userId, limit = 20) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  },

  /**
   * Format activity log for display
   * @param {object} log 
   * @returns {string}
   */
  formatAction(log) {
    const actionMap = {
      'create_service': 'Membuat layanan baru',
      'update_service': 'Mengubah layanan',
      'delete_service': 'Menghapus layanan',
      'create_order': 'Membuat pesanan',
      'accept_order': 'Menerima pesanan',
      'complete_order': 'Menyelesaikan pesanan',
      'create_review': 'Memberikan ulasan'
    };

    return actionMap[log.action] || log.action;
  },

  /**
   * Get icon for activity action
   * @param {string} action
   * @returns {string}
   */
  getIcon(action) {
    const iconMap = {
      'create_service': '🛠️',
      'update_service': '✏️',
      'delete_service': '🗑️',
      'create_order': '🛒',
      'accept_order': '✅',
      'complete_order': '🎉',
      'create_review': '⭐'
    };

    return iconMap[action] || '📋';
  },

  /**
   * Format timestamp for display
   * @param {string} isoDate
   * @returns {string}
   */
  formatTime(isoDate) {
    if (!isoDate) return '';
    try {
      return new Date(isoDate).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }
};

// Activity action constants
const ACTIVITY_ACTIONS = {
  SERVICE_CREATED: 'create_service',
  ORDER_COMPLETED: 'complete_order',
  REVIEW_GIVEN: 'create_review',
};

const TARGET_TYPES = {
  SERVICE: 'service',
  ORDER: 'order',
  REVIEW: 'review',
};

// Convenience logging function
async function logActivity(userId, action, targetType, targetId) {
  return Activity.log(userId, action, targetType, targetId);
}

export { Activity, logActivity, ACTIVITY_ACTIONS, TARGET_TYPES };
export default Activity;
