// Test for Flashcard component, verifying that the card flips correctly and resets to the question side when moving to the next card.
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Flashcard from '../components/Flashcard';

describe('Flashcard', () => {
  it('flips and resets to the question side when moving to the next card', () => {
    const onNext = vi.fn();
    const { container } = render(
      <Flashcard
        frontContent={<span>Question</span>}
        backContent={<span>Answer</span>}
        onNext={onNext}
      />,
    );

    const stage = container.firstElementChild?.firstElementChild;

    expect(stage).toHaveStyle({ transform: 'rotateY(0deg)' });

    fireEvent.click(screen.getAllByLabelText(/sync/i)[0]);
    expect(stage).toHaveStyle({ transform: 'rotateY(180deg)' });

    fireEvent.click(screen.getAllByLabelText(/right/i)[0]);
    expect(stage).toHaveStyle({ transform: 'rotateY(0deg)' });
    expect(onNext).toHaveBeenCalled();
  });
});
