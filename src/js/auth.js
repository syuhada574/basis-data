import { supabase } from './supabase.js';

const Auth = {
  currentUser: null,

  // ================= LOGIN =================
  async login(email, password) {
    console.log('LOGIN ATTEMPT:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("LOGIN ERROR:", error.message);
      return { error };
    }

    console.log('LOGIN SUCCESS:', data.user.email);

    await this.loadUserProfile(data.user);
    return { data };
  },

  // ================= SIGNUP =================
  async signup(email, password, name, role = 'customer') {
    try {
      const { data: userData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) throw signUpError;
      if (!userData.user) throw new Error('No user created');

      // Delay biar user ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          name,
          role
        });

      if (profileError) throw profileError;

      await this.loadUserProfile(userData.user);

      return { data: userData };

    } catch (error) {
      console.error('SIGNUP ERROR:', error.message);
      return { error };
    }
  },

  // ================= LOGOUT =================
  async logout() {
    console.log("LOGOUT CLICKED");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error.message);
      return;
    }

    console.log("LOGOUT SUCCESS");

    this.currentUser = null;
    localStorage.removeItem('authUser');

    window.location.href = '/src/index.html';
  },

  // ================= LOAD PROFILE =================
  async loadUserProfile(user) {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("PROFILE LOAD ERROR:", error.message);
      return;
    }

    this.currentUser = {
      ...user,
      ...data
    };

    localStorage.setItem('authUser', JSON.stringify(this.currentUser));
  },

  // ================= CACHE =================
  restoreFromCache() {
    const cached = localStorage.getItem('authUser');
    if (cached) {
      try {
        this.currentUser = JSON.parse(cached);
      } catch (e) {
        this.currentUser = null;
        localStorage.removeItem('authUser');
      }
    }
  },

  // ================= INIT =================
  async init() {
    console.log("AUTH INIT");

    // Always re-load from supabase session first to ensure the latest role/profile is used.
    // The cache is only used as a fallback if supabase session is unavailable (e.g. offline).
    // This prevents stale cache (e.g. from a different user on the same browser) from
    // mistakenly rendering the wrong role's dashboard.
    this.restoreFromCache();

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await this.loadUserProfile(session.user);
    } else if (this.currentUser) {
      // No active session — clear the cache so we don't accidentally render with stale user
      this.currentUser = null;
      localStorage.removeItem('authUser');
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AUTH EVENT:", event);

      if (event === 'SIGNED_IN') {
        // Force fresh load of profile (incl. role) on sign-in
        this.currentUser = null;
        localStorage.removeItem('authUser');
        if (session?.user) {
          await this.loadUserProfile(session.user);
        }
      }

      if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        localStorage.removeItem('authUser');
      }
    });
  }
};

export { Auth };