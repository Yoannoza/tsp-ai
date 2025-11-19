#!/usr/bin/env tsx

/**
 * Test script to verify the chat API is working
 */

async function testChatAPI() {
  const chatApiUrl = process.env.CHAT_API_URL || 'http://localhost:3000/api/chat';
  
  console.log('🧪 Testing Chat API...');
  console.log('📡 URL:', chatApiUrl);
  
  const requestBody = {
    id: crypto.randomUUID(),
    message: {
      id: crypto.randomUUID(),
      role: 'user' as const,
      parts: [
        {
          type: 'text' as const,
          text: 'Bonjour, quel est l\'objectif principal des ESN ?',
        },
      ],
    },
    selectedChatModel: 'chat-model' as const,
    selectedVisibilityType: 'private' as const,
  };

  try {
    console.log('📤 Sending request...');
    const response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Error response:', text);
      process.exit(1);
    }

    // Read stream
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('❌ No response body');
      process.exit(1);
    }

    console.log('📖 Reading stream...\n');
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('0:')) {
          try {
            const data = JSON.parse(line.substring(2));
            if (typeof data === 'string') {
              fullResponse += data;
              process.stdout.write(data); // Stream output
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    console.log('\n\n✅ SUCCESS!');
    console.log('📝 Full response length:', fullResponse.length, 'chars');
    console.log('📝 First 200 chars:', fullResponse.substring(0, 200));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testChatAPI();
