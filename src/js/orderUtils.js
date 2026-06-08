import { supabase } from './supabase.js';

const orderStatusMeta = {
  pending: { label: 'Pending', badgeClass: 'status-pending' },
  accepted: { label: 'Accepted', badgeClass: 'status-accepted' },
  in_progress: { label: 'In Progress', badgeClass: 'status-in-progress' },
  revision: { label: 'Revision', badgeClass: 'status-revision' },
  completed: { label: 'Completed', badgeClass: 'status-completed' },
  cancelled: { label: 'Cancelled', badgeClass: 'status-cancelled' },
};

function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(amount));
  } catch {
    return `$${Number(amount)}`;
  }
}

function statusToMeta(status) {
  return orderStatusMeta[status] || { label: status || '-', badgeClass: '' };
}

async function getOrderDetail(orderId) {
  // Includes: full service data, freelancer & customer profiles
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      services(*),
      freelancer:profiles!orders_freelancer_id_fkey(*),
      customer:profiles!orders_customer_id_fkey(*)
    `)
    .eq('id', orderId)
    .single();

  if (!data && !error) {
    console.error('Order not found:', orderId);
  }

  return { data, error };
}

export const OrderUtils = {
  statusToMeta,
  formatCurrency,
  getOrderDetail,
};

