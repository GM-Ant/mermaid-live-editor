import { test, expect } from '@playwright/test';

test.describe('Chat Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit');
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('should open chat bubble, send message, and accept tool call', async ({ page }) => {
    // 1. Mock the API endpoint
    await page.route('/api/chat', async (route) => {
      const jsonRequest = route.request().postDataJSON();

      // Validate request
      expect(jsonRequest).toHaveProperty('messages');

      // Validate tools definition
      // Note: The backend adds 'tools' to the OpenAI request, but the client sends 'messages' to the proxy.
      // The test checks the proxy's behavior, but here we are mocking the proxy response to the client.

      // Respond with a stream simulating a Tool Call
      const toolCallId = 'call_123';
      const functionName = 'updateDiagram';
      const functionArgs = JSON.stringify({ code: 'graph TD\n  A-->B' });

      // We need to construct chunks that mimic OpenAI streaming with tool_calls
      // 1. Content chunk ("Thinking...")
      // 2. Tool call start
      // 3. Tool call args

      const chunks = [
        { choices: [{ delta: { content: 'Sure, I can update that.' } }] },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: toolCallId,
                    type: 'function',
                    function: { name: functionName, arguments: '' }
                  }
                ]
              }
            }
          ]
        },
        {
          choices: [
            { delta: { tool_calls: [{ index: 0, function: { arguments: functionArgs } }] } }
          ]
        }
      ];

      let body = '';
      for (const chunk of chunks) {
        body += `data: ${JSON.stringify(chunk)}\n\n`;
      }
      body += 'data: [DONE]\n\n';

      await route.fulfill({
        body: body,
        contentType: 'text/event-stream'
      });
    });

    // 2. Open Chat (Floating Bubble mode initially? No, defaulted to hidden, click toggle)
    const chatToggle = page.locator('button[aria-label="Toggle Chat"]');
    await chatToggle.click();

    // It should open in floating mode by default
    await expect(page.getByText('AI Assistant')).toBeVisible(); // Header for floating mode

    // 3. Send a message
    const input = page.getByPlaceholder('How can I help you');
    await input.fill('Draw a simple graph');
    await page.keyboard.press('Enter');

    // 4. Verify assistant response
    await expect(page.getByText('Sure, I can update that.')).toBeVisible();

    // 5. Verify Tool Call "Proposed Change" UI
    await expect(page.getByText('Proposed Change')).toBeVisible();
    await expect(page.getByText('Validation Passed')).toBeVisible(); // Assuming mock code is valid

    // 6. Accept Change
    const applyBtn = page.getByRole('button', { name: 'Apply' });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // 7. Verify Editor Update
    // Check if "Applied" status shows
    await expect(page.getByText('Applied')).toBeVisible();

    // Check editor content
    await expect(page.locator('.monaco-editor')).toContainText('A-->B');
  });

  test('should switch between floating and pane modes', async ({ page }) => {
    const chatToggle = page.locator('button[aria-label="Toggle Chat"]');
    await chatToggle.click();

    // Floating initially
    await expect(page.getByText('AI Assistant')).toBeVisible();

    // Click Dock
    await page.getByTitle('Dock to side').click();

    // Verify Pane Header ("Chat")
    await expect(page.getByText('Chat', { exact: true })).toBeVisible();
    await expect(page.getByText('AI Assistant')).not.toBeVisible();

    // Click Undock
    await page.getByTitle('Undock').click();

    // Back to Floating
    await expect(page.getByText('AI Assistant')).toBeVisible();
  });

  test('should reset chat and clear history', async ({ page }) => {
    const chatToggle = page.locator('button[aria-label="Toggle Chat"]');
    await chatToggle.click();

    // Send a message (mocked response doesn't matter much here, we rely on persistence)
    await page.route('/api/chat', async (route) => {
      const chunks = [{ choices: [{ delta: { content: 'I remember this.' } }] }];
      let body = '';
      for (const chunk of chunks) {
        body += `data: ${JSON.stringify(chunk)}\n\n`;
      }
      body += 'data: [DONE]\n\n';
      await route.fulfill({ body, contentType: 'text/event-stream' });
    });

    const input = page.getByPlaceholder('How can I help you');
    await input.fill('Message to forget');
    await page.keyboard.press('Enter');

    await expect(page.getByText('Message to forget')).toBeVisible();
    await expect(page.getByText('I remember this.')).toBeVisible();

    // Reload page to verify persistence
    await page.reload();
    await chatToggle.click();
    await expect(page.getByText('Message to forget')).toBeVisible();

    // Click Reset
    await page.getByTitle('Clear Chat').click();

    // Verify messages gone
    await expect(page.getByText('Message to forget')).not.toBeVisible();
    await expect(page.getByText('Ask me to explain')).toBeVisible(); // Placeholder

    // Reload again to verify persistence cleared
    await page.reload();
    await chatToggle.click();
    await expect(page.getByText('Message to forget')).not.toBeVisible();
  });
});
