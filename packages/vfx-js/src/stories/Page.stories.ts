import type { Meta, StoryObj } from '@storybook/html';
import { expect, userEvent, within } from '@storybook/test';

import { createPage } from './Page';

const meta = {
  title: 'Example/Page',
  render: () => createPage(),
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

export const LoggedOut: StoryObj = {};

// More on component testing: https://storybook.js.org/docs/writing-tests/component-testing
export const LoggedIn: StoryObj = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const loginButton = canvas.getByRole('button', { name: /Log in/i });
    await expect(loginButton).toBeInTheDocument();
    await userEvent.click(loginButton);
    await expect(loginButton).not.toBeInTheDocument();

    const logoutButton = canvas.getByRole('button', { name: /Log out/i });
    await expect(logoutButton).toBeInTheDocument();
  },
};
