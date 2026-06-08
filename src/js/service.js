import { supabase } from './supabase.js';
import { Activity } from './activity.js';

const ServiceAPI = {
  async getServices(searchTerm = '', categoryId = null, priceRange = 'all') {
    // Simple approach: get services, categories, and profiles in separate calls
    // to avoid FK join naming issues
    try {
      let query = supabase
        .from('services')
        .select('id, title, description, price, duration_days, images, is_active, created_at, category_id, freelancer_id')
        .eq('is_active', true);

      // Apply category filter if specified
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // Apply price range filter
      if (priceRange && priceRange !== 'all') {
        if (priceRange === 'lt_50k') {
          query = query.lt('price', 50000);
        } else if (priceRange === '50k_100k') {
          query = query.gte('price', 50000).lt('price', 100000);
        } else if (priceRange === '100k_500k') {
          query = query.gte('price', 100000).lt('price', 500000);
        } else if (priceRange === 'gt_500k') {
          query = query.gte('price', 500000);
        }
      }

      // Apply search filter if specified
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('[Services] result:', { count: data?.length, error });

      if (error) {
        console.error('Get services error:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Enrich services with category names and profile names via separate queries
      const categoryIds = [...new Set(data.filter(s => s.category_id).map(s => s.category_id))];
      const freelancerIds = [...new Set(data.filter(s => s.freelancer_id).map(s => s.freelancer_id))];

      const [catResult, profResult] = await Promise.all([
        categoryIds.length ? supabase.from('categories').select('id, name').in('id', categoryIds) : { data: [] },
        freelancerIds.length ? supabase.from('profiles').select('id, name, avatar_url, rating').in('id', freelancerIds) : { data: [] }
      ]);

      const catMap = {};
      (catResult.data || []).forEach(c => { catMap[c.id] = c; });
      const profMap = {};
      (profResult.data || []).forEach(p => { profMap[p.id] = p; });

      const enriched = data.map(s => ({
        ...s,
        categories: s.category_id ? catMap[s.category_id] || null : null,
        profiles: s.freelancer_id ? profMap[s.freelancer_id] || null : null
      }));

      console.log('[Services] enriched count:', enriched.length);
      return enriched;
    } catch (err) {
      console.error('[Services] exception:', err);
      return [];
    }
  },

  async getFreelancerServices(freelancerId) {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        categories(name)
      `)
      .eq('freelancer_id', freelancerId);

    return { data, error };
  },

  async getService(id) {
    try {
      const { data: svc, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !svc) return { data: null, error };

      // Enrich with category and profile
      const [catRes, profRes] = await Promise.all([
        svc.category_id ? supabase.from('categories').select('id,name').eq('id', svc.category_id).single() : { data: null },
        svc.freelancer_id ? supabase.from('profiles').select('id,name,avatar_url,rating').eq('id', svc.freelancer_id).single() : { data: null }
      ]);

      return {
        data: {
          ...svc,
          categories: catRes.data || null,
          profiles: profRes.data || null
        },
        error: null
      };
    } catch (err) {
      console.error('[getService] exception:', err);
      return { data: null, error: err };
    }
  },

  async createService(serviceData) {
    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select(`
        *,
        categories(name)
      `)
      .single();
    
    // Log activity if service created successfully
    if (data && !error) {
      await Activity.log(
        serviceData.freelancer_id,
        'create_service',
        'service',
        data.id
      );
    }
    
    return { data, error };
  },

  async updateService(id, updates) {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    // Log activity if service updated successfully
    if (data && !error) {
      await Activity.log(
        data.freelancer_id,
        'update_service',
        'service',
        data.id
      );
    }
    
    return { data, error };
  },

  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      console.log('[Categories] result:', { data, error });

      if (error) console.error('Get categories error:', error);
      return data || [];
    } catch (err) {
      console.error('[getCategories] exception:', err);
      return [];
    }
  },

  async bookService(serviceId, date, client) {
    const { data: { user } } = await supabase.auth.getUser();
    const service = await supabase.from('services').select('price, freelancer_id').eq('id', serviceId).single();

    if (service.error || !user) return { error: 'Service/User not found' };

    const { data: orderData, error } = await supabase
      .from('orders')
      .insert([{
        service_id: serviceId,
        customer_id: user.id,
        freelancer_id: service.data.freelancer_id,
        total_price: service.data.price,
        status: 'pending',
        notes: client
      }])
      .select()
      .single();

    // Log activity for order creation
    if (orderData && !error) {
      await Activity.log(
        user.id,
        'create_order',
        'order',
        orderData.id
      );
    }

    return { data: orderData, error };
  },

  // Get services favorited by a specific user (used by favorites page)
  async getFavoritedServices(userId) {
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  }
};

export { ServiceAPI };
