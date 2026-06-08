import { supabase } from './supabase.js';
import { Toast } from './toast.js';

const Notifications = {
  async loadForUser(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return { data: data || [], error };
  },

  async markRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return { error };
  },

  async markAllRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { error };
  },

  async subscribe(userId, onUpdate) {
    // Realtime updates for notifications
    return supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onUpdate?.();
        }
      )
      .subscribe();
  },

  renderList(containerEl, notifications) {
    if (!containerEl) return;

    if (!notifications?.length) {
      containerEl.innerHTML = `
        <div class="empty-state">
          <h4 style="margin-bottom:0.5rem;">No notifications</h4>
          <p style="color:#6b7280;">You're all caught up.</p>
        </div>
      `;
      return;
    }

    function escNotif(s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    containerEl.innerHTML = notifications
      .map((n) => {
        const readClass = n.is_read ? 'is-read' : 'is-unread';
        return `
          <div class="notification-item ${readClass}" data-id="${n.id}">
            <div class="notification-title">${escNotif(n.title) || 'Notification'}</div>
            <div class="notification-message">${escNotif(n.message)}</div>
            <div class="notification-time">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        `;
      })
      .join('');
  },

  setupClickHandlers(containerEl, onClick) {
    if (!containerEl) return;
    containerEl.addEventListener('click', async (e) => {
      const item = e.target.closest('.notification-item');
      if (!item) return;

      const id = item.getAttribute('data-id');
      if (!id) return;

      const { error } = await this.markRead(id);
      if (error) {
        Toast.error('Failed to mark notification as read');
        return;
      }

      onClick?.(id);
      item.classList.remove('is-unread');
      item.classList.add('is-read');
      
      // Refresh notification badge in sidebar after marking as read
      const { Navigation } = await import('./navigation.js');
      Navigation.loadBadges();
    });
  },
};

export { Notifications };

