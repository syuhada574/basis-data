import { supabase } from './supabase.js';
import { ServiceAPI } from './service.js';

const Booking = {
  async loadBookings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // All orders (customer + freelancer)
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select(`
        *,
        services(title),
        profiles (*)
      `)
      .or(`customer_id.eq.${user.id},freelancer_id.eq.${user.id}`);
      
    if (error) {
      console.error('Load bookings error:', error.message || error);
      return [];
    }
    
    return allOrders || [];
  },
  
  async renderBookings(containerId = 'bookings-list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const bookings = await this.loadBookings();
    
    if (!bookings.length) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:2rem 1.5rem;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📋</div>
          <h4 style="margin:0 0 0.5rem 0; color:#374151;">Belum ada booking</h4>
          <p style="color:#9ca3af; margin:0;">Booking Anda akan muncul di sini setelah Anda melakukan pemesanan.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = bookings.map(order => `
      <li class="booking-item ${order.status}">
        <strong>${order.services?.title || 'Service'}</strong> 
        - ${order.profiles?.name || 'Customer'} 
        - $${order.total_price} 
        - ${order.status} 
        - ${new Date(order.created_at).toLocaleDateString()}
        ${order.status === 'pending' ? `<button onclick="Booking.updateStatus('${order.id}', 'accepted')">Accept</button>` : ''}
      </li>
    `).join('') || '<li>No bookings yet</li>'; 
  },
  
  async updateStatus(orderId, status) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
      
    if (error) {
      alert('Update failed: ' + error.message);
    } else {
      this.renderBookings();
    }
  },
  
  init() {
    this.renderBookings();
    // Note: Polling removed. Use Realtime subscriptions instead (see dashboardFreelancer.js).
  }
};

export { Booking };

