import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useOffline } from '../useOffline';
import { useConfigStore } from '@/stores/configStore';

// Test component that uses the composable
const TestComponent = defineComponent({
  setup() {
    const offline = useOffline();
    return { offline };
  },
  render() {
    return h('div');
  },
});

describe('useOffline', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('reflects navigator.onLine on mount', () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // In test environment, navigator.onLine is true by default
      expect(offline.isOffline.value).toBe(!navigator.onLine);
    });

    it('showOnlineMessage starts as false', () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      expect(offline.showOnlineMessage.value).toBe(false);
    });
  });

  describe('online/offline events', () => {
    it('sets isOffline to true when going offline', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      window.dispatchEvent(new Event('offline'));

      expect(offline.isOffline.value).toBe(true);
    });

    it('sets isOffline to false when going online', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // First go offline
      window.dispatchEvent(new Event('offline'));
      expect(offline.isOffline.value).toBe(true);

      // Then go online
      window.dispatchEvent(new Event('online'));
      expect(offline.isOffline.value).toBe(false);
    });

    it('shows online message after being offline', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // Go offline first
      window.dispatchEvent(new Event('offline'));

      // Then come back online
      window.dispatchEvent(new Event('online'));

      expect(offline.showOnlineMessage.value).toBe(true);
    });

    it('hides online message after 3 seconds', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // Go offline then online
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(offline.showOnlineMessage.value).toBe(true);

      vi.advanceTimersByTime(3000);

      expect(offline.showOnlineMessage.value).toBe(false);
    });

    it('does not show online message if was never offline', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // Trigger online without going offline first
      window.dispatchEvent(new Event('online'));

      expect(offline.showOnlineMessage.value).toBe(false);
    });
  });

  describe('dismissOnlineMessage', () => {
    it('hides online message immediately', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // Go offline then online
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(offline.showOnlineMessage.value).toBe(true);

      offline.dismissOnlineMessage();

      expect(offline.showOnlineMessage.value).toBe(false);
    });

    it('clears pending timeout', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // Go offline then online
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      // Dismiss immediately
      offline.dismissOnlineMessage();

      // Advance time - should not throw or cause issues
      vi.advanceTimersByTime(5000);

      expect(offline.showOnlineMessage.value).toBe(false);
    });
  });

  describe('config store integration', () => {
    it('updates config store when going offline', async () => {
      mount(TestComponent);
      const configStore = useConfigStore();

      window.dispatchEvent(new Event('offline'));

      expect(configStore.isOffline).toBe(true);
    });

    it('updates config store when going online', async () => {
      mount(TestComponent);
      const configStore = useConfigStore();

      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(configStore.isOffline).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const wrapper = mount(TestComponent);
      wrapper.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('rapid online/offline changes', () => {
    it('handles rapid state changes correctly', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // Rapid changes
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));

      expect(offline.isOffline.value).toBe(true);
      expect(offline.showOnlineMessage.value).toBe(false);
    });

    it('cancels pending online message when going offline', async () => {
      const wrapper = mount(TestComponent);
      const { offline } = wrapper.vm;

      // Go offline then online
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(offline.showOnlineMessage.value).toBe(true);

      // Go offline again before timeout
      window.dispatchEvent(new Event('offline'));

      expect(offline.showOnlineMessage.value).toBe(false);

      // Advance time - should not show message
      vi.advanceTimersByTime(5000);
      expect(offline.showOnlineMessage.value).toBe(false);
    });
  });
});
