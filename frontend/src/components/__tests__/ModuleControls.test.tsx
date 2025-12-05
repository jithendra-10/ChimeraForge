import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ModuleControls } from '../ModuleControls';
import type { ModuleInfo } from '../../types';

describe('ModuleControls', () => {
  const mockModules: ModuleInfo[] = [
    {
      id: 'eye',
      name: 'Eye Module',
      description: 'Vision processing',
      enabled: false,
      capabilities: ['vision'],
    },
    {
      id: 'brain',
      name: 'Brain Module',
      description: 'LLM reasoning',
      enabled: true,
      capabilities: ['reasoning'],
    },
  ];

  describe('toggle interaction', () => {
    it('should call onToggle when button is clicked', async () => {
      const onToggle = vi.fn().mockResolvedValue(mockModules[0]);

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const eyeButton = screen.getByRole('button', { name: /OFF/i });
      fireEvent.click(eyeButton);

      await waitFor(() => {
        expect(onToggle).toHaveBeenCalledWith('eye');
        expect(onToggle).toHaveBeenCalledTimes(1);
      });
    });

    it('should display correct button text based on enabled state', () => {
      const onToggle = vi.fn();

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      expect(screen.getByText('OFF')).toBeInTheDocument();
      expect(screen.getByText('ON')).toBeInTheDocument();
    });

    it('should apply correct styling for enabled modules', () => {
      const onToggle = vi.fn();

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const onButton = screen.getByRole('button', { name: /ON/i });
      expect(onButton).toHaveClass('bg-neon-green');
    });

    it('should apply correct styling for disabled modules', () => {
      const onToggle = vi.fn();

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const offButton = screen.getByRole('button', { name: /OFF/i });
      expect(offButton).toHaveClass('bg-gray-700');
    });
  });

  describe('loading states', () => {
    it('should show loading indicator while toggling', async () => {
      let resolveToggle: (value: ModuleInfo) => void;
      const togglePromise = new Promise<ModuleInfo>((resolve) => {
        resolveToggle = resolve;
      });
      const onToggle = vi.fn().mockReturnValue(togglePromise);

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const eyeButton = screen.getByRole('button', { name: /OFF/i });
      fireEvent.click(eyeButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText('...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolveToggle!(mockModules[0]);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('...')).not.toBeInTheDocument();
      });
    });

    it('should disable button while toggling', async () => {
      let resolveToggle: (value: ModuleInfo) => void;
      const togglePromise = new Promise<ModuleInfo>((resolve) => {
        resolveToggle = resolve;
      });
      const onToggle = vi.fn().mockReturnValue(togglePromise);

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const eyeButton = screen.getByRole('button', { name: /OFF/i });
      fireEvent.click(eyeButton);

      // Button should be disabled
      await waitFor(() => {
        expect(eyeButton).toBeDisabled();
      });

      // Resolve the promise
      resolveToggle!(mockModules[0]);

      // Wait for button to be enabled again
      await waitFor(() => {
        expect(eyeButton).not.toBeDisabled();
      });
    });

    it('should only disable the specific module being toggled', async () => {
      let resolveToggle: (value: ModuleInfo) => void;
      const togglePromise = new Promise<ModuleInfo>((resolve) => {
        resolveToggle = resolve;
      });
      const onToggle = vi.fn().mockReturnValue(togglePromise);

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const eyeButton = screen.getByRole('button', { name: /OFF/i });
      const brainButton = screen.getByRole('button', { name: /ON/i });

      fireEvent.click(eyeButton);

      // Eye button should be disabled
      await waitFor(() => {
        expect(eyeButton).toBeDisabled();
      });
      // Brain button should still be enabled
      expect(brainButton).not.toBeDisabled();

      // Resolve the promise
      resolveToggle!(mockModules[0]);

      await waitFor(() => {
        expect(eyeButton).not.toBeDisabled();
      });
    });
  });

  describe('API error handling', () => {
    it('should clear loading state when toggle fails', async () => {
      // Suppress console errors for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const onToggle = vi.fn().mockRejectedValue(new Error('API Error'));

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const eyeButton = screen.getByRole('button', { name: /OFF/i });
      fireEvent.click(eyeButton);

      // Should show loading initially
      await waitFor(() => {
        expect(screen.getByText('...')).toBeInTheDocument();
      });

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.queryByText('...')).not.toBeInTheDocument();
      });

      // Button should be enabled again
      expect(eyeButton).not.toBeDisabled();
      
      consoleError.mockRestore();
    });

    it('should re-enable button after error', async () => {
      // Suppress console errors for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const onToggle = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const eyeButton = screen.getByRole('button', { name: /OFF/i });
      fireEvent.click(eyeButton);

      // Wait for error handling
      await waitFor(() => {
        expect(eyeButton).not.toBeDisabled();
      });

      // Should be able to click again
      fireEvent.click(eyeButton);
      
      await waitFor(() => {
        expect(onToggle).toHaveBeenCalledTimes(2);
      });
      
      consoleError.mockRestore();
    });

    it('should handle multiple rapid toggle attempts gracefully', async () => {
      const onToggle = vi.fn().mockResolvedValue(mockModules[0]);

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      const eyeButton = screen.getByRole('button', { name: /OFF/i });

      // Try to click multiple times rapidly
      fireEvent.click(eyeButton);
      fireEvent.click(eyeButton);
      fireEvent.click(eyeButton);

      // Should only call onToggle once (button is disabled after first click)
      await waitFor(() => {
        expect(onToggle).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('module display', () => {
    it('should render all modules', () => {
      const onToggle = vi.fn();

      render(<ModuleControls modules={mockModules} onToggle={onToggle} />);

      expect(screen.getByText('Eye Module')).toBeInTheDocument();
      expect(screen.getByText('Brain Module')).toBeInTheDocument();
      expect(screen.getByText('Vision processing')).toBeInTheDocument();
      expect(screen.getByText('LLM reasoning')).toBeInTheDocument();
    });

    it('should render empty state when no modules provided', () => {
      const onToggle = vi.fn();

      render(<ModuleControls modules={[]} onToggle={onToggle} />);

      expect(screen.getByText('Module Controls')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
