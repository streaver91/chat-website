// Store your API key securely (do not hard-code it)
let apiKey = null;

// Retrieve the API key from storage
chrome.storage.local.get(['openai_api_key'], (result) => {
  apiKey = result.openai_api_key || null;
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'USER_MESSAGE') {
    handleUserMessage(request.message, request.history, sendResponse, request.tabId);
    return true; // Keep the message channel open for async response
  }
});

// Listen for tab removal to clean up conversation history
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Remove the conversation history for the closed tab
  chrome.storage.local.remove(`conversation_${tabId}`);
});

// Handle user message
async function handleUserMessage(message, history, sendResponse, tabId) {
  try {
    // Get page content from content script
    const pageContent = await getPageContent(tabId);
    console.log('Page Content:', pageContent.substring(0, 100)); // Log first 100 chars

    // Limit the page content to avoid exceeding token limits
    const maxContentLength = 50000;
    const limitedContent = pageContent.substring(0, maxContentLength);

    // Prepare the messages array for GPT
    const messages = [
      {
        role: 'system',
        content: `You are an assistant that answers questions based on the content of the webpage provided. Use the provided webpage content to answer the user's questions as accurately as possible. If the answer is not in the content, say that you don't have that information.`,
      },
      {
        role: 'user',
        content: `Webpage Content: ${limitedContent}`,
      },
      ...history,
    ];

    console.log('Messages Array:', JSON.stringify(messages, null, 2));

    // Call the GPT API
    const reply = await callGPTAPI(messages);

    sendResponse({ reply });
  } catch (error) {
    console.error('Error in handleUserMessage:', error);
    sendResponse({ reply: `An error occurred: ${error.message}` });
  }
}

// Function to get page content
function getPageContent(tabId) {
  return new Promise((resolve, reject) => {
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' }, (response) => {
        if (response?.content) {
          resolve(response.content);
        } else {
          console.error('No content received from content script.');
          resolve('');
        }
      });
    } else {
      console.error('No tab ID provided.');
      resolve('');
    }
  });
}

// Function to call GPT-4 API
async function callGPTAPI(messages) {
  if (!apiKey) {
    throw new Error('API key not set.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    })
  });

  const data = await response.json();
  console.log('API Response Data:', data);

  if (!response.ok) {
    // Handle HTTP errors
    console.error('API Error:', data);
    throw new Error(`API error: ${data.error.message}`);
  }

  if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    console.error('No choices returned in API response:', data);
    throw new Error('No choices returned from API.');
  }

  return data.choices[0].message.content.trim();
}
