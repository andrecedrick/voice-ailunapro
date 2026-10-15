export const HEADLESS_CHAT_EXAMPLE = `let chatState = 'idle';

function withAiLunaProWidget(callback) {
  if (window.AiLunaProWidget) {
    callback(window.AiLunaProWidget);
    return;
  }

  const script = document.getElementById('ailunapro-widget') || document.getElementById('dograh-widget');
  if (!script) {
    console.error('Voice AiLunaPro embed script not found');
    return;
  }

  script.addEventListener('load', () => {
    if (window.AiLunaProWidget) callback(window.AiLunaProWidget);
  }, { once: true });
}

withAiLunaProWidget((widget) => {
  widget.onChatStateChange((state) => {
    chatState = state; // idle | starting | ready | waiting | ended | expired | error
  });

  widget.onMessage((text, turn) => {
    appendAgentBubble(text); // render however you want
  });

  document.getElementById('open-chat').addEventListener('click', () => {
    widget.startChat();
  });

  document.getElementById('send-btn').addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    appendVisitorBubble(input.value);
    const transcript = await widget.sendMessage(input.value);
    if (transcript !== null) input.value = '';
  });

  document.getElementById('end-chat')?.addEventListener('click', async () => {
    await widget.endChat();
  });
});`;
