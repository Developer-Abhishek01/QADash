import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading, PageLoading, TableLoading, CardLoading } from '../components/feedback/Loading';

describe('Loading', () => {
  it('renders a circular progress', () => {
    render(<Loading />);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<Loading message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('does not render message when not provided', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders fullScreen backdrop when fullScreen is true', () => {
    render(<Loading fullScreen />);
    expect(document.querySelector('.MuiBackdrop-root')).toBeInTheDocument();
  });

  it('does not render backdrop when fullScreen is false', () => {
    render(<Loading fullScreen={false} />);
    expect(document.querySelector('.MuiBackdrop-root')).not.toBeInTheDocument();
  });
});

describe('PageLoading', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<PageLoading />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(3);
  });
});

describe('TableLoading', () => {
  it('renders default 5 rows', () => {
    const { container } = render(<TableLoading />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(5);
  });

  it('renders custom number of rows', () => {
    const { container } = render(<TableLoading rows={3} />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(3);
  });
});

describe('CardLoading', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<CardLoading />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(3);
  });
});
