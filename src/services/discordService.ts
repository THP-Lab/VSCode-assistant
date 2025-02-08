import axios from 'axios';
import * as vscode from 'vscode';
import { config } from '../config';
import { MessageService } from './baseService';

export class DiscordService implements MessageService {
    private apiUrl: string;
    private discordChannelId: string;
    private discordUserId: string;
    private botName: string = 'Charlotte AI';
    private chatPanel: vscode.WebviewPanel | undefined;
    private messages: {type: 'user' | 'bot', content: string}[] = [];
    private currentFiles: { name: string, content: string, size: number }[] = [];

    constructor() {
        if (!config.apiUrl || !config.discordChannelId || !config.discordUserId) {
            throw new Error('Configuration is missing required values (apiUrl, discordChannelId, or discordUserId)');
        }
        this.apiUrl = config.apiUrl;
        this.discordChannelId = config.discordChannelId;
        this.discordUserId = config.discordUserId;
        
        if (!this.apiUrl || !this.discordChannelId) {
            throw new Error('Configuration is missing');
        }
    }

    public ensureChatPanel() {
        if (!this.chatPanel) {
            this.chatPanel = vscode.window.createWebviewPanel(
                'chatPanel',
                'Chat with Charlotte (Discord)',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this.chatPanel.onDidDispose(() => {
                this.chatPanel = undefined;
            });

            this.chatPanel.webview.onDidReceiveMessage(async message => {
                switch (message.type) {
                    case 'sendMessage':
                        try {
                            await this.sendMessage(message.content);
                            this.currentFiles = [];
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to send message: ${error.message}`);
                        }
                        break;
                    case 'getContext':
                        await this.handleGetContext();
                        break;
                    case 'clearContext':
                        this.clearContext();
                        break;
                    case 'removeFile':
                        this.currentFiles.splice(message.index, 1);
                        break;
                    case 'toggleService':
                        vscode.commands.executeCommand('cline.toggleService');
                        break;
                }
            });

            this.chatPanel.webview.html = this.getWebviewContent();
        }

        this.chatPanel.reveal(vscode.ViewColumn.Two);
        return this.chatPanel;
    }

    async sendMessage(message: string): Promise<string> {
        try {
            if (!message.trim()) {
                throw new Error('Message cannot be empty');
            }

            console.log('API URL:', this.apiUrl);
            console.log('Sending to API:', {
                message,
                filesCount: this.currentFiles.length
            });

            // Envoyer le message via l'API directe avec le contexte Discord
            const response = await axios.post(`${this.apiUrl}/aa56e063-3b77-02d7-b424-6f6bd0e5a83a/message`, {
                text: message,
                roomId: this.discordChannelId, // Utiliser l'ID du canal Discord
                userId: this.discordUserId, // Utiliser l'ID utilisateur Discord
                source: "discord", // Indiquer que le message vient de Discord
                files: this.currentFiles.map(f => ({
                    name: f.name,
                    content: f.content
                }))
            });

            console.log('Received from API:', response.data);

            this.messages.push({ type: 'user', content: message });
            if (Array.isArray(response.data) && response.data.length > 0) {
                this.addBotResponse(response.data[0].text);
                return response.data[0].text;
            } else {
                throw new Error('Unexpected API response format');
            }
        } catch (error) {
            console.error('API Error:', error.response?.data || error.message);
            throw error;
        } finally {
            if (this.chatPanel) {
                this.chatPanel.webview.html = this.getWebviewContent();
            }
            this.currentFiles = [];
        }
    }

    public addBotResponse(response: string) {
        this.messages.push({ type: 'bot', content: response });
        if (this.chatPanel) {
            this.chatPanel.webview.html = this.getWebviewContent();
        }
    }

    private async handleGetContext() {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: 'Sélectionner des fichiers',
            filters: undefined
        });

        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const fileContent = await vscode.workspace.fs.readFile(file);
                    const content = Buffer.from(fileContent).toString('utf8');
                    const name = file.fsPath.split(/[\\/]/).pop() || '';
                    const size = fileContent.length;

                    this.currentFiles.push({ name, content, size });

                    if (this.chatPanel) {
                        this.chatPanel.webview.postMessage({ 
                            type: 'contextSelected',
                            filename: name,
                            size: (size / 1024).toFixed(2)
                        });
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Erreur lors de la lecture du fichier ${name}`);
                    console.error(error);
                }
            }
        }
    }

    private getWebviewContent(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        margin: 0;
                        padding: 15px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    #chat-container {
                        margin-bottom: 15px;
                        overflow-y: auto;
                        max-height: calc(100vh - 150px);
                    }
                    .message {
                        margin: 10px 0;
                        padding: 10px;
                        border-radius: 5px;
                    }
                    .user-message {
                        background-color: var(--vscode-editor-background);
                    }
                    .bot-message {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                    }
                    #files-list {
                        margin: 10px 0;
                        padding: 5px;
                        border-radius: 4px;
                    }
                    .file-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 5px 10px;
                        margin: 5px 0;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-editor-lineHighlightBorder);
                        border-radius: 4px;
                    }
                    .file-info {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .remove-file {
                        cursor: pointer;
                        color: var(--vscode-errorForeground);
                        padding: 2px 6px;
                        border-radius: 4px;
                    }
                    .remove-file:hover {
                        background-color: var(--vscode-errorForeground);
                        color: var(--vscode-editor-background);
                    }
                    #input-container {
                        display: flex;
                        gap: 10px;
                        position: fixed;
                        bottom: 15px;
                        left: 15px;
                        right: 15px;
                        background: var(--vscode-editor-background);
                        padding: 10px;
                        border-top: 1px solid var(--vscode-editor-lineHighlightBorder);
                    }
                    #message-input {
                        flex-grow: 1;
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: 4px;
                    }
                    button {
                        padding: 8px 16px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div id="chat-container">
                    ${this.messages.map(msg => `
                        <div class="message ${msg.type === 'user' ? 'user-message' : 'bot-message'}">
                            <strong>${msg.type === 'user' ? 'Vous' : this.botName}</strong>: ${msg.content}
                        </div>
                    `).join('')}
                </div>
                <div id="files-list"></div>
                <div id="input-container">
                    <button id="toggle-service" title="Changer de service">🔄 API/Discord</button>
                    <button id="context-button" title="Ajouter des fichiers">📎 Fichiers</button>
                    <input type="text" id="message-input" placeholder="Tapez votre message...">
                    <button id="send-button">Envoyer</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const filesList = document.getElementById('files-list');
                    const contextButton = document.getElementById('context-button');
                    let selectedFiles = [];

                    document.getElementById('context-button').addEventListener('click', () => {
                        vscode.postMessage({ type: 'getContext' });
                    });

                    document.getElementById('send-button').addEventListener('click', sendMessage);
                    document.getElementById('message-input').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') sendMessage();
                    });

                    document.getElementById('toggle-service').addEventListener('click', () => {
                        vscode.postMessage({ type: 'toggleService' });
                    });

                    function sendMessage() {
                        const input = document.getElementById('message-input');
                        const message = input.value.trim();
                        if (message) {
                            vscode.postMessage({ type: 'sendMessage', content: message });
                            input.value = '';
                            selectedFiles = [];
                            filesList.innerHTML = '';
                            contextButton.textContent = '📎 Fichiers (0)';
                        }
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'contextSelected') {
                            selectedFiles.push({
                                name: message.filename,
                                size: message.size
                            });
                            updateFilesDisplay();
                        }
                    });

                    function updateFilesDisplay() {
                        filesList.innerHTML = selectedFiles.map((file, index) => \`
                            <div class="file-item">
                                <div class="file-info">
                                    <span>📎</span>
                                    <span>\${file.name} (\${file.size} KB)</span>
                                </div>
                                <span class="remove-file" onclick="removeFile(\${index})">❌</span>
                            </div>
                        \`).join('');
                        contextButton.textContent = \`📎 Fichiers (\${selectedFiles.length})\`;
                    }

                    function removeFile(index) {
                        selectedFiles.splice(index, 1);
                        updateFilesDisplay();
                        vscode.postMessage({ 
                            type: 'removeFile', 
                            index: index 
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private clearContext() {
        this.currentFiles = [];
    }
} 