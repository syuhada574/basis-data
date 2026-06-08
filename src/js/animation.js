// animation.js - Animations for BA Project
const Animations = {
  fadeIn(el, duration = 500) {
    el.style.opacity = '0';
    el.style.transition = `opacity ${duration}ms`;
    setTimeout(() => el.style.opacity = '1', 10);
  },
  
  slideDown(el, duration = 300) {
    el.style.height = '0';
    el.style.overflow = 'hidden';
    el.style.transition = `height ${duration}ms`;
    const height = el.scrollHeight;
    el.style.height = height + 'px';
  },
  
  initPage() {
    const elements = document.querySelectorAll('.fade-in');
    elements.forEach(el => this.fadeIn(el));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Animations.initPage();
});

export { Animations };
