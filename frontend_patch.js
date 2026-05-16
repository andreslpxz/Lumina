const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/ChatPanel.js', 'utf8');

// Update ToolCallBlock component
const oldToolCallBlock = `function ToolCallBlock({ toolCall, result, isRunning }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'unknown';`;

const newToolCallBlock = `function ToolCallBlock({ toolCall, result, isRunning, onAccept, onReject, isPendingApproval }) {
  const [expanded, setExpanded] = useState(true); // Default to true for local execution visibility
  const name = toolCall?.name || 'unknown';`;

content = content.replace(oldToolCallBlock, newToolCallBlock);

// Update ToolCallBlock UI to include Accept/Reject buttons
const oldButtonsEnd = `{expanded ? <ChevronDown size={13} className="text-zinc-500" /> : <ChevronRight size={13} className="text-zinc-500" />}
      </button>`;

const newButtonsEnd = `{expanded ? <ChevronDown size={13} className="text-zinc-500" /> : <ChevronRight size={13} className="text-zinc-500" />}
      </button>
      {isPendingApproval && (
        <div className="px-3 py-2 bg-amber-900/10 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
            <AlertCircle size={10} /> Approval required for local execution
          </span>
          <div className="flex gap-2">
            <button
              onClick={onReject}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onAccept}
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      )}`;

content = content.replace(oldButtonsEnd, newButtonsEnd);

// Update the render call for ToolCallBlock in renderMessage
const oldRenderCall = `<ToolCallBlock key={i} toolCall={tc} result={tc.result} isRunning={tc.isRunning} />`;
const newRenderCall = `<ToolCallBlock
                key={i}
                toolCall={tc}
                result={tc.result}
                isRunning={tc.isRunning}
                isPendingApproval={!tc.result && !tc.isRunning}
                onAccept={() => handleExecuteTool(msg.id, tc)}
                onReject={() => handleRejectTool(msg.id, tc)}
              />`;

content = content.replace(oldRenderCall, newRenderCall);

// Add handleExecuteTool and handleRejectTool functions to ChatPanel
const insertionPoint = 'const handleSubmit = async (e) => {';
const newFunctions = `
  const handleExecuteTool = async (messageId, toolCall) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const updatedCalls = (m.toolCalls || []).map(tc =>
        tc.name === toolCall.name && JSON.stringify(tc.arguments) === JSON.stringify(toolCall.arguments)
          ? { ...tc, isRunning: true }
          : tc
      );
      return { ...m, toolCalls: updatedCalls };
    }));

    try {
      const response = await fetch(\`\${API}/api/execute_tool\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ chat_id: chatId, tool_call: toolCall }),
      });
      const data = await response.json();

      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const updatedCalls = (m.toolCalls || []).map(tc =>
          tc.name === toolCall.name && JSON.stringify(tc.arguments) === JSON.stringify(toolCall.arguments)
            ? { ...tc, isRunning: false, result: data.result }
            : tc
        );
        return { ...m, toolCalls: updatedCalls };
      }));

      // Automatically send result back to AI
      const resultMessage = \`Tool Result (\${toolCall.name}): \${JSON.stringify(data.result).substring(0, 2000)}\`;
      triggerChatWithContent(resultMessage);

    } catch (err) {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const updatedCalls = (m.toolCalls || []).map(tc =>
          tc.name === toolCall.name && JSON.stringify(tc.arguments) === JSON.stringify(toolCall.arguments)
            ? { ...tc, isRunning: false, result: { error: err.message } }
            : tc
        );
        return { ...m, toolCalls: updatedCalls };
      }));
    }
  };

  const handleRejectTool = (messageId, toolCall) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const updatedCalls = (m.toolCalls || []).map(tc =>
        tc.name === toolCall.name && JSON.stringify(tc.arguments) === JSON.stringify(toolCall.arguments)
          ? { ...tc, result: { error: 'Rejected by user' } }
          : tc
      );
      return { ...m, toolCalls: updatedCalls };
    }));
    triggerChatWithContent(\`User rejected the execution of \${toolCall.name}\`);
  };

  const triggerChatWithContent = async (content) => {
    setIsLoading(true);
    const assistantId = Date.now() + 2; // Unique ID
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolCalls: [],
      toolResults: [],
    }]);

    try {
      const response = await fetch(\`\${API}/api/chat\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content: content, chat_id: chatId }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let parsedData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          let lineContent = line.startsWith('data: ') ? line.slice(6) : line;
          try {
            const data = JSON.parse(lineContent);
            switch (data.type) {
              case 'token':
                fullContent += data.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                ));
                break;
              case 'parsed':
                parsedData = data.data;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? {
                    ...m,
                    parsedData: parsedData,
                    content: fullContent,
                    toolCalls: parsedData.tool_calls || []
                  } : m
                ));
                break;
              case 'error':
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: \`Error: \${data.content}\`, isStreaming: false } : m
                ));
                break;
              case 'done':
                break;
            }
          } catch {}
        }
      }
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));
    } catch (err) {
       console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

`;

content = content.replace(insertionPoint, newFunctions + insertionPoint);

// Also need to handle 'parsed' data in streaming to populate toolCalls in handleSubmit
const oldParsedCase = `              case 'parsed':
                parsedData = data.data;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, parsedData: parsedData, content: fullContent } : m
                ));
                break;`;

const newParsedCase = `              case 'parsed':
                parsedData = data.data;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? {
                    ...m,
                    parsedData: parsedData,
                    content: fullContent,
                    toolCalls: parsedData.tool_calls || []
                  } : m
                ));
                break;`;

content = content.replace(oldParsedCase, newParsedCase);

fs.writeFileSync('frontend/src/components/ChatPanel.js', content);
