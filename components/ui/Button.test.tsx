// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Agendar</Button>);
    expect(screen.getByText('Agendar')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Agendar</Button>);
    fireEvent.click(screen.getByText('Agendar'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Agendar</Button>);
    fireEvent.click(screen.getByText('Agendar'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
