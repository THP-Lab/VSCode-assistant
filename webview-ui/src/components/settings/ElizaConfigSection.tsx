import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { memo, useState } from "react"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { vscode } from "../../utils/vscode"

const DISCORD_ID_REGEX = /^\d{17,19}$/ // Discord IDs are 17-19 digits long

const ElizaConfigSection = () => {
    const { apiConfiguration } = useExtensionState()
    const [error, setError] = useState<string>()

    const validateDiscordId = (id: string): boolean => {
        if (!id) return true // Empty is valid (optional field)
        return DISCORD_ID_REGEX.test(id)
    }

    const handleDiscordIdChange = (e: Event) => {
        // VSCodeTextField uses native Event
        const target = e.target as HTMLInputElement
        const discordId = target.value

        // Validate the ID
        if (!validateDiscordId(discordId)) {
            setError("Discord ID must be 17-19 digits long")
            return
        }
        setError(undefined)

        vscode.postMessage({
            type: "apiConfiguration",
            apiConfiguration: {
                ...apiConfiguration,
                elizaOptions: {
                    ...apiConfiguration?.elizaOptions,
                    discordUserId: discordId
                }
            }
        })
    }

    const handleBaseUrlChange = (e: Event) => {
        const target = e.target as HTMLInputElement
        const baseUrl = target.value

        vscode.postMessage({
            type: "apiConfiguration",
            apiConfiguration: {
                ...apiConfiguration,
                elizaOptions: {
                    ...apiConfiguration?.elizaOptions,
                    baseUrl: baseUrl
                }
            }
        })
    }

    return (
        <div style={{ padding: "10px 0" }}>
            <h3>Eliza Configuration</h3>
            <div style={{ marginBottom: "10px" }}>
                <VSCodeTextField
                    placeholder="Enter your Discord User ID"
                    value={apiConfiguration?.elizaOptions?.discordUserId || ""}
                    onchange={handleDiscordIdChange}
                >
                    Discord User ID
                </VSCodeTextField>
                {error ? (
                    <div style={{
                        fontSize: "12px",
                        color: "var(--vscode-errorForeground)",
                        marginTop: "4px"
                    }}>
                        {error}
                    </div>
                ) : (
                    <div style={{
                        fontSize: "12px",
                        color: "var(--vscode-descriptionForeground)",
                        marginTop: "4px"
                    }}>
                        This allows Eliza to maintain conversation context across VS Code and Discord.
                        <br />
                        <a
                            href="https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-"
                            style={{ color: "var(--vscode-textLink-foreground)" }}
                        >
                            How to find your Discord ID
                        </a>
                    </div>
                )}

                <VSCodeTextField
                    style={{ marginTop: "10px", width: "100%" }}
                    placeholder="Default: http://localhost:3000"
                    value={apiConfiguration?.elizaOptions?.baseUrl || ""}
                    onchange={handleBaseUrlChange}
                    type="url"
                >
                    Base URL (optional)
                </VSCodeTextField>
                <div style={{
                    fontSize: "12px",
                    color: "var(--vscode-descriptionForeground)",
                    marginTop: "4px"
                }}>
                    The URL where your Eliza service is running. Leave empty to use the default endpoint.
                </div>
            </div>
        </div>
    )
}

export default memo(ElizaConfigSection) 