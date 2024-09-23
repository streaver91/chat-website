chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTENT') {
    // Extract the page's text content
    const pageContent = document.body.innerText || document.body.textContent || '';
    console.log(pageContent.substring(0, 100)); // Log first 100 characters
    sendResponse({ content: pageContent });
  }
});
