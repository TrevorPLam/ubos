// AI-META-BEGIN
// AI-META: Test file for empty-state.test.tsx
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for EmptyState component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/empty-state';
import { FileX, Users, Calendar } from 'lucide-react';

describe('EmptyState Component', () => {
  it('should render with title and description', () => {
    render(
      <EmptyState
        icon={FileX}
        title="No files found"
        description="Upload your first file to get started"
      />
    );

    expect(screen.getByText('No files found')).toBeInTheDocument();
    expect(screen.getByText('Upload your first file to get started')).toBeInTheDocument();
  });

  it('should render the provided icon', () => {
    const { container } = render(
      <EmptyState
        icon={Users}
        title="No users"
        description="Add your first user"
      />
    );

    // Icon should be rendered (lucide-react icons render as SVG)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should render with action button', () => {
    render(
      <EmptyState
        icon={Calendar}
        title="No events"
        description="Create your first event"
        action={<button>Create Event</button>}
      />
    );

    expect(screen.getByText('Create Event')).toBeInTheDocument();
  });

  it('should render without action button', () => {
    render(
      <EmptyState
        icon={FileX}
        title="No results"
        description="Try adjusting your search"
      />
    );

    // Should not throw and should display content
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
  });

  it('should have proper layout classes', () => {
    const { container } = render(
      <EmptyState
        icon={FileX}
        title="Test Title"
        description="Test Description"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('flex-col');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('text-center');
  });

  it('should render different icons correctly', () => {
    const { rerender, container } = render(
      <EmptyState
        icon={FileX}
        title="Test"
        description="Test"
      />
    );

    let svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    rerender(
      <EmptyState
        icon={Users}
        title="Test"
        description="Test"
      />
    );

    svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should handle long descriptions', () => {
    const longDescription = 'This is a very long description that should still render properly without breaking the layout or causing any issues with text wrapping';
    
    render(
      <EmptyState
        icon={FileX}
        title="Test"
        description={longDescription}
      />
    );

    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it('should handle complex action components', () => {
    render(
      <EmptyState
        icon={FileX}
        title="No data"
        description="Get started now"
        action={
          <div>
            <button>Primary Action</button>
            <button>Secondary Action</button>
          </div>
        }
      />
    );

    expect(screen.getByText('Primary Action')).toBeInTheDocument();
    expect(screen.getByText('Secondary Action')).toBeInTheDocument();
  });
});
