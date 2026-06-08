import { supabase } from './supabase.js';

/**
 * Shared Project Progress Bar module.
 *
 * Provides aggregate progress computation across all of a user's active orders
 * by querying the `project_progress` table joined with `orders`, then renders
 * a single visual progress bar.
 *
 * Designed to:
 * - Be reused by both Customer and Freelancer dashboards without duplication
 * - Be efficient: one query that fetches progress rows + minimal order embed
 * - Stay compatible with existing per-order realtime subscriptions (callers
 *   simply re-invoke `loadAndRender` from their existing `onChange` callback)
 * - Not create a second realtime subscription (relies on the caller wiring
 *   it into the existing `project_progress` channel they already have)
 */

const ProgressBar = {
  /**
   * Compute aggregate progress for a given user.
   * @param {string} userId - The user id.
   * @param {'customer'|'freelancer'} role - Which side of the order to filter on.
   * @returns {Promise<{ total: number, completed: number, percent: number, error?: any }>}
   */
  async computeForUser(userId, role) {
    if (!userId) return { total: 0, completed: 0, percent: 0 };

    // Single query: project_progress joined to orders, filtered by user side
    // and only active orders (exclude cancelled/completed? we count all to show
    // overall portfolio progress, but you can narrow via order status below).
    const orderField = role === 'freelancer' ? 'freelancer_id' : 'customer_id';
    const { data, error } = await supabase
      .from('project_progress')
      .select(`
        id,
        completed,
        orders!inner(${orderField}, status)
      `)
      .eq('orders.' + orderField, userId);

    if (error) {
      console.error('ProgressBar.computeForUser error:', error);
      return { total: 0, completed: 0, percent: 0, error };
    }

    const rows = data || [];
    const total = rows.length;
    const completed = rows.filter((r) => r.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percent };
  },

  /**
   * Render an aggregate progress bar inside `containerEl`.
   * The container's previous content is replaced.
   *
   * @param {HTMLElement} containerEl
   * @param {{ total: number, completed: number, percent: number }} stats
   * @param {string} [label] - Optional heading (e.g. "Project Progress")
   */
  render(containerEl, stats, label) {
    if (!containerEl) return;
    const heading = label || 'Project Progress';
    const total = (stats && stats.total) || 0;
    const completed = (stats && stats.completed) || 0;
    const percent = (stats && stats.percent) || 0;

    if (total === 0) {
      containerEl.innerHTML = [
        '<div class="progress-aggregate-card">',
          '<div class="progress-aggregate-header">',
            '<span class="progress-aggregate-title">' + heading + '</span>',
            '<span class="progress-aggregate-percent">0%</span>',
          '</div>',
          '<div class="progress-bar-bg">',
            '<div class="progress-bar-fill" style="width:0%;"></div>',
          '</div>',
          '<div class="progress-aggregate-meta muted">Belum ada task. Tambahkan progress untuk mulai tracking.</div>',
        '</div>'
      ].join('');
      return;
    }

    containerEl.innerHTML = [
      '<div class="progress-aggregate-card">',
        '<div class="progress-aggregate-header">',
          '<span class="progress-aggregate-title">' + heading + '</span>',
          '<span class="progress-aggregate-percent">' + percent + '%</span>',
        '</div>',
        '<div class="progress-bar-bg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '">',
          '<div class="progress-bar-fill" style="width:' + percent + '%;"></div>',
        '</div>',
        '<div class="progress-aggregate-meta muted">' + completed + ' dari ' + total + ' task selesai</div>',
      '</div>'
    ].join('');
  },

  /**
   * Convenience: compute + render in one call.
   * @returns {Promise<{ total: number, completed: number, percent: number }>}
   */
  async loadAndRender(containerEl, userId, role, label) {
    const stats = await this.computeForUser(userId, role);
    this.render(containerEl, stats, label);
    return stats;
  },
};

export { ProgressBar };
