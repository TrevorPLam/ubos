/**
 * Tests for StatusBadge component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/status-badge';

describe('StatusBadge Component', () => {
  describe('Deal Stages', () => {
    it('should render lead badge', () => {
      render(<StatusBadge status="lead" />);
      expect(screen.getByText('Lead')).toBeInTheDocument();
    });

    it('should render qualified badge', () => {
      render(<StatusBadge status="qualified" />);
      expect(screen.getByText('Qualified')).toBeInTheDocument();
    });

    it('should render won badge', () => {
      render(<StatusBadge status="won" />);
      expect(screen.getByText('Won')).toBeInTheDocument();
    });

    it('should render lost badge', () => {
      render(<StatusBadge status="lost" />);
      expect(screen.getByText('Lost')).toBeInTheDocument();
    });
  });

  describe('Proposal/Contract Status', () => {
    it('should render draft badge', () => {
      render(<StatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should render sent badge', () => {
      render(<StatusBadge status="sent" />);
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });

    it('should render accepted badge', () => {
      render(<StatusBadge status="accepted" />);
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });

    it('should render rejected badge', () => {
      render(<StatusBadge status="rejected" />);
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('should render signed badge', () => {
      render(<StatusBadge status="signed" />);
      expect(screen.getByText('Signed')).toBeInTheDocument();
    });
  });

  describe('Project/Task Status', () => {
    it('should render not_started badge', () => {
      render(<StatusBadge status="not_started" />);
      expect(screen.getByText('Not Started')).toBeInTheDocument();
    });

    it('should render in_progress badge', () => {
      render(<StatusBadge status="in_progress" />);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should render completed badge', () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render on_hold badge', () => {
      render(<StatusBadge status="on_hold" />);
      expect(screen.getByText('On Hold')).toBeInTheDocument();
    });
  });

  describe('Priority Levels', () => {
    it('should render low priority badge', () => {
      render(<StatusBadge status="low" />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should render medium priority badge', () => {
      render(<StatusBadge status="medium" />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should render high priority badge', () => {
      render(<StatusBadge status="high" />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should render urgent priority badge', () => {
      render(<StatusBadge status="urgent" />);
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  describe('Invoice Status', () => {
    it('should render paid badge', () => {
      render(<StatusBadge status="paid" />);
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('should render overdue badge', () => {
      render(<StatusBadge status="overdue" />);
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('should render pending badge', () => {
      render(<StatusBadge status="pending" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply green color for positive statuses', () => {
      const { container } = render(<StatusBadge status="won" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('green');
    });

    it('should apply red color for negative statuses', () => {
      const { container } = render(<StatusBadge status="lost" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('red');
    });

    it('should accept custom className', () => {
      const { container } = render(<StatusBadge status="active" className="custom-class" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('custom-class');
    });

    it('should have font-medium class', () => {
      const { container } = render(<StatusBadge status="active" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('font-medium');
    });
  });

  describe('Fallback Behavior', () => {
    it('should handle unknown status gracefully', () => {
      // @ts-expect-error - Testing runtime fallback for unknown status
      render(<StatusBadge status="unknown_status" />);
      expect(screen.getByText('unknown_status')).toBeInTheDocument();
    });
  });
});
