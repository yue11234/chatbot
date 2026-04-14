import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageInput from "../components/MessageInput";
import { useLayoutContext } from '../../layout-context';
import { Message, ChatComponentProps } from '../types/chat.types';
import { useStreamChat } from '../hooks/useStreamChat';
import MessageBubble from '../components/MessageBubble';
import useChatActions from '../hooks/useChatActions';
import { RobotOutlined } from "@ant-design/icons";

const ChatComponent: React.FC<ChatComponentProps> = ({ threadId }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const { agentId, currentThreadId, setCurrentThreadId } = useLayoutContext();

  useEffect(() => {
    if (threadId) setCurrentThreadId(threadId);
  }, [threadId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages-" + currentThreadId, JSON.stringify(messages));
    }
  }, [messages]);

  const { handleNewChat } = useChatActions({ setMessages, setInput, isStreaming, setIsStreaming });

  useEffect(() => {
    if (!currentThreadId || currentThreadId === "") {
      handleNewChat();
      return;
    }
    const stored = localStorage.getItem("chatMessages-" + currentThreadId);
    setMessages(stored ? JSON.parse(stored) : []);
  }, [currentThreadId]);

  const { handleStream, cancelStream } = useStreamChat({
    currentThreadId, agentId, setMessages, isStreaming, setIsStreaming,
  });

  const handleSend = async () => {
    if (!input.trim()) return;
    const msgText = input;
    setInput("");
    setIsStreaming(true);
    let tid = currentThreadId;
    if (!tid) {
      tid = uuidv4();
      setCurrentThreadId(tid);
      window.dispatchEvent(new CustomEvent("add-session", { detail: { threadId: tid, msg: msgText } }));
    }
    await handleStream(msgText, tid);
  };

  return (
    // 关键：flex flex-col h-full overflow-hidden，子元素分配高度
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 消息区：flex-1 让它占满剩余空间，overflow-y-auto 只有内容多时才滚动 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        {messages.length === 0 ? (
          // 欢迎页：垂直居中，内容不可滚动
          <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "#8c8c8c",
            userSelect: "none",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 8,
            }}>
              <RobotOutlined style={{ fontSize: 32, color: "#fff" }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#262626" }}>
              论文知识库 chatbot
            </div>
            <div style={{ fontSize: 14, color: "#8c8c8c" }}>
              请输入您的问题，我会结合知识库为您解答
            </div>
          </div>
        ) : (
          // 消息列表：居中，最大宽度 760px
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区：固定在底部，不参与滚动 */}
      <MessageInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isStreaming={isStreaming}
        onCancel={cancelStream}
      />
    </div>
  );
};

export default ChatComponent;
