/**
 * Application configuration
 */
export interface AppConfig {
  locale: 'fr' | 'en';
  theme: 'light' | 'dark' | 'system';
  isOffline: boolean;
  lastSync: string | null;
}

/**
 * PWA install prompt event
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  name: string;
  category: 'menu' | 'cart' | 'order' | 'pwa' | 'error';
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
}

/**
 * Error report
 */
export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  context?: Record<string, unknown>;
}
