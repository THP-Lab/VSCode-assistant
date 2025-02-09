export interface ElizaMessage {
	role: "user" | "assistant"
	content: string
}

export interface ElizaOptions {
	customPatterns?: Array<{
		regex: RegExp
		responses: string[]
	}>
	customFallbacks?: string[]
}

export class Eliza {
	private patterns: Array<{
		regex: RegExp
		responses: string[]
	}>
	private context: {
		lastTopic?: string
		mentionedTopics: Set<string>
		repetitionCount: Map<string, number>
	}

	constructor(options?: ElizaOptions) {
		// Initialize patterns
		this.patterns = [
			{
				regex: /.*\b(i am|i'm)\s+(.*)/i,
				responses: ["Why do you say you are %2?", "How long have you been %2?", "Do you believe it is normal to be %2?"],
			},
			{
				regex: /.*\b(i feel|i am feeling)\s+(.*)/i,
				responses: ["Tell me more about feeling %2.", "Do you often feel %2?", "Why do you think you feel %2?"],
			},
			{
				regex: /.*\b(i want|i need)\s+(.*)/i,
				responses: ["What would it mean if you got %2?", "Why do you want %2?", "What would you do if you got %2?"],
			},
			// Add context-aware patterns
			{
				regex: /.*\b(yes|yeah|yep|yup)\b.*/i,
				responses: [
					"You seem quite sure about that.",
					"Can you elaborate on why you feel that way?",
					"What makes you so certain?",
				],
			},
			{
				regex: /.*\b(no|nope|nah)\b.*/i,
				responses: ["Why not?", "What makes you say no?", "Are you sure about that?"],
			},
			// Default fallback responses
			{
				regex: /.*/,
				responses: [
					"Please tell me more.",
					"Let's explore that further.",
					"How does that make you feel?",
					"What do you think that means?",
					"Can you elaborate on that?",
				],
			},
		]

		// Add custom patterns if provided
		if (options?.customPatterns) {
			this.patterns.unshift(...options.customPatterns)
		}

		// Add custom fallbacks if provided
		if (options?.customFallbacks) {
			const fallbackPattern = this.patterns[this.patterns.length - 1]
			fallbackPattern.responses = options.customFallbacks
		}

		// Initialize context
		this.context = {
			mentionedTopics: new Set(),
			repetitionCount: new Map(),
		}
	}

	public getResponse(input: string): string {
		// Extract potential topic from input
		const topic = this.extractTopic(input)
		if (topic) {
			this.context.lastTopic = topic
			this.context.mentionedTopics.add(topic.toLowerCase())
		}

		// Find matching pattern
		const pattern = this.patterns.find((p) => p.regex.test(input))
		if (!pattern) {
			return this.getContextualFallback()
		}

		// Get response and track repetition
		const response = this.getRandomResponse(pattern.responses)
		this.trackResponseRepetition(response)

		return this.formatResponse(response, input)
	}

	private extractTopic(input: string): string | undefined {
		// Simple topic extraction - get nouns after verbs
		const match = input.match(/\b(?:am|is|are|was|were)\s+(\w+)\b/i)
		return match?.[1]
	}

	private getContextualFallback(): string {
		if (this.context.lastTopic) {
			return `Earlier you mentioned ${this.context.lastTopic}. Can you tell me more about that?`
		}
		return this.patterns[this.patterns.length - 1].responses[0]
	}

	private getRandomResponse(responses: string[]): string {
		return responses[Math.floor(Math.random() * responses.length)]
	}

	private trackResponseRepetition(response: string): void {
		const count = (this.context.repetitionCount.get(response) || 0) + 1
		this.context.repetitionCount.set(response, count)
	}

	private formatResponse(response: string, input: string): string {
		const matches = input.match(this.patterns[0].regex)
		if (!matches) {
			return response
		}

		return matches.reduce((response, match, index) => {
			return response.replace(`%${index}`, match)
		}, response)
	}
}
