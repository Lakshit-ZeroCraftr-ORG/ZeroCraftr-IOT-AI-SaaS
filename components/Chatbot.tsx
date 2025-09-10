import React, { useState, useRef, useEffect } from 'react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');

    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: input }
        ]
      })
    });
    const data = await res.json();
    const botText = data.choices?.[0]?.message?.content || "No response";
    setMessages(msgs => [...msgs, { sender: 'bot', text: botText }]);
  };

  return (
    <div style={{ display: 'flex', height: '80vh' }}>
      <div style={{ flex: 1, padding: 24 }}>
        <h2>ZeroCraftr Chatbot</h2>
        <div ref={chatBoxRef} style={{ height: '60vh', overflowY: 'auto', border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '8px 0' }}>
              <span style={{ background: msg.sender === 'user' ? '#e0f7fa' : '#f1f8e9', padding: 8, borderRadius: 6 }}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about ZeroCraftr..."
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={sendMessage} style={{ marginLeft: 8 }}>Send</button>
        </div>
      </div>
    </div>
  );
}
