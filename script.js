const GEMINI_API_KEY = '  ';

const tosdevBio = ` your info`;

document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const clearChatButton = document.getElementById('clear-chat');
    let isWaitingForResponse = false;
    
    // Initialize conversation history with your Instagram image
    let conversationHistory = JSON.parse(localStorage.getItem('tosdevChatHistory')) || [
        {
            role: "bot",
            content: "",
            timestamp: new Date().toISOString()
        }
    ];

    // Clear chat function
    function clearChat() {
        if (confirm("Are you sure you want to clear the chat history?")) {
            conversationHistory = [
                {
                    role: "bot",
                    content: " ",
                    timestamp: new Date().toISOString()
                }
            ];
            localStorage.setItem('tosdevChatHistory', JSON.stringify(conversationHistory));
            loadConversationHistory();
        }
    }

    // Load conversation history
    function loadConversationHistory() {
        chatContainer.innerHTML = '';
        conversationHistory.forEach(msg => {
            if (msg.role === "bot") {
                addMessageToUI(msg.content, false, msg.timestamp);
            } else {
                addMessageToUI(msg.content, true, msg.timestamp);
            }
        });
    }

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatResponse(text) {
        // Escape HTML first
        let safeText = escapeHtml(text);
        
        // First extract and protect images
        const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const imgPlaceholder = '___IMG_PLACEHOLDER___';
        const images = [];
        let imgCounter = 0;
        
        safeText = safeText.replace(imgRegex, function(match, alt, src) {
            // Convert Instagram URL to embeddable format
            let embedSrc = src;
            if (src.includes('instagram.com/p/')) {
                const postId = src.split('/p/')[1].split('/')[0];
                embedSrc = `https://www.instagram.com/p/${postId}/embed/`;
            }
            images.push({alt, src: embedSrc});
            return `${imgPlaceholder}${imgCounter++}`;
        });
        
        // Then extract and protect URLs
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        const urlPlaceholder = '___URL_PLACEHOLDER___';
        const urls = [];
        let urlCounter = 0;
        
        safeText = safeText.replace(urlRegex, function(match) {
            // Skip if this is already an image URL
            if (match.includes('![')) return match;
            
            // Clean the URL by removing any trailing punctuation
            let cleanUrl = match.replace(/[.,;:!?)]+$/, '');
            // Ensure it starts with http if it doesn't
            if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl;
            }
            urls.push(cleanUrl);
            return `${urlPlaceholder}${urlCounter++}`;
        });
        
        // Now process emojis
        const emojiMap = {
            ':)': '😊', ':(': '😞', ':D': '😃', ':P': '😛',
            ';)': '😉', ':O': '😮', ':*': '😘', ':|': '😐',
            ':/': '😕', '<3': '❤️', ':thumbsup:': '👍',
            ':thumbsdown:': '👎', ':ok_hand:': '👌',
            ':clap:': '👏', ':wave:': '👋', ':robot:': '🤖',
            ':computer:': '💻', ':fire:': '🔥', ':rocket:': '🚀',
            ':lightbulb:': '💡', ':book:': '📚', ':graduation_cap:': '🎓'
        };
        
        for (const [code, emoji] of Object.entries(emojiMap)) {
            const regex = new RegExp(escapeRegExp(code), 'g');
            safeText = safeText.replace(regex, `<span class="emoji">${emoji}</span>`);
        }
        
        // Restore images first
        for (let i = 0; i < images.length; i++) {
            const {alt, src} = images[i];
            safeText = safeText.replace(
                `${imgPlaceholder}${i}`, 
                `<img src="${src}" alt="${alt}"><div class="image-caption">${alt}</div>`
            );
        }
        
        // Then restore URLs
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const displayUrl = url.replace(/^https?:\/\/(www\.)?/, '');
            safeText = safeText.replace(
                `${urlPlaceholder}${i}`, 
                `<a href="${url}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`
            );
        }
        
        // Convert code blocks with copy functionality
        safeText = safeText.replace(/```(\w*)([\s\S]*?)```/g, function(match, lang, code) {
            const language = lang ? lang : 'code';
            return `
            <div class="code-container">
                <div class="code-header">
                    <span>${language}</span>
                    <button class="copy-btn">
                        <i class="far fa-copy"></i> Copy
                    </button>
                </div>
                <div class="code-block">
                    <pre>${code.trim()}</pre>
                </div>
            </div>
            `;
        });
        
        // Convert other formatting
        safeText = safeText
            .replace(/\*\*(.*?)\*\*/g, '<span class="bold-text">$1</span>')
            .replace(/\*(.*?)\*/g, '<span class="italic-text">$1</span>')
            .replace(/__(.*?)__/g, '<span class="underline-text">$1</span>')
            .replace(/~~(.*?)~~/g, '<span class="strikethrough-text">$1</span>')
            .replace(/^\s*[\d]+\.\s+(.*$)/gm, '<li>$1</li>')
            .replace(/^\s*[-*]\s+(.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
        
        if (!safeText.includes('<pre>')) {
            safeText = safeText.replace(/\n/g, '<br>');
        }
        
        return safeText;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function addMessageToUI(text, isUser, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        if (isUser) {
            messageDiv.innerHTML = `
                <div class="message-content user-message">
                    ${text}
                    <div class="timestamp">${formatTimestamp(timestamp)}</div>
                </div>
            `;
        } else {
            const formattedText = formatResponse(text);
            messageDiv.innerHTML = `
                <div class="message-with-avatar">
                    <div class="bot-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div>
                        <div class="message-content bot-message">
                            ${formattedText}
                        </div>
                        <div class="timestamp">${formatTimestamp(timestamp)}</div>
                    </div>
                </div>
            `;
        }
        
        chatContainer.appendChild(messageDiv);
        
        // Add copy functionality to new code blocks
        messageDiv.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const codeBlock = this.closest('.code-container').querySelector('pre');
                const code = codeBlock.textContent;
                
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                });
            });
        });
        
        // Lazy load images
        messageDiv.querySelectorAll('img').forEach(img => {
            img.loading = 'lazy';
            // Handle Instagram embeds
            if (img.src.includes('instagram.com')) {
                const iframe = document.createElement('iframe');
                iframe.src = img.src;
                iframe.width = '100%';
                iframe.height = '480';
                iframe.frameBorder = '0';
                iframe.scrolling = 'no';
                iframe.allowTransparency = 'true';
                img.replaceWith(iframe);
            }
        });
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function addMessage(text, isUser) {
        const timestamp = new Date().toISOString();
        conversationHistory.push({
            role: isUser ? "user" : "bot",
            content: text,
            timestamp: timestamp
        });
        
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
        
        localStorage.setItem('tosdevChatHistory', JSON.stringify(conversationHistory));
        addMessageToUI(text, isUser, timestamp);
    }

    function showTypingIndicator() {
        if (document.getElementById('typing-indicator')) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message');
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-with-avatar">
                <div class="bot-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="typing-indicator">
                    <span>Typing</span>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    function checkIfAboutTosdev(question) {
        const lowerQuestion = question.toLowerCase();
        const tosdevKeywords = [
            'tosdev', 'tofunmi', 'olawuyi', 'samuel', 
            'you', 'your', 'yourself', 'about you',
            'tell me about', 'who are', 'what are',
            'project', 'portfolio', 'website', 'build',
            'experience', 'work', 'app', 'application',
            'blog', 'e-learning', 'voting', 'system'
        ];
        return tosdevKeywords.some(keyword => lowerQuestion.includes(keyword));
    }

    async function getTosdevInfoResponse(question) {
        try {
            // Create context from recent conversation history
            const context = conversationHistory
                .slice(-5)
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Conversation context:\n${context}\n\nYou are an assistant for . 
                                Use this information to answer questions about him and his work.
                                Always mention his portfolio is available at:
                                You can include images using markdown format:
                                For Instagram posts, use:
                                Format your responses with:
                                - **Bold text** for important points
                                - *Italic text* for emphasis
                                - Proper lists with numbers or bullets
                                - Emojis where appropriate 😊
                                - Clean URLs that work properly (just show the URL, it will be auto-linked)
                                - Images using ![alt text](image-url)
                                - Code blocks wrapped in triple backticks with language specification
                                
                                BIOGRAPHY:
                                ${tosdevBio}
                                
                                QUESTION: ${question}
                                
                                Respond concisely in 1-5 sentences. If unsure, say:
                                "I don't have that specific information,"
                                `
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   "I don't have that specific information. ";

        } catch (error) {
            console.error("API Error:", error);
            return "I'm having trouble accessing that information.";
        }
    }

    async function getGeminiResponse(prompt) {
        try {
            // Create context from recent conversation history
            const context = conversationHistory
                .slice(-5)
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Conversation context:\n${context}\n\nYou are an AI assistant created by . 
                                When providing responses:
                                1. Format text properly using **bold**, *italic* and lists
                                2. Use emojis where appropriate 😊
                                3. For links, just show the full URL (it will be auto-linked)
                                4. For images, use markdown format: ![description](image-url)
                                5. For Instagram posts, use: ![My Instagram Post]()
                                6. For code blocks, use triple backticks with language specification
                                7. Use proper numbered or bulleted lists without showing special characters
                                8. Keep code blocks concise and well-formatted
                                
                                Answer this question: ${prompt}`
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   "I'm not sure how to answer that. Could you try asking differently?";

        } catch (error) {
            console.error("API Error:", error);
            return "I'm having trouble accessing my knowledge right now. Please try again later.";
        }
    }

    async function handleUserInput() {
        if (isWaitingForResponse) return;
        
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, true);
        userInput.value = '';
        isWaitingForResponse = true;
        userInput.disabled = true;
        sendButton.disabled = true;
        
        try {
            showTypingIndicator();
            
            if (checkIfAboutTosdev(text)) {
                const response = await getTosdevInfoResponse(text);
                addMessage(response, false);
            } else {
                const response = await getGeminiResponse(text);
                addMessage(response, false);
            }
            
        } catch (error) {
            console.error("Error handling user input:", error);
            addMessage("Sorry, I encountered an error. Please try again.", false);
        } finally {
            hideTypingIndicator();
            isWaitingForResponse = false;
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    // Initial load
    loadConversationHistory();

    // Event listeners
    sendButton.addEventListener('click', handleUserInput);
    clearChatButton.addEventListener('click', clearChat);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    userInput.focus();
});
