// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('shows the error message instead of the helper when error is set', () => {
    render(<Input label="Correo" value="" onChange={() => {}} error="Revisa tu correo" helper="texto de ayuda" />);
    expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
    expect(screen.queryByText('texto de ayuda')).not.toBeInTheDocument();
  });

  it('calls onChange with the new value as the user types', () => {
    const onChange = vi.fn();
    render(<Input label="Nombre" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    expect(onChange).toHaveBeenCalledWith('Ana');
  });
});
