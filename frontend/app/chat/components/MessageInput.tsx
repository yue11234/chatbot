import React from "react";
import { Button, Input } from "antd";
import { SendOutlined, StopOutlined } from "@ant-design/icons";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isStreaming: boolean;
  onCancel: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ input, setInput, handleSend, isStreaming, onCancel }) => {
  return (
    <div style={{
      flexShrink: 0,
      background: "#f7f9fc",
      padding: "12px 24px 16px",
      borderTop: "1px solid #f0f0f0",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e4e4e4",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请输入您的问题..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isStreaming) handleSend();
              }
            }}
            disabled={isStreaming}
            variant="borderless"
            style={{
              background: "transparent",
              resize: "none",
              padding: "14px 16px 6px",
              fontSize: 14,
              lineHeight: 1.6,
            }}
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 12px 10px",
          }}>
            <span style={{ fontSize: 12, color: "#bfbfbf" }}>
              Enter 发送 · Shift+Enter 换行
            </span>
            {isStreaming ? (
              <Button
                danger
                size="small"
                icon={<StopOutlined />}
                onClick={onCancel}
                style={{ borderRadius: 8 }}
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!input.trim()}
                style={{ borderRadius: 8 }}
              >
                发送
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
