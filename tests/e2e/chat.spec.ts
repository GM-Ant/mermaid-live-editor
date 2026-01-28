import { test, expect } from '@playwright/test';

test.describe('Chat Integration', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		// Set viewport to ensure desktop layout (visible chat toggle)
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('should open chat panel, send message, receive stream, and apply code', async ({ page }) => {
		// 1. Mock the API endpoint
		await page.route('/api/chat', async (route) => {
			const jsonRequest = route.request().postDataJSON();
			console.log('API Request:', jsonRequest);

			// Validate request structure
			expect(jsonRequest).toHaveProperty('messages');
			expect(jsonRequest).toHaveProperty('code');
			expect(jsonRequest).toHaveProperty('config');

			// Respond with a stream (simulated as full body since Playwright route.fulfill body doesn't stream easily)
            const chunks = [
                'Hello',
                ' there!',
                '\nHere is a diagram:\n',
                '```mermaid\n',
                'graph TD\n',
                '  A[Start] --> B[End]\n',
                '```\n',
                'Hope this helps.'
            ];

            let body = '';
            for (const chunk of chunks) {
                const payload = {
                    choices: [{ delta: { content: chunk } }]
                };
                body += `data: ${JSON.stringify(payload)}\n\n`;
            }
            body += 'data: [DONE]\n\n';

			await route.fulfill({
				body: body,
				contentType: 'text/event-stream',
			});
		});

		// 2. Open Chat Panel
		const chatToggle = page.locator('button[aria-label="Toggle Chat"]');
		await chatToggle.click();
		await expect(page.getByText('Ask me to explain')).toBeVisible();

		// 3. Send a message
		const input = page.getByPlaceholder('How can I help you');
		await input.fill('Draw a simple graph');
		await page.keyboard.press('Enter');

		// 4. Verify user message
		await expect(page.getByText('Draw a simple graph')).toBeVisible();

		// 5. Verify assistant response (streamed)
		// Wait for the full text to appear
		await expect(page.getByText('Hello there!')).toBeVisible();
		await expect(page.getByText('Hope this helps.')).toBeVisible();

		// 6. Verify "Apply Diagram" button
		const applyBtn = page.getByRole('button', { name: 'Apply Diagram' });
		await expect(applyBtn).toBeVisible();

		// 7. Click Apply and verify editor update
		await applyBtn.click();

		// Check if the editor code updated.
        // The monaco editor is tricky to read directly, but we can check the store via console or check the text in the DOM if visible.
        // Or simpler: The "code" tab should be active.

        // Let's assume the text "A[Start] --> B[End]" appears in the editor area.
        // Monaco renders text in lines.
        await expect(page.locator('.monaco-editor')).toContainText('A[Start] --> B[End]');
	});

    test('should handle API errors', async ({ page }) => {
        await page.route('/api/chat', async (route) => {
            await route.fulfill({
                status: 500,
                body: JSON.stringify({ error: 'Internal Server Error' }),
                contentType: 'application/json'
            });
        });

        // Open Chat
		await page.locator('button[aria-label="Toggle Chat"]').click();

        // Send message
		await page.getByPlaceholder('How can I help you').fill('Fail me');
		await page.keyboard.press('Enter');

        // Verify error message
        await expect(page.getByText('Internal Server Error')).toBeVisible();
    });
});
