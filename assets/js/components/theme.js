/**
 * theme.js - Theme management system
 */

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('k_theme') || 'dark';
        this.themes = {
            dark: {
                name: 'Karanlık',
                bg: '#050a15',
                text: '#f1f5f9',
                accent: '#3b82f6'
            },
            light: {
                name: 'Aydınlık',
                bg: '#f8fafc',
                text: '#0f172a',
                accent: '#3b82f6'
            }
        };
        
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
    }
    
    applyTheme(themeName) {
        if (!this.themes[themeName]) return;
        
        this.currentTheme = themeName;
        localStorage.setItem('k_theme', themeName);
        
        const root = document.documentElement;
        const theme = this.themes[themeName];
        
        if (themeName === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: themeName }));
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        return newTheme;
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    getThemes() {
        return this.themes;
    }
}

// Create global instance
window.ThemeManager = new ThemeManager();

