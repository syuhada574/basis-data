import { supabase } from './supabase.js';
import { Auth } from './auth.js';
import { Toast } from './toast.js';

const FreelancerProfile = {
  /**
   * Fetch aggregated profile data for a given freelancer.
   * Uses ONLY existing tables: profiles, services, portfolio, reviews, orders.
   * Issues at most a handful of small queries (run in parallel where possible).
   */
  async loadFor(freelancerId) {
    if (!freelancerId) return null;

    // 1) profile (avatar, name, rating, bio, location, skills)
    const profilePromise = supabase
      .from('profiles')
      .select('id, name, role, avatar_url, bio, skills, location, rating, total_reviews')
      .eq('id', freelancerId)
      .maybeSingle();

    // 2) active services count
    const servicesCountPromise = supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('freelancer_id', freelancerId)
      .eq('is_active', true);

    // 3) completed orders count
    const completedCountPromise = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('freelancer_id', freelancerId)
      .eq('status', 'completed');

    // 4) portfolio items (latest 12)
    const portfolioPromise = supabase
      .from('portfolio')
      .select('id, title, description, image_url, project_url, created_at')
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false })
      .limit(12);

    // 5) reviews (latest 20) with reviewer name
    const reviewsPromise = supabase
      .from('reviews')
      .select('id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)')
      .eq('reviewed_id', freelancerId)
      .order('created_at', { ascending: false })
      .limit(20);

    const [
      profileRes,
      servicesCountRes,
      completedCountRes,
      portfolioRes,
      reviewsRes,
    ] = await Promise.all([
      profilePromise,
      servicesCountPromise,
      completedCountPromise,
      portfolioPromise,
      reviewsPromise,
    ]);

    // Compute average rating from actual reviews (authoritative)
    const reviewsData = reviewsRes.data || [];
    const ratingsArr = reviewsData.map((r) => Number(r.rating)).filter((n) => !isNaN(n));
    const avgRating = ratingsArr.length
      ? ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length
      : Number(profileRes.data?.rating || 0);

    return {
      profile: profileRes.data,
      servicesCount: servicesCountRes.count || 0,
      completedCount: completedCountRes.count || 0,
      portfolio: portfolioRes.data || [],
      reviews: reviewsData,
      avgRating,
      reviewsCount: ratingsArr.length || Number(profileRes.data?.total_reviews || 0),
    };
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  },

  renderStars(rating) {
    const r = Math.round(Number(rating) || 0);
    const filled = '★'.repeat(Math.max(0, Math.min(5, r)));
    const empty = '☆'.repeat(5 - Math.max(0, Math.min(5, r)));
    return '<span class="stars-display" style="color:#f59e0b; letter-spacing:1px;">' + filled + empty + '</span>';
  },

  render(containerEl, data) {
    if (!containerEl) return;
    if (!data || !data.profile) {
      containerEl.innerHTML =
        '<div class="empty-state-find" style="max-width:520px; margin:3rem auto;">' +
          '<div class="empty-icon">😕</div>' +
          '<h3>Freelancer tidak ditemukan</h3>' +
          '<p>Profil yang Anda cari tidak tersedia.</p>' +
          '<a href="/src/index.html" class="btn btn-primary-custom" style="display:inline-block; margin-top:1rem; padding:0.6rem 1.25rem; border-radius:10px; text-decoration:none;">Kembali ke Pencarian</a>' +
        '</div>';
      return;
    }

    const p = data.profile;
    const name = this.escapeHtml(p.name || 'Freelancer');
    const bio = this.escapeHtml(p.bio || 'Belum ada bio.');
    const location = this.escapeHtml(p.location || '');
    const avatarUrl = p.avatar_url || '';
    const initials = (p.name || 'U').trim().charAt(0).toUpperCase();
    const role = p.role === 'freelancer' ? 'Freelancer' : (p.role || 'User');
    const avgRating = Number(data.avgRating || 0);
    const servicesCount = data.servicesCount || 0;
    const completedCount = data.completedCount || 0;
    const reviewsCount = data.reviewsCount || 0;
    const portfolio = data.portfolio || [];
    const reviews = data.reviews || [];

    let skillsHtml = '';
    const skills = Array.isArray(p.skills) ? p.skills : (typeof p.skills === 'string' ? p.skills.split(',').map(s => s.trim()).filter(Boolean) : []);
    if (skills.length) {
      skillsHtml =
        '<div class="profile-skills" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">' +
          skills.slice(0, 12).map((s) =>
            '<span class="skill-chip" style="background:#eef2ff; color:#4f46e5; padding:0.35rem 0.75rem; border-radius:20px; font-size:0.8rem; font-weight:600;">' +
            this.escapeHtml(s) +
            '</span>'
          ).join('') +
        '</div>';
    }

    const portfolioHtml = portfolio.length
      ? '<div class="portfolio-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:1rem;">' +
          portfolio.map((it) =>
            '<div class="portfolio-card" style="background:white; border-radius:14px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.06); border:1px solid #f3f4f6; display:flex; flex-direction:column;">' +
              (it.image_url
                ? '<img src="' + this.escapeHtml(it.image_url) + '" alt="' + this.escapeHtml(it.title) + '" style="width:100%; height:140px; object-fit:cover;" />'
                : '<div style="width:100%; height:140px; background:linear-gradient(135deg, #eef2ff, #f5f3ff); display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:2rem;">📁</div>') +
              '<div style="padding:0.85rem; flex:1; display:flex; flex-direction:column;">' +
                '<h4 style="margin:0 0 0.35rem 0; font-size:0.95rem; color:#1e1b4b;">' + this.escapeHtml(it.title || 'Untitled') + '</h4>' +
                (it.description ? '<p style="margin:0; font-size:0.8rem; color:#6b7280; line-height:1.45; flex:1;">' + this.escapeHtml(it.description.substring(0, 100)) + (it.description.length > 100 ? '…' : '') + '</p>' : '') +
                (it.project_url
                  ? '<a href="' + this.escapeHtml(it.project_url) + '" target="_blank" rel="noopener" class="small-btn" style="display:inline-block; margin-top:0.6rem; padding:0.35rem 0.7rem; border-radius:8px; background:#eef2ff; color:#4f46e5; font-size:0.78rem; font-weight:600; text-decoration:none;">View Project →</a>'
                  : '') +
              '</div>' +
            '</div>'
          ).join('') +
        '</div>'
      : '<div class="empty-state-find" style="background:#f9fafb;"><div class="empty-icon">📂</div><h3>Belum ada portfolio</h3><p>Freelancer ini belum menambahkan portfolio.</p></div>';

    const reviewsHtml = reviews.length
      ? '<div class="reviews-list">' +
          reviews.map((r) => {
            const reviewerName = r.reviewer?.name || 'Customer';
            const reviewerInitials = (r.reviewer?.name || 'C').trim().charAt(0).toUpperCase();
            return (
              '<div class="review-item" style="background:white; border-radius:14px; padding:1rem 1.25rem; box-shadow:0 4px 16px rgba(0,0,0,0.05); border:1px solid #f3f4f6; display:flex; gap:0.85rem; align-items:flex-start;">' +
                (r.reviewer?.avatar_url
                  ? '<img src="' + this.escapeHtml(r.reviewer.avatar_url) + '" alt="" style="width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0;" />'
                  : '<div class="avatar-placeholder" style="width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg, #667eea, #764ba2); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem; flex-shrink:0;">' + reviewerInitials + '</div>') +
                '<div style="flex:1; min-width:0;">' +
                  '<div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.35rem;">' +
                    '<span style="font-weight:600; color:#1e1b4b;">' + this.escapeHtml(reviewerName) + '</span>' +
                    '<span style="font-size:0.78rem; color:#9ca3af;">' + new Date(r.created_at).toLocaleDateString() + '</span>' +
                  '</div>' +
                  '<div style="margin-bottom:0.4rem;">' + this.renderStars(r.rating) + ' <span style="color:#6b7280; font-size:0.85rem; margin-left:0.35rem;">' + Number(r.rating || 0).toFixed(1) + '</span></div>' +
                  (r.comment ? '<p style="margin:0; color:#374151; line-height:1.5; font-size:0.92rem;">' + this.escapeHtml(r.comment) + '</p>' : '<p style="margin:0; color:#9ca3af; font-style:italic; font-size:0.88rem;">Tidak ada komentar.</p>') +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>'
      : '<div class="empty-state-find" style="background:#f9fafb;"><div class="empty-icon">💬</div><h3>Belum ada review</h3><p>Freelancer ini belum menerima review dari pelanggan.</p></div>';

    containerEl.innerHTML =
      '<div class="freelancer-profile-page">' +
        // Hero / header
        '<div class="card profile-hero" style="padding:1.75rem; margin-bottom:1.5rem;">' +
          '<div style="display:flex; gap:1.25rem; align-items:center; flex-wrap:wrap;">' +
            (avatarUrl
              ? '<img src="' + this.escapeHtml(avatarUrl) + '" alt="' + name + '" class="profile-avatar" style="width:96px; height:96px; border-radius:50%; object-fit:cover; border:3px solid #eef2ff; flex-shrink:0;" />'
              : '<div class="avatar-placeholder" style="width:96px; height:96px; border-radius:50%; background:linear-gradient(135deg, #667eea, #764ba2); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:2rem; border:3px solid #eef2ff; flex-shrink:0;">' + initials + '</div>') +
            '<div style="flex:1; min-width:240px;">' +
              '<h1 style="margin:0 0 0.25rem 0; font-size:1.65rem; color:#1e1b4b;">' + name + '</h1>' +
              '<div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; color:#6b7280; font-size:0.92rem;">' +
                '<span class="role-badge" style="background:#10b981; color:white; padding:0.2rem 0.65rem; border-radius:20px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">' + role + '</span>' +
                (location ? '<span>📍 ' + location + '</span>' : '') +
              '</div>' +
              (skillsHtml ? '<div style="margin-top:0.5rem;">' + skillsHtml + '</div>' : '') +
            '</div>' +
            '<div style="text-align:right;">' +
              '<a href="/src/chat.html?freelancerId=' + this.escapeHtml(p.id) + '" class="primary-btn" style="display:inline-block; padding:0.65rem 1.1rem; border-radius:10px; background:#4f46e5; color:white; text-decoration:none; font-weight:600; font-size:0.9rem;">💬 Chat</a>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Stats row
        '<div class="profile-stats-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:1rem; margin-bottom:1.5rem;">' +
          '<div class="stat-card" style="background:white; border-radius:14px; padding:1.1rem 1.25rem; box-shadow:0 4px 16px rgba(0,0,0,0.05); border:1px solid #f3f4f6; text-align:center;">' +
            '<div class="stat-value" style="font-size:1.75rem; font-weight:800; color:#1e1b4b;">' + this.renderStars(avgRating) + '</div>' +
            '<div style="font-size:0.95rem; font-weight:700; color:#1e1b4b; margin-top:0.25rem;">' + avgRating.toFixed(1) + ' / 5</div>' +
            '<div style="color:#6b7280; font-size:0.8rem; margin-top:0.15rem;">Rating (' + reviewsCount + ' review)</div>' +
          '</div>' +
          '<div class="stat-card" style="background:white; border-radius:14px; padding:1.1rem 1.25rem; box-shadow:0 4px 16px rgba(0,0,0,0.05); border:1px solid #f3f4f6; text-align:center;">' +
            '<div class="stat-value" style="font-size:1.75rem; font-weight:800; color:#059669;">' + servicesCount + '</div>' +
            '<div style="color:#6b7280; font-size:0.85rem; margin-top:0.25rem;">Layanan Aktif</div>' +
          '</div>' +
          '<div class="stat-card" style="background:white; border-radius:14px; padding:1.1rem 1.25rem; box-shadow:0 4px 16px rgba(0,0,0,0.05); border:1px solid #f3f4f6; text-align:center;">' +
            '<div class="stat-value" style="font-size:1.75rem; font-weight:800; color:#4f46e5;">' + completedCount + '</div>' +
            '<div style="color:#6b7280; font-size:0.85rem; margin-top:0.25rem;">Order Selesai</div>' +
          '</div>' +
          '<div class="stat-card" style="background:white; border-radius:14px; padding:1.1rem 1.25rem; box-shadow:0 4px 16px rgba(0,0,0,0.05); border:1px solid #f3f4f6; text-align:center;">' +
            '<div class="stat-value" style="font-size:1.75rem; font-weight:800; color:#f59e0b;">' + reviewsCount + '</div>' +
            '<div style="color:#6b7280; font-size:0.85rem; margin-top:0.25rem;">Review Pelanggan</div>' +
          '</div>' +
        '</div>' +

        // Bio
        '<div class="card" style="padding:1.5rem 1.75rem; margin-bottom:1.5rem;">' +
          '<h2 style="margin:0 0 0.5rem 0; font-size:1.1rem; color:#1e1b4b;">Tentang</h2>' +
          '<p style="margin:0; color:#374151; line-height:1.6;">' + bio + '</p>' +
        '</div>' +

        // Portfolio
        '<div class="card" style="padding:1.5rem 1.75rem; margin-bottom:1.5rem;">' +
          '<h2 style="margin:0 0 1rem 0; font-size:1.1rem; color:#1e1b4b;">Portfolio</h2>' +
          portfolioHtml +
        '</div>' +

        // Reviews
        '<div class="card" style="padding:1.5rem 1.75rem; margin-bottom:1.5rem;">' +
          '<h2 style="margin:0 0 1rem 0; font-size:1.1rem; color:#1e1b4b;">Review Pelanggan</h2>' +
          '<div style="display:flex; flex-direction:column; gap:0.75rem;">' + reviewsHtml + '</div>' +
        '</div>' +
      '</div>';

    // Bind all anchors (View Project) to open safely in new tab — already target=_blank.
  },
};

export { FreelancerProfile };
