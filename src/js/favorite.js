import { supabase } from './supabase.js';
import { Auth } from './auth.js';
import { Toast } from './toast.js';

const FavoriteAPI = {
  // Get all favorites of current user (with full service embed)
  async getMyFavorites() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        service_id,
        created_at,
        services!inner(
          *,
          categories(name),
          profiles!inner(name, avatar_url, rating)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  // Get set of favorited service ids for current user (used to render heart state on cards)
  async getMyFavoriteServiceIds() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Set();

    const { data, error } = await supabase
      .from('favorites')
      .select('service_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Get favorite ids error:', error);
      return new Set();
    }

    return new Set((data || []).map((row) => row.service_id));
  },

  // Check if a service is favorited by current user
  async isFavorited(serviceId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('service_id', serviceId)
      .maybeSingle();

    if (error) {
      console.error('isFavorited error:', error);
      return false;
    }

    return !!data;
  },

  // Add favorite. Relies on UNIQUE(user_id, service_id) + RLS for dedup safety.
  async addFavorite(serviceId) {
    if (!Auth.currentUser) {
      return { error: { message: 'Not logged in' } };
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert([{
        user_id: Auth.currentUser.id,
        service_id: serviceId,
      }])
      .select()
      .single();

    return { data, error };
  },

  // Remove favorite by service id (current user)
  async removeFavoriteByServiceId(serviceId) {
    if (!Auth.currentUser) {
      return { error: { message: 'Not logged in' } };
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', Auth.currentUser.id)
      .eq('service_id', serviceId);

    return { error };
  },

  // Toggle favorite state. Returns the new state ('favorited' | 'unfavorited').
  async toggle(serviceId) {
    if (!Auth.currentUser) {
      Toast.info('Silakan login untuk menyimpan favorit.');
      setTimeout(() => {
        window.location.href = '/src/login.html';
      }, 1200);
      return { state: 'unauthenticated' };
    }

    const fav = await this.isFavorited(serviceId);

    if (fav) {
      const { error } = await this.removeFavoriteByServiceId(serviceId);
      if (error) {
        Toast.error('Gagal menghapus favorit');
        return { state: 'error', error };
      }
      return { state: 'unfavorited' };
    }

    const { error } = await this.addFavorite(serviceId);
    if (error) {
      // Duplicate key (race-condition) - treat as success
      if (error.code === '23505') {
        return { state: 'favorited' };
      }
      Toast.error('Gagal menambahkan favorit');
      return { state: 'error', error };
    }
    return { state: 'favorited' };
  },

  // Render the heart button on a service card
  renderButton(serviceId, isFav) {
    const safeId = String(serviceId).replace(/"/g, '"');
    const filled = isFav ? '❤️' : '🤍';
    const label = isFav ? 'Unfavorite' : 'Favorite';
    return `
      <button
        type="button"
        class="favorite-btn ${isFav ? 'is-favorited' : ''}"
        data-favorite-toggle="${safeId}"
        data-fav-state="${isFav ? '1' : '0'}"
        aria-label="${label}"
        aria-pressed="${isFav ? 'true' : 'false'}"
        title="${label}"
        style="background:transparent; border:none; cursor:pointer; font-size:1.25rem; line-height:1; padding:0.25rem 0.5rem; border-radius:8px; transition:transform 0.15s ease;"
      >
        <span class="favorite-icon">${filled}</span>
      </button>
    `;
  },

  // Bind click handlers inside a container. Calls onChange(newState) after toggle.
  setupClickHandlers(containerEl, onChange) {
    if (!containerEl) return;

    containerEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-favorite-toggle]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const serviceId = btn.getAttribute('data-favorite-toggle');
      if (!serviceId) return;

      // Prevent double-click while in flight
      if (btn.dataset.busy === '1') return;
      btn.dataset.busy = '1';

      const result = await this.toggle(serviceId);

      if (result.state === 'favorited') {
        btn.classList.add('is-favorited');
        btn.setAttribute('data-fav-state', '1');
        btn.setAttribute('aria-pressed', 'true');
        btn.querySelector('.favorite-icon').textContent = '❤️';
        btn.setAttribute('title', 'Unfavorite');
        btn.setAttribute('aria-label', 'Unfavorite');
        Toast.success('Ditambahkan ke favorit');
        onChange?.(serviceId, true);
      } else if (result.state === 'unfavorited') {
        btn.classList.remove('is-favorited');
        btn.setAttribute('data-fav-state', '0');
        btn.setAttribute('aria-pressed', 'false');
        btn.querySelector('.favorite-icon').textContent = '🤍';
        btn.setAttribute('title', 'Favorite');
        btn.setAttribute('aria-label', 'Favorite');
        Toast.info('Dihapus dari favorit');
        onChange?.(serviceId, false);
      }

      btn.dataset.busy = '';
    });
  },

  // Render a list of favorited services into a container (used in favorites page)
  renderList(containerEl, favorites) {
    if (!containerEl) return;

    if (!favorites?.length) {
      containerEl.innerHTML = `
        <div class="empty-state-find" style="grid-column:1/-1;">
          <div class="empty-icon">💔</div>
          <h3>Belum ada service favorit.</h3>
          <p>Simpan service yang Anda sukai untuk dilihat kembali di sini.</p>
          <a href="/src/index.html" class="btn btn-primary-custom" style="display:inline-block; margin-top:1rem; padding:0.65rem 1.25rem; border-radius:10px; text-decoration:none;">Cari Service</a>
        </div>
      `;
      return;
    }

    containerEl.innerHTML = favorites
      .map((row) => {
        const s = row.services;
        if (!s) return '';

        const freelancerName = s.profiles?.name || 'Freelancer';
        const categoryName = s.categories?.name || 'General';
        const rating = s.profiles?.rating || 0;
        const price = s.price || 0;
        const durationDays = s.duration_days || '-';
        const description = s.description || '';
        const truncatedDesc = description.length > 120
          ? description.substring(0, 120) + '...'
          : description;
        const starsHtml = rating > 0
          ? '⭐'.repeat(Math.round(rating)) + ` ${Number(rating).toFixed(1)}`
          : '⭐ 0.0';

        return `
          <div class="service-card-modern" data-fav-card="${s.id}">
            <div class="service-card-body">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                <div class="service-card-title" style="flex:1;">${s.title}</div>
                <div style="flex-shrink:0;">
                  ${this.renderButton(s.id, true)}
                </div>
              </div>
              <div class="service-card-description">${truncatedDesc || 'Tidak ada deskripsi.'}</div>
              <div class="service-card-meta">
                <span class="service-card-meta-item">
                  <span class="label">👤</span>
                  <span class="freelancer-name">${freelancerName}</span>
                </span>
                <span class="service-card-meta-item">
                  <span class="label">📁</span>
                  <span class="category-badge">${categoryName}</span>
                </span>
                <span class="service-card-meta-item">
                  <span class="label">⭐</span>
                  <span class="rating-stars">${starsHtml}</span>
                </span>
                <span class="service-card-meta-item">
                  <span class="label">⏱</span>
                  <span>${durationDays} hari</span>
                </span>
              </div>
              <div class="price-tag">Rp ${Number(price).toLocaleString('id-ID')}</div>
              <div class="service-card-actions">
                <button class="btn btn-outline-custom" data-view-service="${s.id}">View Detail</button>
                <button class="btn btn-primary-custom" data-order-service="${s.id}">Order Now</button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // View detail / order buttons
    containerEl.querySelectorAll('[data-view-service]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-view-service');
        window.location.href = `/src/dashboard.html?service=${id}`;
      });
    });

    containerEl.querySelectorAll('[data-order-service]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-order-service');
        window.location.href = `/src/dashboard.html?service=${id}`;
      });
    });
  },

  // Realtime subscription - when a favorite is added/removed for current user, call onUpdate
  subscribe(userId, onUpdate) {
    return supabase
      .channel(`favorites_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onUpdate?.();
        }
      )
      .subscribe();
  },
};

export { FavoriteAPI };
