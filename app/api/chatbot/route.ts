import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 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'
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "You are an AI assistant for ZeroCraftr. Only answer questions related to ZeroCraftr and its features, usage, or documentation. If asked about anything else, politely refuse." },
        ...messages
      ],
      stream: false
    })
  });

  const data = await response.json();
  return NextResponse.json(data);
}
