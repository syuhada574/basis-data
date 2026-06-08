console.log('%c[dashboardFreelancer.js] VERSION: 2024-12-15-loadCategories-fixed', 'color:lime;font-weight:bold;');
import { supabase } from './supabase.js';
import { Auth } from './auth.js';
import { Toast } from './toast.js';
import { OrderUtils } from './orderUtils.js';
import { Notifications } from './notifications.js';
import { Realtime } from './realtime.js';
import { ProgressBar } from './progressBar.js';
import { Activity, logActivity, ACTIVITY_ACTIONS, TARGET_TYPES } from './activity.js';

const FreelancerDashboard = {
  els: {
    content: null,
    stats: null,
    servicesList: null,
    addServiceForm: null,
    ordersGrid: null,
    progressList: null,
  },

  state: {
    services: [],
    orders: [],
    selectedOrderId: null,
    categories: [],
  },



  async init() {
    await Auth.init();

    if (!Auth.currentUser) {
      this.renderNotLoggedIn();
      return;
    }

    if (Auth.currentUser.role !== 'freelancer') {
      this.renderAccessDenied();
      return;
    }

    this.els.content = document.getElementById('dashboard-content');
    if (!this.els.content) return;

    this.renderShell();

    // Load categories via ServiceAPI (proven to work in index.html) with
    // multiple fallback attempts + visible error to user.
    await this.loadCategories();

    this.bindUI();
    await Promise.all([
      this.loadAggregateProgress(),
      this.loadStats(),
      this.loadServices(),
      this.loadOrders(),
      this.loadRecentActivity(),
    ]);
    this.setupRealtime();
  },

  async loadCategories() {
    const catSelect = document.getElementById('service-category');
    if (!catSelect) {
      console.error('[loadCategories] #service-category element not in DOM');
      return;
    }

    // Strategy 1: direct Supabase query
    let cats = null;
    let catErr = null;
    try {
      const result = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      cats = result.data;
      catErr = result.error;
      console.log('[loadCategories] direct query result:', { count: cats?.length, error: catErr });
    } catch (e) {
      console.error('[loadCategories] direct query exception:', e);
      catErr = e;
    }

    // Strategy 2: if direct query failed or returned empty, try with explicit columns
    if (catErr || !cats || cats.length === 0) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, icon')
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          cats = data;
          catErr = null;
          console.log('[loadCategories] fallback query succeeded:', data.length);
        }
      } catch (e) {
        console.warn('[loadCategories] fallback query exception:', e);
      }
    }

    if (catErr) {
      console.error('[loadCategories] error:', catErr);
      this.state.categories = [];
      Toast.error('Gagal memuat daftar kategori. Periksa koneksi Anda.');
    } else {
      this.state.categories = cats || [];
    }

    // Clear select and populate
    catSelect.innerHTML = '<option value="">Pilih Kategori</option>';

    if (this.state.categories.length === 0) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.disabled = true;
      emptyOpt.textContent = '(Tidak ada kategori tersedia)';
      catSelect.appendChild(emptyOpt);
      console.warn('[loadCategories] no categories found in database');
      return;
    }

    this.state.categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      catSelect.appendChild(opt);
    });

    console.log('[loadCategories] populated', this.state.categories.length, 'categories');
  },
  async loadAggregateProgress() {
    const container = document.getElementById('freelancer-aggregate-progress');
    if (!container || !Auth.currentUser) return;
    await ProgressBar.loadAndRender(container, Auth.currentUser.id, 'freelancer', 'Project Progress');
  },

  async loadRecentActivity() {
    const userId = Auth.currentUser.id;
    const { data, error } = await Activity.getRecent(userId, 20);

    const activityList = document.getElementById('freelancer-activity-list');
    const activityCount = document.getElementById('freelancer-activity-count');
    
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

  renderNotLoggedIn() {
    this.els.content = document.getElementById('dashboard-content');
    if (this.els.content) {
      this.els.content.innerHTML = `<div class="loading">Please <a href="/src/login.html">login</a></div>`;
    }
  },

  renderAccessDenied() {
    if (this.els.content) {
      this.els.content.innerHTML = `<div class="card"><h2>Access denied</h2><p>This page is for freelancers.</p></div>`;
    }
  },

  renderShell() {
    this.els.content.innerHTML = `
      <div class="card dashboard-card" id="section-dashboard">
        <h1 class="dashboard-title">Freelancer Dashboard</h1>
        <div id="freelancer-aggregate-progress" class="aggregate-progress-wrapper"></div>
        <div id="freelancer-stats" class="stats-grid"></div>
      </div>

      <div class="dashboard-section" id="section-my-services">
        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Manajemen Jasa</h2>
          </div>

          <form id="add-service-form" class="service-form">
            <div class="form-group">
              <label>Judul</label>
              <input id="service-title" required />
            </div>
            <div class="form-group">
              <label>Deskripsi</label>
              <textarea id="service-desc" rows="4"></textarea>
            </div>
            <div class="form-group">
              <label>Harga</label>
              <input id="service-price" type="number" min="0" required />
            </div>
            <div class="form-group">
              <label>Kategori</label>
              <select id="service-category" required>
                <option value="">Pilih Kategori</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estimasi pengerjaan (days)</label>
              <input id="service-duration" type="number" min="1" />
            </div>
            <div class="form-group">
              <label>Thumbnail (image_url)</label>
              <input id="service-thumbnail" placeholder="Paste image URL" />
            </div>
            <button type="submit">Tambah Jasa</button>
          </form>

          <div id="services-list" class="orders-grid" style="margin-top:1.5rem;"></div>
        </div>
      </div>

      <div class="dashboard-section" id="section-orders">
        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Daftar Order</h2>
          </div>
          <div id="freelancer-orders-grid" class="orders-grid"></div>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Progress Project</h2>
          </div>
          <div id="progress-container" class="progress-container"></div>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="card dashboard-card">
          <div class="dashboard-section-header">
            <h2>Recent Activity</h2>
            <span class="muted" id="freelancer-activity-count">-</span>
          </div>
          <div id="freelancer-activity-list" class="activity-list"></div>
        </div>
      </div>
    `;

    const initialLoading = document.getElementById('initial-loading');
    if (initialLoading) initialLoading.style.display = 'none';

    this.els.stats = document.getElementById('freelancer-stats');
    this.els.servicesList = document.getElementById('services-list');
    this.els.ordersGrid = document.getElementById('freelancer-orders-grid');
    this.els.progressList = document.getElementById('progress-container');
    this.els.addServiceForm = document.getElementById('add-service-form');
  },

  bindUI() {
    this.els.addServiceForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('service-title').value.trim();
      const description = document.getElementById('service-desc').value.trim();
      const priceRaw = document.getElementById('service-price').value.trim();
      const category_id = document.getElementById('service-category').value.trim() || null;
      const durationRaw = document.getElementById('service-duration').value.trim();
      const image_url = document.getElementById('service-thumbnail').value.trim() || null;

      if (!title) {
        Toast.error('Judul wajib diisi');
        return;
      }
      if (!priceRaw) {
        Toast.error('Harga wajib diisi');
        return;
      }
      const price = parseFloat(priceRaw);
      if (!Number.isFinite(price) || price < 0) {
        Toast.error('Harga tidak valid');
        return;
      }
      if (!category_id) {
        Toast.error('Silakan pilih kategori');
        return;
      }

      let duration_days = null;
      if (durationRaw) {
        const parsedDuration = parseInt(durationRaw, 10);
        if (!Number.isFinite(parsedDuration) || parsedDuration < 1) {
          Toast.error('Estimasi pengerjaan tidak valid (minimal 1 hari)');
          return;
        }
        duration_days = parsedDuration;
      }

      const serviceData = {
        freelancer_id: Auth.currentUser.id,
        title,
        description,
        price,
        category_id,
        duration_days,
        images: image_url ? [image_url] : [],
        is_active: true,
      };

      const { data, error } = await supabase.from('services').insert([serviceData]).select().single();
      if (error) {
        Toast.error(error.message);
        return;
      }

      await logActivity(
        Auth.currentUser.id,
        ACTIVITY_ACTIONS.SERVICE_CREATED,
        TARGET_TYPES.SERVICE,
        data.id
      );

      Toast.success('Service ditambahkan');
      await this.loadServices();
      this.els.addServiceForm.reset();
    });
  },

  async loadStats() {
    const freelancerId = Auth.currentUser.id;

    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('freelancer_id', freelancerId);

    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('freelancer_id', freelancerId)
      .eq('status', 'pending');

    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('freelancer_id', freelancerId)
      .in('status', ['accepted', 'in_progress', 'revision']);

    const { data: completedOrders } = await supabase
      .from('orders')
      .select('id,total_price')
      .eq('freelancer_id', freelancerId)
      .eq('status', 'completed');

    const totalRevenue = (completedOrders || []).reduce((acc, x) => acc + Number(x.total_price || 0), 0);

    const { data: ratingAvgRow } = await supabase
      .from('reviews')
      .select('reviewed_id, rating')
      .eq('reviewed_id', freelancerId);

    const ratings = (ratingAvgRow || []).map((r) => Number(r.rating));
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

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
        <div class="stat-value">${pendingOrders?.length || 0}</div>
        <div class="stat-label">Menunggu Persetujuan</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${avg.toFixed(1)}</div>
        <div class="stat-label">Rating Rata-rata</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalRevenue.toFixed(2)}</div>
        <div class="stat-label">Total Pendapatan</div>
      </div>
    `;
  },

  async loadServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('freelancer_id', Auth.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      Toast.error(error.message);
      return;
    }

    this.state.services = data || [];

    if (!this.state.services.length) {
      this.els.servicesList.innerHTML = `<div class="empty-state"><h4>No services yet</h4><p>Add your first service above.</p></div>`;
      return;
    }

    this.els.servicesList.innerHTML = this.state.services
      .map((s) => {
        const thumb = s.images?.[0] || '';
        return `
          <div class="service-card order-card">
            <div class="order-card-top">
              <div>
                <div class="order-title">${s.title}</div>
                <div class="muted">$${s.price}</div>
              </div>
              <div class="status-badge ${s.is_active ? 'status-accepted' : 'status-cancelled'}">${s.is_active ? 'Active' : 'Inactive'}</div>
            </div>
            ${thumb ? `<img src="${thumb}" alt="thumbnail" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;" />` : ''}
            <div class="order-card-body">
              <div class="muted">${(s.description || '').substring(0, 110)}${(s.description || '').length > 110 ? '...' : ''}</div>
            </div>
            <div class="order-card-actions">
              <button class="ghost-btn" type="button" data-service-toggle="${s.id}">${s.is_active ? 'Deactivate' : 'Activate'}</button>
              <button class="ghost-btn" type="button" data-service-edit="${s.id}">Edit</button>
              <button class="danger-btn" type="button" data-service-delete="${s.id}">Delete</button>
            </div>
          </div>
        `;
      })
      .join('');

    this.els.servicesList.querySelectorAll('[data-service-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const serviceId = btn.getAttribute('data-service-toggle');
        const service = this.state.services.find((x) => x.id === serviceId);
        const next = !service.is_active;
        const { error } = await supabase.from('services').update({ is_active: next }).eq('id', serviceId);
        if (error) return Toast.error(error.message);
        Toast.success('Service updated');
        await this.loadServices();
      });
    });

    this.els.servicesList.querySelectorAll('[data-service-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const serviceId = btn.getAttribute('data-service-delete');
        const ok = confirm('Delete this service?');
        if (!ok) return;
        const { error } = await supabase.from('services').delete().eq('id', serviceId);
        if (error) return Toast.error(error.message);
        await Activity.log(Auth.currentUser.id, 'delete_service', 'service', serviceId);
        Toast.success('Service deleted');
        await this.loadServices();
      });
    });

    this.els.servicesList.querySelectorAll('[data-service-edit]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const serviceId = btn.getAttribute('data-service-edit');
        const service = this.state.services.find((x) => x.id === serviceId);
        const title = prompt('Edit title', service.title);
        if (title === null) return;
        const price = prompt('Edit price', String(service.price));
        if (price === null) return;

        const { error } = await supabase
          .from('services')
          .update({
            title,
            price: parseFloat(price),
          })
          .eq('id', serviceId);

        if (error) return Toast.error(error.message);
        Toast.success('Service edited');
        await this.loadServices();
      });
    });
  },

  async loadOrders() {
    const freelancerId = Auth.currentUser.id;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,status,notes,total_price,created_at,
        services(title),
        customer:profiles!orders_customer_id_fkey(name)
      `)
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false });

    if (error) {
      Toast.error(error.message);
      return;
    }

    this.state.orders = data || [];

    if (!this.state.orders.length) {
      this.els.ordersGrid.innerHTML = `<div class="empty-state"><h4>No incoming orders</h4><p>When customers book, orders will appear here.</p></div>`;
      return;
    }

    this.els.ordersGrid.innerHTML = this.state.orders
      .map((o) => {
        const meta = OrderUtils.statusToMeta(o.status);
        return `
          <div class="order-card" data-order-id="${o.id}">
            <div class="order-card-top">
              <div class="order-title">${o.services?.title || 'Service'}</div>
              <div class="status-badge ${meta.badgeClass}">${meta.label}</div>
            </div>
            <div class="order-card-body">
              <div class="muted">Customer</div>
              <div class="order-card-line">${o.customer?.name || '-'}</div>
              <div class="muted">Harga</div>
              <div class="order-card-line">${OrderUtils.formatCurrency(o.total_price)}</div>
              <div class="muted">Tanggal</div>

              <div class="order-card-line">${new Date(o.created_at).toLocaleDateString()}</div>
              ${o.notes ? `<div class="muted">Catatan</div><div class="order-card-line">${o.notes}</div>` : ''}
            </div>
            <div class="order-card-actions">
              ${o.status === 'pending' ? `
                <button class="primary-btn" type="button" data-accept="${o.id}">Accept</button>
                <button class="ghost-btn" type="button" data-reject="${o.id}">Reject</button>
              ` : ''}
              ${o.status !== 'completed' && o.status !== 'cancelled' ? `
                <button class="ghost-btn" type="button" data-update-status="${o.id}">Update Status</button>
                <button class="primary-btn" type="button" data-complete="${o.id}">Mark Completed</button>
              ` : ''}
              <button class="ghost-btn" type="button" data-chat="${o.id}">Chat</button>
            </div>
          </div>
        `;
      })
      .join('');

    this.els.ordersGrid.querySelectorAll('[data-accept]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-accept');
        const { error } = await supabase.from('orders').update({ status: 'accepted' }).eq('id', id);
        if (error) return Toast.error(error.message);

        await Activity.log(Auth.currentUser.id, 'accept_order', 'order', id);

        Toast.success('Order accepted');
        await this.loadOrders();
      });
    });

    this.els.ordersGrid.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-reject');
        const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
        if (error) return Toast.error(error.message);
        Toast.success('Order rejected');
        await this.loadOrders();
      });
    });

    this.els.ordersGrid.querySelectorAll('[data-update-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-update-status');
        const order = this.state.orders.find((o) => o.id === id);
        const choiceRaw = prompt(
          'Ubah status order.\n\nKetik salah satu (tanpa spasi):\n' +
          '  - accepted\n' +
          '  - in_progress\n' +
          '  - revision\n' +
          '  - completed\n' +
          '  - cancelled',
          order ? order.status : 'in_progress'
        );
        const next = choiceRaw ? choiceRaw.trim().toLowerCase() : null;
        const allowed = ['accepted','in_progress','revision','completed','cancelled'];
        if (next && !allowed.includes(next)) {
          Toast.error('Status tidak valid. Gunakan: ' + allowed.join(', '));
          return;
        }
        if (!next) return;
        const { error } = await supabase.from('orders').update({ status: next }).eq('id', id);
        if (error) return Toast.error(error.message);
        Toast.success('Status updated');
        await this.loadOrders();
      });
    });

    this.els.ordersGrid.querySelectorAll('[data-complete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-complete');
        const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', id);
        if (error) return Toast.error(error.message);

        await logActivity(
          Auth.currentUser.id,
          ACTIVITY_ACTIONS.ORDER_COMPLETED,
          TARGET_TYPES.ORDER,
          id
        );

        Toast.success('Order completed');
        await this.loadOrders();
      });
    });

    this.els.ordersGrid.querySelectorAll('[data-chat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-chat');
        window.location.href = `/src/chat.html?orderId=${id}`;
      });
    });

    await this.selectOrder(this.state.orders[0]?.id);

    this.els.ordersGrid.querySelectorAll('[data-order-id]').forEach((card) => {
      card.addEventListener('click', async (e) => {
        const id = card.getAttribute('data-order-id');
        if (e.target && e.target.closest('button')) return;
        await this.selectOrder(id);
      });
    });
  },

  async selectOrder(orderId) {
    this.state.selectedOrderId = orderId;
    const order = this.state.orders.find((o) => o.id === orderId);
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) return;

    progressContainer.innerHTML = `
      <div style="display:flex; gap:1rem; align-items:center; justify-content:space-between; flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 0.25rem 0;">Progress for: ${order?.services?.title || 'Order'}</h3>
          <div class="muted">Order ID: ${orderId}</div>
        </div>
        <form id="add-progress-form" style="display:flex; gap:0.75rem; align-items:end; flex-wrap:wrap;">
          <div class="form-group" style="margin:0; min-width:240px;">
            <label style="margin-bottom:0.35rem;">Progress title</label>
            <input id="progress-title" required />
          </div>
          <button type="submit" class="primary-btn">Add Progress</button>
        </form>
      </div>
      <div id="progress-list" style="margin-top:1.25rem;"></div>
    `;

    document.getElementById('add-progress-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('progress-title').value.trim();
      const { error } = await supabase.from('project_progress').insert({
        order_id: orderId,
        title,
        completed: false,
      });
      if (error) return Toast.error(error.message);
      Toast.success('Progress added');
      await this.renderProgress(orderId);
    });

    await this.renderProgress(orderId);
  },

  async renderProgress(orderId) {
    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) return Toast.error(error.message);

    const listEl = document.getElementById('progress-list');
    if (!listEl) return;

    if (!data?.length) {
      listEl.innerHTML = `<div class="empty-state"><p>No progress yet.</p></div>`;
      return;
    }

    listEl.innerHTML = data
      .map((p) => {
        return `
          <div class="progress-item">
            <div class="progress-check ${p.completed ? 'progress-checked' : ''}">${p.completed ? 'âœ“' : 'â—‹'}</div>
            <div class="progress-content">
              <div class="progress-title">${p.title}</div>
              <div class="progress-meta muted">${new Date(p.created_at).toLocaleString()}</div>
            </div>
            ${p.completed ? `<span class="status-badge status-completed">Done</span>` : `<button class="primary-btn" type="button" data-complete-progress="${p.id}">Mark Done</button>`}
          </div>
        `;
      })
      .join('');

    listEl.querySelectorAll('[data-complete-progress]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pid = btn.getAttribute('data-complete-progress');
        const { error } = await supabase.from('project_progress').update({ completed: true }).eq('id', pid);
        if (error) return Toast.error(error.message);
        Toast.success('Progress marked completed');
        await this.renderProgress(orderId);
      });
    });
  },

  setupRealtime() {
    const userId = Auth.currentUser?.id;
    if (!userId) return;

    Notifications.subscribe(userId, () => {
      // Placeholder for future notification display
    });

    Realtime.subscribeTable({
      channelName: `freelancer_orders_${userId}`,
      table: 'orders',
      filter: `freelancer_id=eq.${userId}`,
      onChange: async () => {
        await this.loadOrders();
      },
    });

    Realtime.subscribeTable({
      channelName: `freelancer_progress_${userId}`,
      table: 'project_progress',
      event: '*',
      onChange: () => {
        if (this.state.selectedOrderId) {
          this.renderProgress(this.state.selectedOrderId);
        }
        this.loadAggregateProgress();
      },
    });
  },
};

export { FreelancerDashboard };
