import { MERMAID_LLM_API_ENDPOINT, MERMAID_LLM_API_KEY, MERMAID_LLM_MODEL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const {
			messages,
			code,
			config,
			apiKey: userApiKey,
			endpoint: userEndpoint,
			model: userModel
		} = await request.json();

		const apiKey = userApiKey || MERMAID_LLM_API_KEY;
		const endpoint = userEndpoint || MERMAID_LLM_API_ENDPOINT;
		const model = userModel || MERMAID_LLM_MODEL || 'gpt-3.5-turbo';

		if (!endpoint) {
			return new Response(JSON.stringify({ error: 'No LLM endpoint configured.' }), {
				status: 500
			});
		}

		// Prepare the system message
		const systemPrompt = `You are an expert Mermaid diagram assistant.
Your task is to help the user create, edit, and understand Mermaid diagrams.
The user's current diagram code is:
\`\`\`mermaid
${code}
\`\`\`
The current Mermaid configuration is:
\`\`\`json
${config}
\`\`\`

Rules:
1.  Always prioritize valid Mermaid syntax.
2.  If asked to modify the diagram, provide the full updated Mermaid code in a code block.
3.  Explain your changes briefly.
4.  Do not hallucinate syntax that doesn't exist in Mermaid.
`;

		// Prepend system message to messages
		const finalMessages = [{ role: 'system', content: systemPrompt }, ...messages];

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const response = await fetch(`${endpoint}/chat/completions`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model,
				messages: finalMessages,
				stream: true
			})
		});

		if (!response.ok) {
			const err = await response.text();
			console.error('LLM API Error:', err);
			return new Response(JSON.stringify({ error: `LLM Provider Error: ${response.statusText}`, details: err }), {
				status: response.status
			});
		}

		return new Response(response.body, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			}
		});
	} catch (err) {
		console.error('Server Error:', err);
		return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
	}
};
