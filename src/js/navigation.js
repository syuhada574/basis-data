/**
 * Central Navigation System for Companion Rent
 * Handles navbar, sidebar, active indicators, role-based menus, breadcrumbs, badges
 */
import { Auth } from './auth.js';

const ICON_DASH = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
const ICON_HOME = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
const ICON_SERVICES = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
const ICON_ORDERS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
const ICON_PORTFOLIO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
const ICON_MESSAGES = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const ICON_NOTIFICATIONS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
const ICON_EARNINGS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
const ICON_PROFILE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const ICON_SETTINGS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
const ICON_FIND = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const ICON_LOGIN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
const ICON_SIGNUP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="8"/><line x1="20.5" y1="5.5" x2="20.5" y2="10.5"/></svg>';
const ICON_LOGOUT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
const ICON_CHAT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const ICON_FAVORITE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

const Navigation = {
  currentUser: null,
  navbarEl: null,
  sidebarEl: null,

  async init(activePage) {
    activePage = activePage || '';
    await Auth.init();
    this.currentUser = Auth.currentUser;

    if (this.currentUser) {
      this.updateSidebarUserInfo();
    }

    this.setActivePage(activePage);
  },

  getIcon(key) {
    if (key === 'find service' || key === 'find-service') return ICON_FIND;
    if (key === 'my services' || key === 'my-services') return ICON_SERVICES;
    if (key === 'my orders' || key === 'my-orders') return ICON_ORDERS;
    if (key === 'favorites' || key === 'favorite' || key === 'my-favorites') return ICON_FAVORITE;
    const map = {
      'dashboard': ICON_DASH,
      'home': ICON_HOME,
      'services': ICON_SERVICES,
      'orders': ICON_ORDERS,
      'portfolio': ICON_PORTFOLIO,
      'messages': ICON_MESSAGES,
      'notifications': ICON_NOTIFICATIONS,
      'earnings': ICON_EARNINGS,
      'profile': ICON_PROFILE,
      'settings': ICON_SETTINGS,
      'login': ICON_LOGIN,
      'sign up': ICON_SIGNUP,
      'logout': ICON_LOGOUT,
      'chat': ICON_CHAT,
    };
    return map[key] || ICON_DASH;
  },

  getNavbarItems() {
    const isGuest = !this.currentUser;

    if (isGuest) {
      return [
        { label: 'Home', href: '/src/index.html', icon: 'home', badge: false },
        { label: 'Login', href: '/src/login.html', icon: 'login', badge: false },
        { label: 'Sign Up', href: '/src/signup.html', icon: 'sign up', badge: false },
      ];
    }

    if (this.currentUser.role === 'freelancer') {
      return [
        { label: 'Home', href: '/src/index.html', icon: 'home', badge: false },
        { label: 'Chat', href: '/src/chat.html', icon: 'chat', badge: 'messages' },
        { label: 'Profile', href: '/src/profile.html', icon: 'profile', badge: false },
        { label: 'Logout', href: '#', id: 'nav-logout', icon: 'logout', badge: false },
      ];
    }

    return [
      { label: 'Home', href: '/src/index.html', icon: 'home', badge: false },
      { label: 'Find Service', href: '/src/index.html', icon: 'find-service', badge: false },
      { label: 'Orders', href: '/src/customer-dashboard.html', icon: 'orders', badge: 'orders' },
      { label: 'Favorites', href: '/src/favorites.html', icon: 'favorite', badge: false },
      { label: 'Chat', href: '/src/chat.html', icon: 'chat', badge: 'messages' },
      { label: 'Profile', href: '/src/profile.html', icon: 'profile', badge: false },
      { label: 'Logout', href: '#', id: 'nav-logout', icon: 'logout', badge: false },
    ];
  },

  renderNavbar(containerId) {
    containerId = containerId || 'navbar-placeholder';
    const container = document.getElementById(containerId) || this.createNavbarContainer();
    // Hide navbar entirely for logged-in users — sidebar is the only nav
    if (this.currentUser) {
      if (container) container.innerHTML = '';
      return;
    }
    const items = this.getNavbarItems();

    const navItemsHtml = items.map(function (item) {
      const idAttr = item.id ? 'id="' + item.id + '"' : '';
      const iconHtml = this.getIcon(item.icon);
      const badgeHtml = item.badge ? '<span class="nav-badge" id="nav-badge-' + item.badge + '"></span>' : '';
      return '<li><a href="' + item.href + '" ' + idAttr + ' class="nav-item" data-page="' + item.label.toLowerCase() + '">' +
        '<span class="nav-icon">' + iconHtml + '</span>' +
        '<span class="nav-label">' + item.label + '</span>' +
        badgeHtml +
        '</a></li>';
    }.bind(this)).join('');

    container.innerHTML =
      '<header>' +
        '<nav>' +
          '<div class="nav-brand"><a href="/src/index.html">NimTask</a></div>' +
          '<ul class="nav-links" id="navbar-links">' + navItemsHtml + '</ul>' +
        '</nav>' +
      '</header>';

    const logoutBtn = container.querySelector('#nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        await Auth.logout();
      });
    }
    this.updateNavbarStyle();
  },

  updateNavbarStyle() {
    document.querySelectorAll('.nav-item').forEach(function (item) {
      if (item.classList.contains('nav-active')) {
        item.style.color = 'white';
        item.style.background = 'rgba(255,255,255,0.15)';
      } else {
        item.style.color = '';
        item.style.background = '';
      }
    });
  },

  createNavbarContainer() {
    const div = document.createElement('div');
    div.id = 'navbar-placeholder';
    document.body.prepend(div);
    return div;
  },

  getSidebarItems() {
    if (!this.currentUser) return [];
    if (this.currentUser.role === 'freelancer') {
      return [
        { label: 'Dashboard', href: '/src/freelancer-dashboard.html', icon: 'dashboard', badge: false, isAnchor: true, anchorId: 'section-dashboard' },
        { label: 'My Services', href: '/src/freelancer-dashboard.html', icon: 'services', badge: false, isAnchor: true, anchorId: 'section-my-services' },
        { label: 'Orders', href: '/src/freelancer-dashboard.html', icon: 'orders', badge: 'orders', isAnchor: true, anchorId: 'section-orders' },
        { label: 'Messages', href: '/src/chat.html', icon: 'messages', badge: 'messages' },
        { label: 'Profile', href: '/src/profile.html', icon: 'profile', badge: false },
      ];
    }
    return [
      { label: 'Dashboard', href: '/src/customer-dashboard.html', icon: 'dashboard', badge: false, isAnchor: true, anchorId: 'section-dashboard' },
      { label: 'My Orders', href: '/src/customer-dashboard.html', icon: 'orders', badge: 'orders', isAnchor: true, anchorId: 'section-orders' },
      { label: 'Find Service', href: '/src/index.html', icon: 'find-service', badge: false },
      { label: 'Messages', href: '/src/chat.html', icon: 'messages', badge: 'messages' },
      { label: 'Profile', href: '/src/profile.html', icon: 'profile', badge: false },
    ];
  },

  renderSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;
    if (!this.currentUser) {
      sidebarContainer.innerHTML = '';
      document.body.classList.remove('sidebar-page');
      document.body.classList.add('no-sidebar');
      return;
    }
    document.body.classList.add('sidebar-page');
    document.body.classList.remove('no-sidebar');
    const items = this.getSidebarItems();
    const sidebarItemsHtml = items.map(function (item) {
      const dataAttr = 'data-sidebar-page="' + item.label.toLowerCase().replace(/\s+/g, '-') + '"' + (item.isAnchor ? ' data-anchor="1"' : '') + (item.anchorId ? ' data-anchor-id="' + item.anchorId + '"' : '');
      const iconHtml = this.getIcon(item.icon);
      const badgeHtml = item.badge ? '<span class="sidebar-badge" id="sidebar-badge-' + item.badge + '"></span>' : '';
      return '<a href="' + item.href + '" class="sidebar-item" ' + dataAttr + '>' +
        '<span class="sidebar-icon">' + iconHtml + '</span>' +
        '<span class="sidebar-label">' + item.label + '</span>' +
        badgeHtml +
        '</a>';
    }.bind(this)).join('');
    const avatarText = (this.currentUser.name || 'U').charAt(0).toUpperCase();
    const userName = this.currentUser.name || 'User';
    const userRole = this.currentUser.role === 'freelancer' ? 'Freelancer' : 'Customer';
    sidebarContainer.innerHTML =
      '<div class="sidebar">' +
        '<div class="sidebar-header">' +
          '<a href="/src/index.html" class="sidebar-brand">NimTask</a>' +
          '<div class="sidebar-avatar"><span id="sidebar-avatar-text">' + avatarText + '</span></div>' +
          '<h3 id="sidebar-name">' + userName + '</h3>' +
          '<p id="sidebar-role">' + userRole + '</p>' +
        '</div>' +
        '<nav class="sidebar-nav" id="sidebar-nav">' + sidebarItemsHtml + '</nav>' +
        '<div class="sidebar-footer">' +
          '<button id="sidebar-logout"><span class="sidebar-icon">' + ICON_LOGOUT + '</span><span>Logout</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="overlay" id="sidebar-overlay"></div>';
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function () { await Auth.logout(); });
    }
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () { this.toggleMobileSidebar(false); }.bind(this));
    }
    this.setupDashboardSmoothScroll();
    if (this.currentUser && this.currentUser.role === 'freelancer') {
      this.setupFreelancerObserver();
    } else {
      this.setupCustomerObserver();
    }
    this.setActivePage();
  },

  setupDashboardSmoothScroll() {
    document.querySelectorAll('.sidebar-item[data-anchor]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        var isOnDashboard = window.location.pathname.indexOf('customer-dashboard') !== -1 || window.location.pathname.indexOf('freelancer-dashboard') !== -1;
        var anchorId = this.getAttribute('data-anchor-id');
        if (isOnDashboard && anchorId) {
          e.preventDefault();
          var target = document.getElementById(anchorId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('.sidebar-item').forEach(function (si) { si.classList.remove('active'); });
            this.classList.add('active');
            Navigation.toggleMobileSidebar(false);
          }
        }
        // If not on a dashboard page, let the link navigate normally
      }.bind(item));
    });
  },

  setupFreelancerObserver() {
    if (this._freelancerObserver) return;
    var sections = document.querySelectorAll('#section-dashboard, #section-my-services, #section-orders');
    if (!sections.length) return;
    var sideNav = document.getElementById('sidebar-nav');
    if (!sideNav) return;
    this._freelancerObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          // Convert section ID to sidebar-page format (e.g., "section-my-services" -> "my-services")
          var label = id.replace('section-', '');
          sideNav.querySelectorAll('.sidebar-item').forEach(function (si) {
            si.classList.remove('active');
            var pageAttr = si.getAttribute('data-sidebar-page');
            if (pageAttr && pageAttr === label) {
              si.classList.add('active');
            }
          });
        }
      });
    }, { threshold: 0.3 });
    sections.forEach(function (s) { this._freelancerObserver.observe(s); }.bind(this));
  },

  setupCustomerObserver() {
    if (this._customerObserver) return;
    var sections = document.querySelectorAll('#section-dashboard, #section-orders');
    if (!sections.length) return;
    var sideNav = document.getElementById('sidebar-nav');
    if (!sideNav) return;
    this._customerObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          var label = id.replace('section-', '');
          sideNav.querySelectorAll('.sidebar-item').forEach(function (si) {
            si.classList.remove('active');
            var pageAttr = si.getAttribute('data-sidebar-page');
            if (pageAttr && pageAttr === label) {
              si.classList.add('active');
            }
          });
        }
      });
    }, { threshold: 0.3 });
    sections.forEach(function (s) { this._customerObserver.observe(s); }.bind(this));
  },

  updateSidebarUserInfo() {
    const nameEl = document.getElementById('sidebar-name');
    const roleEl = document.getElementById('sidebar-role');
    const avatarEl = document.getElementById('sidebar-avatar-text');
    if (nameEl && this.currentUser) nameEl.textContent = this.currentUser.name || 'User';
    if (roleEl && this.currentUser) roleEl.textContent = this.currentUser.role === 'freelancer' ? 'Freelancer' : 'Customer';
    if (avatarEl && this.currentUser) avatarEl.textContent = (this.currentUser.name || 'U').charAt(0).toUpperCase();
  },

  setActivePage(pageName) {
    if (!pageName) {
      const path = window.location.pathname;
      const filename = path.split('/').pop().split('?')[0];
      pageName = filename.replace('.html', '');
    }
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.classList.remove('nav-active');
      item.style.color = '';
      item.style.background = '';
      const dataPage = item.getAttribute('data-page');
      if (dataPage && this.matchesPage(dataPage, pageName)) {
        item.classList.add('nav-active');
        item.style.color = 'white';
        item.style.background = 'rgba(255,255,255,0.15)';
      }
    }.bind(this));
    document.querySelectorAll('.sidebar-item').forEach(function (item) {
      item.classList.remove('active');
      const dataPage = item.getAttribute('data-sidebar-page');
      if (dataPage && this.matchesSidebarPage(dataPage, pageName)) {
        item.classList.add('active');
      }
    }.bind(this));
  },

  matchesPage(dataPage, currentPage) {
    const map = {
      'home': ['index', 'home'],
      'login': ['login'],
      'sign up': ['signup'],
      'dashboard': ['freelancer-dashboard', 'customer-dashboard', 'dashboard'],
      'chat': ['chat'],
      'profile': ['profile'],
      'orders': ['customer-dashboard', 'freelancer-dashboard'],
      'favorites': ['favorites'],
      'find service': ['index'],
    };
    const pages = map[dataPage] || [dataPage];
    return pages.indexOf(currentPage) !== -1;
  },

  matchesSidebarPage(dataPage, currentPage) {
    const map = {
      'dashboard': ['freelancer-dashboard', 'customer-dashboard', 'dashboard'],
      'my-services': ['freelancer-dashboard'],
      'orders': ['freelancer-dashboard', 'customer-dashboard'],
      'messages': ['chat'],
      'notifications': ['notifications'],
      'find-service': ['index'],
      'my-orders': ['customer-dashboard'],
      'favorites': ['favorites'],
      'profile': ['profile'],
      'settings': ['settings'],
    };
    const pages = map[dataPage] || [dataPage];
    return pages.indexOf(currentPage) !== -1;
  },

  toggleMobileSidebar(forceState) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    if (!sidebar) return;
    if (forceState === false) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      if (hamburger) hamburger.classList.remove('active');
    } else {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
      if (hamburger) hamburger.classList.toggle('active');
    }
  },

  renderBreadcrumb(containerId, paths) {
    containerId = containerId || 'breadcrumb-area';
    paths = paths || [];
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!paths || paths.length === 0) {
      const path = window.location.pathname;
      const filename = path.split('/').pop().replace('.html', '');
      const breadcrumbMap = {
        'freelancer-dashboard': ['Home', 'Dashboard'],
        'customer-dashboard': ['Home', 'Dashboard'],
        'dashboard': ['Home', 'Dashboard'],
        'index': ['Home', 'Find Service'],
        'profile': ['Home', 'Profile'],
        'chat': ['Home', 'Messages'],
        'login': ['Home', 'Login'],
        'signup': ['Home', 'Sign Up'],
        'favorites': ['Home', 'Favorites'],
      };
      paths = breadcrumbMap[filename] || ['Home'];
    }
    const parts = paths.map(function (p, i) {
      const isLast = i === paths.length - 1;
      if (isLast) return '<span class="breadcrumb-current">' + p + '</span>';
      const href = '/src/' + (p.toLowerCase() === 'home' ? 'index' : p.toLowerCase()) + '.html';
      return '<a href="' + href + '" class="breadcrumb-link">' + p + '</a>';
    });
    container.innerHTML =
      '<nav class="breadcrumb" aria-label="Breadcrumb">' +
        '<span class="breadcrumb-home-icon">' + ICON_HOME + '</span>' +
        parts.join('<span class="breadcrumb-separator">/</span>') +
      '</nav>';
  },

  badges: { messages: 0, notifications: 0, orders: 0 },

  async loadBadges() {
    if (!this.currentUser) return;
    const userId = this.currentUser.id;
    const { supabase } = await import('./supabase.js');
    try {
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);
      this.badges.messages = msgCount || 0;
      this.updateBadge('messages', this.badges.messages);
    } catch (e) {}
    
    // Only count pending orders badge if NOT on the dashboard page where orders are shown
    const currentPath = window.location.pathname;
    const isOnDashboard = currentPath.indexOf('freelancer-dashboard') !== -1 || currentPath.indexOf('customer-dashboard') !== -1;
    if (!isOnDashboard) {
      try {
        const orderField = this.currentUser.role === 'freelancer' ? 'freelancer_id' : 'customer_id';
        const { count: orderCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq(orderField, userId)
          .eq('status', 'pending');
        this.badges.orders = orderCount || 0;
        this.updateBadge('orders', this.badges.orders);
      } catch (e) {}
    } else {
      // Hide order badge when user is already on the dashboard viewing their orders
      this.badges.orders = 0;
      this.updateBadge('orders', 0);
    }

    // Load notification badge from the notifications table
    try {
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      this.badges.notifications = notifCount || 0;
      this.updateBadge('notifications', this.badges.notifications);
    } catch (e) {}
  },

  updateBadge(type, count) {
    const sidebarBadge = document.getElementById('sidebar-badge-' + type);
    if (sidebarBadge) {
      sidebarBadge.textContent = count > 0 ? count : '';
      sidebarBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    const navBadge = document.getElementById('nav-badge-' + type);
    if (navBadge) {
      navBadge.textContent = count > 0 ? count : '';
      navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  },

  showPageTransition(containerId, callback) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) { if (callback) callback(); return; }
    container.classList.add('fade-in-page');
    setTimeout(function () {
      if (callback) callback();
      requestAnimationFrame(function () { container.classList.add('visible'); });
    }, 30);
  },

  renderSkeleton(containerId, type, count) {
    type = type || 'card';
    count = count || 3;
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
      if (type === 'card') {
        html += '<div class="skeleton-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:60%;"></div></div>';
      } else if (type === 'list') {
        html += '<div class="skeleton-list-item"><div class="skeleton" style="width:40px;height:40px;border-radius:50%;"></div><div style="flex:1;"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:50%;"></div></div></div>';
      } else if (type === 'stats') {
        html += '<div class="skeleton skeleton-card" style="height:100px;"></div>';
      }
    }
    container.innerHTML = html;
  },

  showLoading(containerId, show) {
    if (show === undefined) show = true;
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;
    let overlay = container.querySelector('.loading-overlay-custom');
    if (show) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay-custom';
        overlay.innerHTML = '<div class="loading-spinner-custom"><div class="spinner-ring"></div><span>Loading...</span></div>';
        container.style.position = 'relative';
        container.appendChild(overlay);
      }
      overlay.style.display = 'flex';
    } else {
      if (overlay) overlay.style.display = 'none';
    }
  },

  setupHamburger() {
    let hamburger = document.getElementById('hamburger-btn');
    if (!hamburger) {
      hamburger = document.createElement('div');
      hamburger.id = 'hamburger-btn';
      hamburger.className = 'hamburger';
      hamburger.innerHTML = '<span></span><span></span><span></span>';
      hamburger.setAttribute('aria-label', 'Toggle sidebar menu');
      document.body.prepend(hamburger);
    }
    hamburger.addEventListener('click', function () { this.toggleMobileSidebar(); }.bind(this));
  },

  applyPageTransition() {
    const main = document.querySelector('.sidebar-main, main.container, main');
    if (main) this.showPageTransition(main);
  },

  _saveLastVisited() {
    if (!this.currentUser) return;
    const path = window.location.pathname;
    // Only save meaningful logged-in pages, exclude login/signup
    if (path.indexOf('/src/login') === -1 && path.indexOf('/src/signup') === -1) {
      localStorage.setItem('lastVisitedPath', path);
    }
  },

  async setupForLoggedInPage(activePage) {
    activePage = activePage || '';
    await this.init(activePage);
    // Navbar removed entirely for all users; sidebar is the only navigation
    this.renderSidebar();
    this.setupHamburger();
    this.loadBadges();
    if (!this.currentUser) {
      window.location.href = '/src/login.html';
      return;
    }
    this._saveLastVisited();
    setTimeout(function () { this.applyPageTransition(); }.bind(this), 50);
    return this.currentUser;
  },

  async setupFullPage() {
    await this.init();
    if (this.currentUser) {
      // Logged-in: render sidebar only
      this.renderSidebar();
      this.setupHamburger();
      this.loadBadges();
      this._saveLastVisited();
    } else {
      // Guest pages: render sidebar placeholder (empty), navbar is gone
      this.renderSidebar();
    }
    setTimeout(function () { this.applyPageTransition(); }.bind(this), 50);
    return this.currentUser;
  },
};

export { Navigation };