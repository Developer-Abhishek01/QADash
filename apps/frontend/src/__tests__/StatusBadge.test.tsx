import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, getStatusColor } from '../components/common/StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['passed', 'Passed'],
    ['failed', 'Failed'],
    ['running', 'Running'],
    ['pending', 'Pending'],
    ['cancelled', 'Cancelled'],
    ['skipped', 'Skipped'],
    ['error', 'Error'],
    ['completed', 'Completed'],
  ])('renders %s status with label %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge status="passed" label="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  it('renders the raw status when no mapping exists', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('is case insensitive', () => {
    render(<StatusBadge status="PASSED" />);
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });
});

describe('getStatusColor', () => {
  it('returns success for passed', () => {
    expect(getStatusColor('passed')).toBe('success');
  });

  it('returns error for failed', () => {
    expect(getStatusColor('failed')).toBe('error');
  });

  it('returns warning for cancelled', () => {
    expect(getStatusColor('cancelled')).toBe('warning');
  });

  it('returns default for unknown', () => {
    expect(getStatusColor('unknown')).toBe('default');
  });
});
