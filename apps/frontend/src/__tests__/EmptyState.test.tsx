import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, NoData, NotFound, ErrorState } from '../components/feedback/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders action button and triggers onClick', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" action={{ label: 'Add Item', onClick }} />);
    const button = screen.getByText('Add Item');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('NoData', () => {
  it('renders default message', () => {
    render(<NoData />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<NoData message="Custom message" />);
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });
});

describe('NotFound', () => {
  it('renders title and default message', () => {
    render(<NotFound />);
    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(screen.getByText('The resource you are looking for does not exist.')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders default error title and message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    const button = screen.getByText('Try Again');
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
