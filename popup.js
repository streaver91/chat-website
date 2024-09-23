document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const clear = document.getElementById('clear');
  const send = document.getElementById('send');
  let conversationHistory = [];

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      submitMessage();
    }
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

      // Send message to background script
      chrome.runtime.sendMessage(
        {
          type: 'USER_MESSAGE',
          message: userMessage,
          history: conversationHistory
        },
        (response) => {
          if (response && response.reply) {
            appendMessage('assistant', response.reply);
            conversationHistory.push({
              role: 'assistant', content: [
                { type: 'text', text: response.reply }
              ]
            });
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

  appendMessage('user', 'Hello! Ask me a question.');
  appendMessage('assistant', 'You are an assistant that answers questions based on the content of the webpage provided. Use the provided webpage content to answer the user\'s questions as accurately as possible. If the answer is not in the content, say that you don\'t have that information.');

  clear.addEventListener('click', () => {
    chat.innerHTML = '';
    conversationHistory = [];
  });
});
