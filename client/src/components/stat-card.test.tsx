// AI-META-BEGIN
// AI-META: Test file for stat-card.test.tsx
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for StatCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/stat-card';
import { DollarSign, Users, FileText } from 'lucide-react';

describe('StatCard Component', () => {
  it('should render title and value', () => {
    render(<StatCard title="Total Revenue" value="$10,000" />);

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
  });

  it('should render numeric values', () => {
    render(<StatCard title="Active Users" value={150} />);

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should render with description', () => {
    render(
      <StatCard
        title="Revenue"
        value="$50,000"
        description="This month"
      />
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('should render without description', () => {
    render(<StatCard title="Revenue" value="$50,000" />);

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('should render with icon', () => {
    const { container } = render(
      <StatCard title="Revenue" value="$50,000" icon={DollarSign} />
    );

    // Icon should be rendered (lucide-react icons render as SVG)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should render without icon', () => {
    const { container } = render(
      <StatCard title="Revenue" value="$50,000" />
    );

    // Check that the icon container is not present
    const iconContainer = container.querySelector('.bg-muted.p-2\\.5');
    expect(iconContainer).not.toBeInTheDocument();
  });

  describe('Trend Display', () => {
    it('should render positive trend', () => {
      render(
        <StatCard
          title="Revenue"
          value="$50,000"
          trend={{ value: 12.5, isPositive: true }}
        />
      );

      const trendElement = screen.getByText('+12.5%');
      expect(trendElement).toBeInTheDocument();
      expect(trendElement.className).toContain('green');
    });

    it('should render negative trend', () => {
      render(
        <StatCard
          title="Revenue"
          value="$50,000"
          trend={{ value: 5.3, isPositive: false }}
        />
      );

      const trendElement = screen.getByText('-5.3%');
      expect(trendElement).toBeInTheDocument();
      expect(trendElement.className).toContain('red');
    });

    it('should render without trend', () => {
      render(<StatCard title="Revenue" value="$50,000" />);

      // No trend text should be present
      expect(screen.queryByText(/[+-]\d+\.?\d*%/)).not.toBeInTheDocument();
    });

    it('should handle zero trend as positive', () => {
      render(
        <StatCard
          title="Revenue"
          value="$50,000"
          trend={{ value: 0, isPositive: true }}
        />
      );

      expect(screen.getByText('+0%')).toBeInTheDocument();
    });

    it('should handle zero trend as negative', () => {
      render(
        <StatCard
          title="Revenue"
          value="$50,000"
          trend={{ value: 0, isPositive: false }}
        />
      );

      expect(screen.getByText('-0%')).toBeInTheDocument();
    });
  });

  describe('Complete Examples', () => {
    it('should render complete stat card with all props', () => {
      render(
        <StatCard
          title="Total Revenue"
          value="$125,430"
          description="Last 30 days"
          icon={DollarSign}
          trend={{ value: 15.3, isPositive: true }}
        />
      );

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$125,430')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('+15.3%')).toBeInTheDocument();
    });

    it('should render stat card for user count', () => {
      render(
        <StatCard
          title="Active Users"
          value={2543}
          description="Current month"
          icon={Users}
          trend={{ value: 8.2, isPositive: true }}
        />
      );

      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('2543')).toBeInTheDocument();
    });

    it('should render stat card for documents', () => {
      render(
        <StatCard
          title="Documents"
          value={89}
          icon={FileText}
          trend={{ value: 2.1, isPositive: false }}
        />
      );

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('89')).toBeInTheDocument();
      expect(screen.getByText('-2.1%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      render(<StatCard title="Views" value={1234567890} />);
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });

    it('should handle decimal numbers', () => {
      render(<StatCard title="Average" value={42.7} />);
      expect(screen.getByText('42.7')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      render(<StatCard title="Balance" value="-$500" />);
      expect(screen.getByText('-$500')).toBeInTheDocument();
    });

    it('should handle empty string value', () => {
      render(<StatCard title="Test" value="" />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});
