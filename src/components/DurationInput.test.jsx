import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DurationInput from './DurationInput';

function setup(props = {}) {
  const onChange = vi.fn();
  render(<DurationInput value="" onChange={onChange} {...props} />);
  return { onChange, input: screen.getByLabelText('Duration') };
}

describe('DurationInput', () => {
  it('shows the hint before anything is typed', () => {
    setup();
    expect(screen.getByText(/Type 1h 20min/)).toBeInTheDocument();
  });

  it('echoes the parsed duration back and reports minutes upwards', () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: '1h 20min' } });

    expect(screen.getByText('= 1h 20min')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      text: '1h 20min',
      minutes: 80,
      error: null,
    });
  });

  it('normalises other notations to the same value', () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: '1,5h' } });

    expect(screen.getByText('= 1h 30min')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ minutes: 90, error: null }),
    );
  });

  it('surfaces an error and reports null minutes for nonsense', () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: 'abc' } });

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: 'abc', minutes: null }),
    );
    expect(onChange.mock.calls.at(-1)[0].error).toMatch(/not a duration/);
  });

  it('honours a larger ceiling for goals', () => {
    const { onChange, input } = setup({ maxMinutes: 60 * 24 * 31 });

    fireEvent.change(input, { target: { value: '40h' } });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ minutes: 2400, error: null }),
    );
  });
});
