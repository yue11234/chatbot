import React, { useState } from 'react';
import { Avatar, Collapse, Spin } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types/chat.types';

const CodeBlock = ({ className, children }: { className?: string; children?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match) {
    return (
      <code style={{
        background: "#f0f0f0", color: "#d4380d",
        padding: "1px 6px", borderRadius: 4, fontSize: "0.85em", fontFamily: "monospace",
      }}>
        {children}
      </code>
    );
  }

  return (
    <div style={{ margin: "12px 0", borderRadius: 8, overflow: "hidden", border: "1px solid #3a3a3a" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#2d2d2d", padding: "6px 16px",
      }}>
        <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>{language}</span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "#9ca3af", background: "none", border: "none",
            cursor: "pointer", padding: "2px 6px", borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
        >
          {copied ? <CheckOutlined style={{ fontSize: 11 }} /> : <CopyOutlined style={{ fontSize: 11 }} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.875rem" }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isStreaming: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming }) => {
  const { type, content, toolCall } = message;
  const isUser = type === 'user';

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 20,
    }}>
      {/* 头像 */}
      <Avatar
        size={36}
        style={{
          flexShrink: 0,
          background: isUser ? "#1677ff" : "#f0f7ff",
          color: isUser ? "#fff" : "#1677ff",
          border: isUser ? "none" : "1px solid #bae0ff",
        }}
      >
        {isUser ? <UserOutlined /> : <RobotOutlined />}
      </Avatar>

      {/* 消息内容 */}
      <div style={{ maxWidth: "calc(100% - 52px)" }}>
        {isUser ? (
          /* 用户：蓝色气泡 */
          <div style={{
            background: "#1677ff",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: "18px 4px 18px 18px",
            fontSize: 14,
            lineHeight: 1.6,
            wordBreak: "break-word",
            display: "inline-block",
          }}>
            {content}
          </div>
        ) : (
          /* AI：无气泡，纯文本，loading 状态 */
          <div style={{ fontSize: 14, lineHeight: 1.8, color: "#262626", wordBreak: "break-word" }}>
            {isStreaming && content === '' ? (
              toolCall
                ? <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8c8c8c" }}>
                    <Spin size="small" /> 正在调用工具...
                  </div>
                : <Spin size="small" />
            ) : (
              <>
                {toolCall?.calls && (
                  <Collapse
                    size="small"
                    style={{ marginBottom: 12, background: "#fafafa", borderRadius: 8 }}
                    items={toolCall.calls.map((call: any, index: number) => ({
                      key: index,
                      label: <span style={{ fontSize: 13 }}>工具 {index + 1}：{call.name}</span>,
                      children: (
                        <div style={{ fontSize: 13, color: "#595959" }}>
                          <p style={{ marginBottom: 4 }}>输入：{JSON.stringify(call.args)}</p>
                          {call.result && <p style={{ margin: 0 }}>结果：{call.result}</p>}
                        </div>
                      ),
                    }))}
                  />
                )}
                <ReactMarkdown
                  components={{
                    code({ className, children }) {
                      return <CodeBlock className={className}>{children}</CodeBlock>;
                    },
                    p({ children }) {
                      return <p style={{ margin: "6px 0" }}>{children}</p>;
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
