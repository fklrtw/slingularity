import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreditsMenu } from './credits-menu';

describe('CreditsMenu', () => {
  it('renders correctly and calls onClose when clicking the close button', () => {
    const onClose = vi.fn();
    render(<CreditsMenu onClose={onClose} />);

    expect(screen.getByText('Credits & Licenses')).toBeDefined();
    expect(screen.getByText('fklrtw')).toBeDefined();
    expect(screen.getByText('Google Antigravity')).toBeDefined();
    expect(screen.getByText('Software Stack')).toBeDefined();

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the overlay', () => {
    const onClose = vi.fn();
    render(<CreditsMenu onClose={onClose} />);

    const overlay = document.querySelector('.credits-overlay');
    expect(overlay).not.toBeNull();
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('contains links to required software', () => {
    render(<CreditsMenu onClose={() => {}} />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map(link => link.getAttribute('href'));

    expect(hrefs).toContain('https://react.dev');
    expect(hrefs).toContain('https://threejs.org');
    expect(hrefs).toContain('https://strudel.cc');
    expect(hrefs).toContain('https://antigravity.google');
  });
});
