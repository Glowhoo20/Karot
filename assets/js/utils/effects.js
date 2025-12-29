/**
 * effects.js - Visual effects (particles, confetti, etc.)
 */

// Make functions available globally
window.Effects = {};

// Create confetti effect
window.Effects.createConfetti = function(count = 50, colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']) {
    const container = document.body;
    
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        
        container.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
}

// Create particle explosion
window.Effects.createParticleExplosion = function(x, y, color = '#ef4444', count = 20) {
    const container = document.body;
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.background = color;
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        
        const angle = (Math.PI * 2 * i) / count;
        const velocity = 100 + Math.random() * 50;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        let px = x;
        let py = y;
        let opacity = 1;
        
        const animate = () => {
            px += vx * 0.1;
            py += vy * 0.1 + 2; // Gravity
            opacity -= 0.02;
            
            particle.style.left = px + 'px';
            particle.style.top = py + 'px';
            particle.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        
        container.appendChild(particle);
        requestAnimationFrame(animate);
    }
}

// Create glow effect
window.Effects.createGlow = function(element, color = '#3b82f6', duration = 1000) {
    element.classList.add('glow');
    element.style.boxShadow = `0 0 20px ${color}`;
    
    setTimeout(() => {
        element.classList.remove('glow');
        element.style.boxShadow = '';
    }, duration);
}

// Create shake effect
window.Effects.createShake = function(element, intensity = 10) {
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 300);
}

// Create pulse effect
window.Effects.createPulse = function(element, scale = 1.1, duration = 300) {
    const originalTransform = element.style.transform;
    element.style.transition = 'transform 0.15s ease-out';
    element.style.transform = `scale(${scale})`;
    
    setTimeout(() => {
        element.style.transform = originalTransform;
        setTimeout(() => {
            element.style.transition = '';
        }, 150);
    }, duration);
}

// Create flash effect
window.Effects.createFlash = function(color = '#ef4444', opacity = 0.4, duration = 200) {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.background = color;
    flash.style.opacity = '0';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '9998';
    flash.style.transition = `opacity ${duration}ms ease-out`;
    
    document.body.appendChild(flash);
    
    // Flash on
    setTimeout(() => {
        flash.style.opacity = opacity.toString();
    }, 10);
    
    // Flash off
    setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), duration);
    }, duration);
}

