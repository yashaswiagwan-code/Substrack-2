// public/substrack-sdk.js
// Substrack JavaScript SDK - No Backend Required
// Version: 1.0.0

(function(window) {
  'use strict';

  class Substrack {
    constructor() {
      this.token = null;
      this.subscriber = null;
      this.initialized = false;
      this.apiBase = window.location.origin; // Change this if hosting SDK separately
    }

    // Initialize and check for token in URL or localStorage
    async init() {
      console.log('🚀 Substrack SDK initialized');
      
      // Check URL parameters first (after redirect from Substrack)
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('substrack_session');
      
      if (sessionId) {
        console.log('📦 Found session ID in URL, exchanging for token...');
        await this.exchangeSessionForToken(sessionId);
        
        // Clean URL (remove session param)
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      } else {
        // Load from localStorage
        this.loadFromStorage();
      }
      
      this.initialized = true;
      return this;
    }

    // Exchange Stripe session for access token
    async exchangeSessionForToken(sessionId) {
      try {
        const response = await fetch(`${this.apiBase}/functions/v1/exchange-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });
        
        const data = await response.json();
        
        if (data.token) {
          this.setToken(data.token);
          this.subscriber = data.subscriber;
          console.log('✅ Token exchanged successfully');
          return true;
        } else {
          console.error('❌ No token in response');
          return false;
        }
      } catch (error) {
        console.error('❌ Error exchanging token:', error);
        return false;
      }
    }

    // Store token in localStorage
    setToken(token) {
      this.token = token;
      localStorage.setItem('substrack_token', token);
      
      // Decode JWT to get subscriber info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.subscriber = {
          email: payload.email,
          name: payload.name,
          plan: payload.plan_name,
          features: payload.features || [],
          status: payload.status,
          expiresAt: payload.expires_at,
        };
        localStorage.setItem('substrack_subscriber', JSON.stringify(this.subscriber));
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }

    // Load from localStorage
    loadFromStorage() {
      this.token = localStorage.getItem('substrack_token');
      const subscriberData = localStorage.getItem('substrack_subscriber');
      
      if (subscriberData) {
        try {
          this.subscriber = JSON.parse(subscriberData);
        } catch (e) {
          console.error('Error parsing subscriber data:', e);
        }
      }
    }

    // Check if user has active subscription
    hasSubscription() {
      if (!this.token || !this.subscriber) {
        return false;
      }
      
      // Check if subscription expired
      if (this.subscriber.expiresAt) {
        const expiryDate = new Date(this.subscriber.expiresAt);
        if (expiryDate < new Date()) {
          console.warn('⚠️ Subscription expired');
          return false;
        }
      }
      
      return this.subscriber.status === 'active';
    }

    // Check if user has specific feature
    hasFeature(featureName) {
      if (!this.hasSubscription()) {
        return false;
      }
      
      return this.subscriber.features.includes(featureName);
    }

    // Get subscriber info
    getSubscriber() {
      return this.subscriber;
    }

    // Logout / clear token
    logout() {
      this.token = null;
      this.subscriber = null;
      localStorage.removeItem('substrack_token');
      localStorage.removeItem('substrack_subscriber');
      console.log('👋 Logged out from Substrack');
    }

    // Show subscription widget (optional UI helper)
    showWidget(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
      }
      
      if (this.hasSubscription()) {
        container.innerHTML = `
          <div style="padding: 16px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center;">
              <svg style="width: 24px; height: 24px; color: #10b981; margin-right: 12px; flex-shrink: 0;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <strong style="color: #065f46; display: block;">✅ Active Subscription</strong>
                <p style="margin: 0; font-size: 14px; color: #047857;">${this.subscriber.plan}</p>
              </div>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="padding: 16px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center;">
              <svg style="width: 24px; height: 24px; color: #f59e0b; margin-right: 12px; flex-shrink: 0;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <div>
                <strong style="color: #92400e; display: block;">⚠️ No Active Subscription</strong>
                <p style="margin: 0; font-size: 14px; color: #b45309;">Subscribe to access premium features</p>
              </div>
            </div>
          </div>
        `;
      }
    }

    // Refresh subscription status from server
    async refresh() {
      if (!this.subscriber || !this.subscriber.email) {
        console.warn('No subscriber info to refresh');
        return false;
      }

      // TODO: Implement refresh endpoint if needed
      console.log('Refresh not yet implemented');
      return false;
    }
  }

  // Expose to window
  window.Substrack = Substrack;

  // Auto-initialize if data-auto-init attribute present
  if (document.currentScript && document.currentScript.hasAttribute('data-auto-init')) {
    window.substrack = new Substrack();
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        window.substrack.init();
      });
    } else {
      window.substrack.init();
    }
  }

  console.log('✅ Substrack SDK loaded');

})(window);