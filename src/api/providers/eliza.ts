import { ApiHandler } from "../"
import { ApiHandlerOptions, ModelInfo } from "../../shared/api"
import { ApiStream } from "../transform/stream"
import { Eliza, ElizaMessage } from "../../shared/eliza"
import { json } from "stream/consumers"

export class ElizaHandler implements ApiHandler<ElizaMessage> {
	private options: ApiHandlerOptions
	private baseUrl: string

	constructor(options: ApiHandlerOptions) {
		this.options = options
		// Use the configured baseUrl or default to localhost:3000
		this.baseUrl = options.elizaOptions?.baseUrl || "http://localhost:3000"
	}

	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			// Validate input
			if (!Array.isArray(messages) || messages.length === 0) {
				throw new Error("No messages provided")
			}

			const lastMessage = messages[messages.length - 1]
			if (!lastMessage || lastMessage.role !== "user") {
				throw new Error("Last message must be from user")
			}

			const userInput = lastMessage.content
			// if (typeof userInput !== "string" || userInput.trim().length === 0) {
			// 	throw new Error("User message cannot be empty")
			// }

			// Create form data for the request
			const formData = new FormData()
			// formData.append("text", userInput.trim())
			const mdJsonStart = "```json"
			const mdJsonEnd = "```"
			formData.append(
				"text",
				`${mdJsonStart}
				${JSON.stringify(userInput)}
				${mdJsonEnd}
			`,
			)

			// Add Discord user ID if available
			if (this.options.elizaOptions?.discordUserId) {
				// formData.append("user", this.options.elizaOptions.discordUserId)
				// formData.append("user", "209855484637741066")
				formData.append("user", "2d1061be-96b7-0e2b-bb5a-2cc9bc40b50c")
			}
			formData.append("userId", "2d1061be-96b7-0e2b-bb5a-2cc9bc40b50c")

			const agentsResponse = await fetch(`${this.baseUrl}/agents`, {
				method: "GET",
			})

			const agents = await agentsResponse.json()
			// Send request to Eliza server
			// Note: Using a hardcoded agent ID for now - you may want to make this configurable

			const response = await fetch(`${this.baseUrl}/${agents.agents[0].id}/message`, {
				method: "POST",
				body: formData,
			})

			if (!response.ok) {
				throw new Error(`Eliza server error: ${response.statusText}`)
			}

			const data = await response.json()

			// Stream the response
			if (data && Array.isArray(data) && data.length > 0) {
				const elizaResponse = data[0].text
				const words = elizaResponse.split(" ")

				for (const word of words) {
					yield {
						type: "text",
						text: word + " ",
					}
					// Add a small delay between words
					await new Promise((resolve) => setTimeout(resolve, 100))
				}
			}

			// Yield usage stats
			yield {
				type: "usage",
				inputTokens: 0,
				outputTokens: 0,
			}
		} catch (error) {
			console.error("ElizaHandler error:", error)
			throw new Error("Failed to process message: " + (error instanceof Error ? error.message : "Unknown error"))
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: "eliza",
			info: {
				contextWindow: 1,
				maxTokens: 100,
				supportsImages: false,
				supportsPromptCache: false,
				inputPrice: 0,
				outputPrice: 0,
				description: "Eliza - Classic rule-based chatbot",
			},
		}
	}
}
