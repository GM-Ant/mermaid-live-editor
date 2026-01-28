<script lang="ts">
	import { stateStore, updateCode, updateCodeStore } from '$lib/util/state';
	import { Button } from '$lib/components/ui/button';
	import { Send, Bot, User, Loader2, Play } from 'lucide-svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { tick } from 'svelte';
	import type { State } from '$lib/types';

	let messages = $state<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([]);
	let input = $state('');
	let isLoading = $state(false);
	let chatContainer: HTMLDivElement;

	const scrollToBottom = async () => {
		await tick();
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	};

	const sendMessage = async () => {
		if (!input.trim() || isLoading) return;

		const userMessage = { role: 'user' as const, content: input };
		messages = [...messages, userMessage];
		input = '';
		isLoading = true;
		await scrollToBottom();

		const currentCode = $stateStore.code;
		const currentConfig = $stateStore.mermaid;

		// Add placeholder for assistant
		messages = [...messages, { role: 'assistant', content: '' }];
		const assistantIndex = messages.length - 1;

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages.slice(0, -1), // Exclude the empty assistant message
					code: currentCode,
					config: currentConfig
				})
			});

			if (!response.ok) throw new Error(response.statusText);

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No stream response');

			const decoder = new TextDecoder();
			let done = false;
			let buffer = '';

			while (!done) {
				const { value, done: streamDone } = await reader.read();
				done = streamDone;
				if (value) {
					const chunk = decoder.decode(value, { stream: true });
					buffer += chunk;
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.trim() === '') continue;
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') continue;
							try {
								const parsed = JSON.parse(data);
								const content = parsed.choices?.[0]?.delta?.content || '';
								if (content) {
									messages[assistantIndex].content += content;
									scrollToBottom();
								}
							} catch (e) {
								console.error('Error parsing SSE:', e);
							}
						}
					}
				}
			}
		} catch (error) {
			console.error('Chat error:', error);
			messages[assistantIndex].content += `\n\n*Error: ${error instanceof Error ? error.message : 'Unknown error'}*`;
		} finally {
			isLoading = false;
		}
	};

	const extractMermaidCode = (content: string): string | null => {
		const match = content.match(/```mermaid\n([\s\S]*?)\n```/);
		return match ? match[1] : null;
	};

	const applyCode = (content: string) => {
		const code = extractMermaidCode(content);
		if (code) {
			// Check if we are in config mode, if so switch to code mode
			if ($stateStore.editorMode === 'config') {
				updateCodeStore({ editorMode: 'code' });
			}
			updateCode(code, { updateDiagram: true });
		}
	};

	// Derived state to check if the last message has code to apply
    // This helper function is used in the template
    const hasMermaidCode = (content: string) => !!extractMermaidCode(content);

	const renderMarkdown = (content: string) => {
		// sanitizing locally
		return DOMPurify.sanitize(marked.parse(content) as string);
	};
</script>

<div class="flex h-full flex-col overflow-hidden bg-background">
	<div class="flex-1 overflow-y-auto p-4" bind:this={chatContainer}>
		{#each messages as msg}
			<div class="mb-4 flex flex-col gap-2 {msg.role === 'user' ? 'items-end' : 'items-start'}">
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					{#if msg.role === 'user'}
						<span>You</span> <User size={14} />
					{:else}
						<Bot size={14} /> <span>Assistant</span>
					{/if}
				</div>
				<div
					class="prose prose-sm dark:prose-invert max-w-[90%] rounded-lg p-3 {msg.role === 'user'
						? 'bg-primary text-primary-foreground'
						: 'bg-muted'}"
				>
					{@html renderMarkdown(msg.content)}
				</div>
				{#if msg.role === 'assistant' && hasMermaidCode(msg.content) && !isLoading}
					<Button
						variant="outline"
						size="sm"
						class="gap-2 self-start"
						onclick={() => applyCode(msg.content)}
					>
						<Play size={14} />
						Apply Diagram
					</Button>
				{/if}
			</div>
		{/each}
        {#if messages.length === 0}
            <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground opacity-50">
                <Bot size={48} class="mb-4" />
                <p>Ask me to explain or edit your diagram.</p>
            </div>
        {/if}
	</div>

	<div class="border-t p-4">
		<div class="relative">
			<textarea
				bind:value={input}
				class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				placeholder="How can I help you with this diagram?"
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						sendMessage();
					}
				}}
			></textarea>
			<Button
				size="icon"
				class="absolute bottom-2 right-2 h-8 w-8"
				disabled={isLoading || !input.trim()}
				onclick={sendMessage}
			>
				{#if isLoading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<Send class="h-4 w-4" />
				{/if}
				<span class="sr-only">Send</span>
			</Button>
		</div>
	</div>
</div>
