// components/sections/Services.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Services } from './Services';

describe('Services', () => {
  it('renders one card per service in SERVICES', () => {
    render(<Services />);
    expect(screen.getByText('Clases de inglés A1 – C1')).toBeInTheDocument();
    expect(screen.getByText('Inglés para profesionales')).toBeInTheDocument();
  });
});
