import { supabase } from './supabase.js';
import { Auth } from './auth.js';
import { Navigation } from './navigation.js';
import { Toast } from './toast.js';
import { OrderUtils } from './orderUtils.js';
import { Notifications } from './notifications.js';
import { Realtime } from './realtime.js';
import { ProgressBar } from './progressBar.js';
import { Activity, logActivity, ACTIVITY_ACTIONS, TARGET_TYPES } from './activity.js';

// CUSTOMER DASHBOARD
// Responsibilities:
// - Show stats
// - List customer orders as modern cards
// - Detail order section
// - Review & rating (only for completed orders)
// - Chat button (order-scoped chat thread)
// - Notifications list + realtime updates

const CustomerDashboard = {
  els: {
    content: null,
    stats: null,
    ordersGrid: null,
    notificationsList: null,
  },

  state: {
    orders: [],
    selectedOrderId: null,
    notifications: [],
  },

  async init() {
    await Auth.init();
    if (!Auth.currentUser) {
      this.renderNotLoggedIn();
      return;
    }

    this.els.content = document.getElementById('dashboard-content');
    this.els.stats = document.getElementById('customer-stats');
    this.els.ordersGrid = document.getElementById('customer-orders-grid');
    this.els.notificationsList = document.getElementById('customer-notifications-list');

    if (!this.els.content) return;

    this.renderShell();
    await this.refreshAll();

    this.setupRealtime();
  },

  renderNotLoggedIn() {
    if (!this.els.content) return;
    this.els.content.innerHTML = `<div class="loading">Please <a href="/src/login.html">login</a></div>`;
  },

  renderShell() {
    if (!this.els.content) return;

    this.els.content.innerHTML = `
      <section id="section-dashboard">
        <div class="card dashboard-card">
          <h1 class="dashboard-title">Customer Dashboard</h1>
          <div id="customer-aggregate-progress" class="aggregate-progress-wrapper"></div>
          <div id="customer-stats" class="stats-grid"></div>
        </div>
      </section>

      <section id="section-orders" class="dashboard-section">
        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Your Orders</h2>
            <span class="muted" id="orders-count">-</span>
          </div>
          <div id="customer-orders-grid" class="orders-grid"></div>
          <div id="orders-empty" class="empty-state" style="display:none;">
            <div style="font-size:3rem;margin-bottom:0.5rem;">&#128722;</div>
            <h4>Belum ada order</h4>
            <p>Saat Anda memesan jasa, order akan muncul di sini.</p>
            <a href="/src/index.html" class="primary-btn" style="margin-top:1rem;display:inline-block;text-decoration:none;">&#128269; Cari Service</a>
          </div>
        </div>

        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Order Detail</h2>
          </div>
          <div id="order-detail" class="order-detail">
            <div class="empty-detail">
              <p>Select an order to see details.</p>
            </div>
          </div>

          <div id="review-area" class="review-area"></div>
        </div>
      </section>

      <div class="dashboard-section">
        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Notifications</h2>
            <button id="mark-all-read-btn" class="small-btn" type="button">Mark all read</button>
          </div>
          <div id="customer-notifications-list" class="notifications-list"></div>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Recent Activity</h2>
            <span class="muted" id="activity-count">-</span>
          </div>
          <div id="customer-activity-list" class="activity-list"></div>
        </div>
      </div>
    `;

    // Hide initial loading indicator
    const initialLoading = document.getElementById('initial-loading');
    if (initialLoading) initialLoading.style.display = 'none';

    // Rebind els after innerHTML
    this.els.stats = document.getElementById('customer-stats');
    this.els.ordersGrid = document.getElementById('customer-orders-grid');
    this.els.notificationsList = document.getElementById('customer-notifications-list');

    document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
      const { error } = await Notifications.markAllRead(Auth.currentUser.id);
      if (error) Toast.error(error.message);
      else {
        await this.refreshNotifications();
        await Navigation.loadBadges();
      }
    });

    document.getElementById('order-detail')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const orderId = btn.getAttribute('data-order-id');

      if (action === 'chat') {
        // open chat.html and initialize order chat thread
        // We'll route by setting query params (safer than global functions)
        window.location.href = `/src/chat.html?orderId=${orderId}`;
      }
    });
  },

  async refreshAll() {
    await Promise.all([
      this.loadAggregateProgress(),
      this.loadStats(),
      this.loadOrders(),
      this.refreshNotifications(),
      this.loadRecentActivity(),
    ]);
  },

  async loadRecentActivity() {
    const userId = Auth.currentUser.id;
    const { data, error } = await Activity.getRecent(userId, 20);

    const activityList = document.getElementById('customer-activity-list');
    const activityCount = document.getElementById('activity-count');
    
    if (!activityList) return;

    if (error) {
      activityList.innerHTML = `<div class="empty-state"><p>Gagal memuat aktivitas.</p></div>`;
      return;
    }

    if (!data || data.length === 0) {
      activityList.innerHTML = `<div class="empty-state"><p>Belum ada aktivitas.</p></div>`;
      if (activityCount) activityCount.textContent = '0 aktivitas';
      return;
    }

    if (activityCount) activityCount.textContent = `${data.length} aktivitas`;

    activityList.innerHTML = data.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${Activity.getIcon(activity.action)}</div>
        <div class="activity-content">
          <div class="activity-action">${Activity.formatAction(activity)}</div>
          <div class="activity-time muted">${Activity.formatTime(activity.created_at)}</div>
        </div>
      </div>
    `).join('');
  },

  // Aggregate project progress across all of this customer's orders
  async loadAggregateProgress() {
    const container = document.getElementById('customer-aggregate-progress');
    if (!container || !Auth.currentUser) return;
    await ProgressBar.loadAndRender(container, Auth.currentUser.id, 'customer', 'Project Progress');
  },

  async loadStats() {
    const userId = Auth.currentUser.id;

    const { count: totalOrders, error: cErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId);

    if (cErr) {
      Toast.error('Failed to load total orders');
      return;
    }

    const { data: activeOrders } = await supabase
      .from('orders')
      .select('status')
      .eq('customer_id', userId)
      .in('status', ['accepted', 'in_progress', 'revision']);

    const { data: finishedOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', userId)
      .eq('status', 'completed');

    const { data: freelancers } = await supabase
      .from('orders')
      .select('freelancer_id')
      .eq('customer_id', userId)
      .not('freelancer_id', 'is', null);

    const distinct = new Set((freelancers || []).map((x) => x.freelancer_id));

    this.els.stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalOrders || 0}</div>
        <div class="stat-label">Total Order</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${activeOrders?.length || 0}</div>
        <div class="stat-label">Order Aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${finishedOrders?.length || 0}</div>
        <div class="stat-label">Order Selesai</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${distinct.size}</div>
        <div class="stat-label">Freelancer Pernah Digunakan</div>
      </div>
    `;
  },

  async loadOrders() {
    const userId = Auth.currentUser.id;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total_price,
        created_at,
        notes,
        services(title),
        freelancer:profiles!orders_freelancer_id_fkey(name),
        customer:profiles!orders_customer_id_fkey(name)
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      Toast.error(error.message);
      return;
    }

    this.state.orders = data || [];

    document.getElementById('orders-count').textContent = `${this.state.orders.length} orders`;

    const emptyEl = document.getElementById('orders-empty');
    if (!this.state.orders.length) {
      emptyEl.style.display = 'block';
      this.els.ordersGrid.innerHTML = '';
      return;
    }
    emptyEl.style.display = 'none';

    this.els.ordersGrid.innerHTML = this.state.orders
      .map((o) => {
        const meta = OrderUtils.statusToMeta(o.status);
        return `
          <div class="order-card" role="button" tabindex="0" data-order-id="${o.id}">
            <div class="order-card-top">
              <div class="order-title">${o.services?.title || 'Service'}</div>
              <div class="status-badge ${meta.badgeClass}">${meta.label}</div>
            </div>
            <div class="order-card-body">
              <div class="muted">Freelancer</div>
              <div class="order-card-line">${o.freelancer?.name || '-'}</div>

              <div class="muted">Harga</div>
              <div class="order-card-line">${OrderUtils.formatCurrency(o.total_price)}</div>

              <div class="muted">Tanggal</div>
              <div class="order-card-line">${new Date(o.created_at).toLocaleDateString()}</div>
            </div>
            <div class="order-card-actions">
              <button class="ghost-btn" type="button" data-action="detail" data-order-id="${o.id}">Detail</button>
              <button class="primary-btn" type="button" data-action="chat" data-order-id="${o.id}">Chat</button>
            </div>
          </div>
        `;
      })
      .join('');

    // Click handlers
    this.els.ordersGrid.querySelectorAll('.order-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const orderId = card.getAttribute('data-order-id');
        await this.showOrderDetail(orderId);
      });
    });

    this.els.ordersGrid.querySelectorAll('[data-action="detail"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        await this.showOrderDetail(orderId);
        // Scroll to order detail section
        const detailEl = document.getElementById('order-detail');
        if (detailEl) {
          setTimeout(() => {
            detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      });
    });

    this.els.ordersGrid.querySelectorAll('[data-action="chat"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        window.location.href = `/src/chat.html?orderId=${orderId}`;
      });
    });

    // auto select first
    await this.showOrderDetail(this.state.orders[0]?.id);
  },

  async showOrderDetail(orderId) {
    this.state.selectedOrderId = orderId;

    const detail = await OrderUtils.getOrderDetail(orderId);
    if (detail.error || !detail.data) {
      Toast.error('Failed to load order detail');
      return;
    }

    const o = detail.data;
    const meta = OrderUtils.statusToMeta(o.status);

    document.getElementById('order-detail').innerHTML = `
      <div class="detail-row">
        <div class="detail-label">Nama layanan</div>
        <div class="detail-value">${o.services?.title || '-'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Nama freelancer</div>
        <div class="detail-value">${o.freelancer?.name || '-'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Harga</div>
        <div class="detail-value">${OrderUtils.formatCurrency(o.total_price)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Tanggal order</div>
        <div class="detail-value">${new Date(o.created_at).toLocaleString()}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Status</div>
        <div class="detail-value"><span class="status-pill ${meta.badgeClass}">${meta.label}</span></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Catatan customer</div>
        <div class="detail-value">${o.notes || '-'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Progress Project</div>
        <div class="detail-value" id="customer-progress-${orderId}">
          <div class="loading">Loading progress...</div>
        </div>
      </div>
    `;

    // Load & render project progress for this order
    this.renderCustomerProgress(orderId);

    await this.renderReviewArea(o);
  },

  async renderCustomerProgress(orderId) {
    const progressContainer = document.getElementById(`customer-progress-${orderId}`);
    if (!progressContainer) return;

    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      progressContainer.innerHTML = `<div class="muted">Failed to load progress.</div>`;
      return;
    }

    if (!data?.length) {
      progressContainer.innerHTML = `<div class="muted">No progress updates yet.</div>`;
      return;
    }

    const total = data.length;
    const done = data.filter((p) => p.completed).length;

    progressContainer.innerHTML = `
      <div style="margin-bottom:0.75rem;">
        <div style="font-size:0.875rem; font-weight:600; margin-bottom:0.35rem;">Progress: ${done}/${total}</div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${total > 0 ? (done / total) * 100 : 0}%;"></div>
        </div>
      </div>
      ${data
        .map((p) => {
          return `
            <div class="progress-item" style="opacity:${p.completed ? 0.7 : 1};">
              <div class="progress-check ${p.completed ? 'progress-checked' : ''}" style="display:inline-block; width:22px; height:22px; line-height:22px; text-align:center; border-radius:50%; border:2px solid #d1d5db; font-size:12px; margin-right:0.5rem; flex-shrink:0;">
                ${p.completed ? '✓' : ''}
              </div>
              <div class="progress-content" style="flex:1;">
                <div class="progress-title" style="font-weight:500;">${p.title}</div>
                <div class="progress-meta muted" style="font-size:0.8rem;">${new Date(p.created_at).toLocaleString()}</div>
              </div>
              ${p.completed ? '<span class="status-badge status-completed" style="font-size:0.7rem;">Done</span>' : '<span class="status-badge status-in-progress" style="font-size:0.7rem;">In Progress</span>'}
            </div>
          `;
        })
        .join('')}
    `;
  },

  async renderReviewArea(order) {
    const reviewArea = document.getElementById('review-area');
    if (!reviewArea) return;

    // Show review form only if completed
    if (order.status !== 'completed') {
      reviewArea.innerHTML = `<div class="empty-detail"><p>Review available after order is completed.</p></div>`;
      return;
    }

    // Check if already reviewed by this customer
    const { data: existing, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', order.id)
      .eq('reviewer_id', Auth.currentUser.id)
      .maybeSingle();

    if (error) {
      Toast.error('Failed to check review');
      return;
    }

    if (existing) {
      reviewArea.innerHTML = `<div class="success">Thanks! Your review has been submitted.</div>`;
      return;
    }

    reviewArea.innerHTML = `
      <div class="review-box">
        <h3>Review & Rating</h3>
        <p class="muted">Give your rating from 1 to 5 and write a short comment.</p>
        <form id="review-form">
          <div class="form-group">
            <label>Rating</label>
            <select id="review-rating" required>
              <option value="">Select...</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div class="form-group">
            <label>Ulasan</label>
            <textarea id="review-comment" rows="4" placeholder="What did you think?" required></textarea>
          </div>
          <button type="submit">Submit Review</button>
        </form>
      </div>
    `;

    const form = document.getElementById('review-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rating = parseInt(document.getElementById('review-rating').value, 10);
      const comment = document.getElementById('review-comment').value.trim();

      const { data: insertData, error: insertErr } = await supabase
        .from('reviews')
        .insert({
          order_id: order.id,
          reviewer_id: Auth.currentUser.id,
          reviewed_id: order.freelancer_id,
          rating,
          comment,
        })
        .select()
        .single();

      if (insertErr) {
        Toast.error(insertErr.message);
        return;
      }

      // Log activity for review submission
      await logActivity(
        Auth.currentUser.id,
        ACTIVITY_ACTIONS.REVIEW_GIVEN,
        TARGET_TYPES.REVIEW,
        insertData.id
      );

      Toast.success('Review berhasil dikirim');
      await this.showOrderDetail(order.id);
      await this.refreshNotifications();
    });
  },

  async refreshNotifications() {
    const userId = Auth.currentUser.id;
    const res = await Notifications.loadForUser(userId);
    if (res.error) return;

    this.state.notifications = res.data || [];
    Notifications.renderList(this.els.notificationsList, this.state.notifications);
    Notifications.setupClickHandlers(this.els.notificationsList, async () => {
      // Refresh navigation badges when a notification is clicked
      await Navigation.loadBadges();
    });
  },

  setupRealtime() {
    if (!Auth.currentUser?.id) return;

    // Notifications realtime
    Notifications.subscribe(Auth.currentUser.id, () => this.refreshNotifications());

    // Progress realtime: refresh progress display when data changes for current selected order.
    // Single existing channel is reused for BOTH:
    //   1. The per-order checklist (renderCustomerProgress)
    //   2. The aggregate project progress bar (loadAggregateProgress)
    // so we do not create a second subscription.
    Realtime.subscribeTable({
      channelName: `project_progress_customer_${Auth.currentUser.id}`,
      table: 'project_progress',
      event: '*',
      onChange: () => {
        if (this.state.selectedOrderId) {
          this.renderCustomerProgress(this.state.selectedOrderId);
        }
        this.loadAggregateProgress();
      },
    });
  },
};

export { CustomerDashboard };

