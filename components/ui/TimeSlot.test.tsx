// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSlot } from './TimeSlot';

describe('TimeSlot', () => {
  it('renders the time label', () => {
    render(<TimeSlot time="6:00 am" status="available" selected={false} onClick={() => {}} />);
    expect(screen.getByText('6:00 am')).toBeInTheDocument();
  });

  it('is not clickable when booked', () => {
    const onClick = vi.fn();
    render(<TimeSlot time="6:00 am" status="booked" selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('6:00 am'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onClick when available and clicked', () => {
    const onClick = vi.fn();
    render(<TimeSlot time="6:00 am" status="available" selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('6:00 am'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
