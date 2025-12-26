import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear toasts before each test
    const toast = useToast();
    toast.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('showToast', () => {
    it('adds toast to toasts array', () => {
      const toast = useToast();
      toast.showToast('Test message');
      expect(toast.toasts.value).toHaveLength(1);
    });

    it('creates toast with correct properties', () => {
      const toast = useToast();
      toast.showToast('Test message', 'info', 3000);

      expect(toast.toasts.value[0]).toMatchObject({
        variant: 'info',
        message: 'Test message',
        duration: 3000,
      });
    });

    it('uses info variant by default', () => {
      const toast = useToast();
      toast.showToast('Test message');
      expect(toast.toasts.value[0]?.variant).toBe('info');
    });

    it('uses 3000ms duration by default', () => {
      const toast = useToast();
      toast.showToast('Test message');
      expect(toast.toasts.value[0]?.duration).toBe(3000);
    });

    it('returns toast id', () => {
      const toast = useToast();
      const id = toast.showToast('Test message');
      expect(id).toMatch(/^toast-\d+$/);
    });

    it('generates unique ids for each toast', () => {
      const toast = useToast();
      const id1 = toast.showToast('Message 1');
      const id2 = toast.showToast('Message 2');
      expect(id1).not.toBe(id2);
    });

    it('auto-removes toast after duration', () => {
      const toast = useToast();
      toast.showToast('Test message', 'info', 3000);

      expect(toast.toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(3000);

      expect(toast.toasts.value).toHaveLength(0);
    });

    it('does not auto-remove when duration is 0', () => {
      const toast = useToast();
      toast.showToast('Persistent message', 'info', 0);

      vi.advanceTimersByTime(10000);

      expect(toast.toasts.value).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('removes specific toast by id', () => {
      const toast = useToast();
      const id = toast.showToast('Test message', 'info', 0);
      toast.showToast('Other message', 'info', 0);

      expect(toast.toasts.value).toHaveLength(2);

      toast.removeToast(id);

      expect(toast.toasts.value).toHaveLength(1);
      expect(toast.toasts.value[0]?.message).toBe('Other message');
    });

    it('does nothing when id not found', () => {
      const toast = useToast();
      toast.showToast('Test message', 'info', 0);

      toast.removeToast('non-existent-id');

      expect(toast.toasts.value).toHaveLength(1);
    });
  });

  describe('success', () => {
    it('shows success variant toast', () => {
      const toast = useToast();
      toast.success('Success!');
      expect(toast.toasts.value[0]?.variant).toBe('success');
    });

    it('uses custom duration when provided', () => {
      const toast = useToast();
      toast.success('Success!', 5000);
      expect(toast.toasts.value[0]?.duration).toBe(5000);
    });
  });

  describe('error', () => {
    it('shows error variant toast', () => {
      const toast = useToast();
      toast.error('Error!');
      expect(toast.toasts.value[0]?.variant).toBe('error');
    });
  });

  describe('warning', () => {
    it('shows warning variant toast', () => {
      const toast = useToast();
      toast.warning('Warning!');
      expect(toast.toasts.value[0]?.variant).toBe('warning');
    });
  });

  describe('info', () => {
    it('shows info variant toast', () => {
      const toast = useToast();
      toast.info('Info!');
      expect(toast.toasts.value[0]?.variant).toBe('info');
    });
  });

  describe('clearAll', () => {
    it('removes all toasts', () => {
      const toast = useToast();
      toast.showToast('Message 1', 'info', 0);
      toast.showToast('Message 2', 'info', 0);
      toast.showToast('Message 3', 'info', 0);

      expect(toast.toasts.value).toHaveLength(3);

      toast.clearAll();

      expect(toast.toasts.value).toHaveLength(0);
    });
  });

  describe('shared state', () => {
    it('shares toasts between composable instances', () => {
      const toast1 = useToast();
      const toast2 = useToast();

      toast1.showToast('From instance 1', 'info', 0);

      // Both instances should see the same toast
      expect(toast2.toasts.value).toHaveLength(1);
      expect(toast2.toasts.value[0]?.message).toBe('From instance 1');
    });
  });
});
