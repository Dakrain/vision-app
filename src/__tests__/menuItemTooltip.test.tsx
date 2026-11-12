import '@testing-library/jest-dom';
import '../renderer/i18n';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Dropdown, Popover } from 'antd';
import { useState } from 'react';
import { MenuItem } from '../renderer/features/Meeting/components/MenuItem/MenuItem';

// The meeting's bottom bar shows icons only: each button's name shows
// above it on hover (CSS, .with-tooltip), not after the browser's slow
// title tooltip — and not while the button's own menu is open there.
describe('MenuItem in the bottom bar', () => {
  it('carries its name for the hover label, not the slow title', () => {
    render(
      <MenuItem icon="micOn" name="Âm thanh" onClick={() => {}} tooltip />,
    );
    const button = screen.getByRole('button', { name: 'Âm thanh' });
    expect(button).toHaveClass('with-tooltip');
    expect(button).not.toHaveAttribute('title');
    expect(button.querySelector('.menu-item-label')).toHaveTextContent(
      'Âm thanh',
    );
  });

  it('keeps the plain title where the label is not hidden', () => {
    render(<MenuItem icon="micOn" name="Bố cục" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bố cục' })).toHaveAttribute(
      'title',
      'Bố cục',
    );
  });

  it('opens its menu on the first click, marked open (which hides the label)', async () => {
    function Picker() {
      const [open, setOpen] = useState(false);
      return (
        <Popover
          open={open}
          onOpenChange={(next) => !next && setOpen(false)}
          trigger="click"
          content={<div>Cảm xúc</div>}
        >
          <MenuItem
            icon="emoji"
            name="Thả cảm xúc"
            tooltip
            onClick={() => setOpen(true)}
          />
        </Popover>
      );
    }
    render(<Picker />);
    const button = screen.getByRole('button', { name: 'Thả cảm xúc' });

    await act(async () => {
      fireEvent.mouseDown(button);
      fireEvent.click(button);
    });

    expect(await screen.findByText('Cảm xúc')).toBeInTheDocument();
    expect(button).toHaveClass('ant-popover-open');
  });

  it('in a Dropdown, opens its menu and is marked open itself', async () => {
    render(
      <Dropdown
        trigger={['click']}
        menu={{ items: [{ key: 'devices', label: 'Micrô, camera và loa' }] }}
      >
        <MenuItem icon="meetingSetting" name="Cài đặt" tooltip />
      </Dropdown>,
    );
    const button = screen.getByRole('button', { name: 'Cài đặt' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(await screen.findByText('Micrô, camera và loa')).toBeInTheDocument();
    expect(button).toHaveClass('ant-dropdown-open');
  });
});
