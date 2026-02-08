import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatbotBubble } from '../components/ChatbotBubble';

describe('ChatbotBubble', () => {
  beforeEach(() => {
    // Polyfill fetch if not available during tests
    if (!global.fetch) {
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({ answer: 'Hello!', sources: [], confidence: 1 }),
        } as any);
    }
  });

  it('renders closed bubble by default', () => {
    render(<ChatbotBubble />);
    expect(screen.getByRole('button', { name: /open chatbot/i })).toBeInTheDocument();
  });

  it('opens panel when bubble is clicked', async () => {
    const user = userEvent.setup();
    render(<ChatbotBubble />);
    await user.click(screen.getByRole('button', { name: /open chatbot/i }));
    expect(screen.getByText(/i'm here to help/i)).toBeInTheDocument();
  });
});


