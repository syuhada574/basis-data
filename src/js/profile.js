import { supabase } from './supabase.js';

const Profile = {
  // Get current user profile
  async getCurrent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    return { data, error };
  },
  
  // Update profile
  async update(profileData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single();
    return { data, error };
  },
  
  // Get freelancer services count
  async getServicesCount(freelancerId) {
    const { count, error } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('freelancer_id', freelancerId)
      .eq('is_active', true);
    return { count, error };
  },
  
  // Get rating directly from profiles.rating (no RPC needed)
  async getRating(userId) {
    if (!userId) return { data: 0, error: null };
    const { data, error } = await supabase
      .from('profiles')
      .select('rating')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[Profile.getRating] error:', error);
      return { data: 0, error };
    }
    return { data: data && data.rating != null ? Number(data.rating) : 0, error: null };
  },

  // Get total reviews count for a user
  async getReviewsCount(userId) {
    const { count, error } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewed_id', userId);
    return { count, error };
  },

  // Get portfolio items for a freelancer
  async getPortfolio(freelancerId) {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },

  // Add a portfolio item
  async addPortfolio(item) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('portfolio')
      .insert({ ...item, freelancer_id: user.id })
      .select()
      .single();
    return { data, error };
  },

  // Update a portfolio item
  async updatePortfolio(id, updates) {
    const { data, error } = await supabase
      .from('portfolio')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Delete a portfolio item
  async deletePortfolio(id) {
    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id);
    return { error };
  }
};

export { Profile };
