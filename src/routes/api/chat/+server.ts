import {
  MERMAID_LLM_API_ENDPOINT,
  MERMAID_LLM_API_KEY,
  MERMAID_LLM_MODEL
} from '$env/static/private';
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
${JSON.stringify(config, null, 2)}
\`\`\`

Rules:
1.  **Diagram Changes**: When the user asks to modify the diagram structure or content, ALWAYS call the 'updateDiagram' tool with the full valid Mermaid code.
2.  **Config Changes**: When the user asks to change the theme, look, or configuration (e.g. "dark mode", "change theme"), ALWAYS call the 'updateConfig' tool with the full valid JSON configuration string.
3.  **Separation**: NEVER put JSON config inside 'updateDiagram'. NEVER put Mermaid code inside 'updateConfig'.
4.  **No Markdown**: Do not output the Mermaid code or JSON in a markdown block if you are using the tool.
5.  **Explanation**: Explain your changes briefly in text along with the tool call.
6.  **Validity**: Do not hallucinate syntax that doesn't exist in Mermaid. Ensure JSON is valid.
`;

    // Prepend system message to messages
    const finalMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'updateDiagram',
          description: 'Update the Mermaid diagram code.',
          parameters: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'The full valid Mermaid diagram code to replace the current one with.'
              }
            },
            required: ['code']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'updateConfig',
          description: 'Update the Mermaid configuration (JSON).',
          parameters: {
            type: 'object',
            properties: {
              config: {
                type: 'string',
                description: 'The full valid JSON configuration string.'
              }
            },
            required: ['config']
          }
        }
      }
    ];

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: finalMessages,
        tools,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('LLM API Error:', err);
      return new Response(
        JSON.stringify({ error: `LLM Provider Error: ${response.statusText}`, details: err }),
        {
          status: response.status
        }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } catch (err) {
    console.error('Server Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
