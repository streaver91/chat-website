document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const clear = document.getElementById('clear');
  const send = document.getElementById('send');
  const title = document.getElementById('title');
  let conversationHistory = [];
  let currentTabId = null;

  // Get the current tab ID
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const activeTab = tabs[0];
      currentTabId = activeTab.id;
      title.innerText = 'Chat on ' + activeTab.title;
      loadConversationState(currentTabId);
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      submitMessage();
    }
  });
  input.addEventListener('input', () => {
    saveConversationState(currentTabId, conversationHistory);
  });
  send.addEventListener('click', submitMessage);

  function submitMessage() {
    const userMessage = input.value.trim();
    if (userMessage) {
      appendMessage('user', userMessage);
      conversationHistory.push({
        role: 'user', content: userMessage
      });
      input.value = '';

      // Save the updated conversation history
      saveConversationState(currentTabId, conversationHistory);

      // Send message to background script
      chrome.runtime.sendMessage(
        {
          type: 'USER_MESSAGE',
          message: userMessage,
          history: conversationHistory,
          tabId: currentTabId
        },
        (response) => {
          if (response && response.reply) {
            appendMessage('assistant', response.reply);
            conversationHistory.push({
              role: 'assistant', content: response.reply
            });
            saveConversationState(currentTabId, conversationHistory);
          }
        }
      );
    }
  }

  function appendMessage(sender, message) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message ${sender}`;
    const messageElem = document.createElement('div');
    messageElem.textContent = message;
    messageWrapper.appendChild(messageElem);
    chat.appendChild(messageWrapper);
    chat.scrollTop = chat.scrollHeight;
  }

  clear.addEventListener('click', () => {
    chat.innerHTML = '';
    conversationHistory = [];
    saveConversationState(currentTabId, conversationHistory);
  });

  function loadConversationState(tabId) {
    chrome.storage.local.get([`conversation_${tabId}`], (result) => {
      conversationState = result[`conversation_${tabId}`] || {};
      conversationHistory = conversationState.history || [];
      input.value = conversationState.userMessage || '';
      // Display the conversation history
      conversationHistory.forEach((entry) => {
        appendMessage(entry.role === 'user' ? 'user' : 'assistant', entry.content);
      });
    });
  }

  function saveConversationState(tabId, history) {
    const userMessage = input.value.trim();
    chrome.storage.local.set({
      [`conversation_${tabId}`]: {
        history: history,
        userMessage: userMessage
      }
    });
  }
});
