"use client";

import React from "react";
import { Layout } from "antd";
import { useState, useEffect } from "react";
import { BarsOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { LayoutContext } from "../layout-context";
import SessionListItem from "./SessionListItem";
import AgentSelector from "./AgentSelector";
import SiderComponent from "./SiderComponent";

const { Header, Content } = Layout;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState([]);

  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [agentId, setAgentId] = useState("paper-assistant");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("chatSessions") || "[]");
      setSessions(stored);
    } catch (e) {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    const addSession = (event: CustomEvent) => {
      const { threadId, msg } = event.detail;
      handleAddSession(threadId, msg);
    };
    window.addEventListener("add-session", addSession);
    return () => {
      window.removeEventListener("add-session", addSession);
    };
  }, []);

  const handleAddSession = (newThreadId: string, startMsg: string) => {
    if (!newThreadId) newThreadId = uuidv4();
    if (!startMsg) startMsg = `新对话 ${new Date().toLocaleString()}`;
    const newSession = {
      threadId: newThreadId,
      name: startMsg.substring(0, 12),
      lastUpdated: Date.now(),
    };
    setSessions((prev) => [...prev, newSession]);
    setCurrentThreadId(newThreadId);
    localStorage.setItem("chatSessions", JSON.stringify([...sessions, newSession]));
    window.history.pushState({}, "", `/chat/${newThreadId}`);
  };

  const handleDeleteSession = (delThreadId: string) => {
    const newSessions = sessions.filter((s) => s.threadId !== delThreadId);
    setSessions(newSessions);
    localStorage.setItem("chatSessions", JSON.stringify(newSessions));
    localStorage.removeItem("chatMessages-" + delThreadId);
    if (newSessions.length > 0) {
      const last = [...newSessions].reverse()[0];
      setCurrentThreadId(last.threadId);
      window.history.pushState({}, "", `/chat/${last.threadId}`);
    } else {
      setCurrentThreadId(null);
      window.history.pushState({}, "", "/chat");
    }
  };

  const handlerNewChat = () => {
    setCurrentThreadId(null);
    window.history.pushState({}, "", "/chat");
  };

  const selectAgent = (value: string) => {
    setAgentId(value);
    handlerNewChat();
  };

  const [items, setItems] = useState([]);
  useEffect(() => {
    const reversedSessions = [...sessions].reverse();
    setItems(
      reversedSessions.map((session) => ({
        key: session.threadId,
        label: <SessionListItem session={session} onDelete={handleDeleteSession} />,
      }))
    );
  }, [sessions]);

  if (!mounted) return null;

  return (
    <LayoutContext.Provider value={{ agentId, setAgentId, currentThreadId, setCurrentThreadId }}>
      <Layout style={{ height: "100vh", overflow: "hidden" }}>
        <SiderComponent
          collapsed={collapsed}
          onCollapse={setCollapsed}
          sessions={sessions}
          handleDeleteSession={handleDeleteSession}
          handlerNewChat={handlerNewChat}
          items={items}
          onSelectSession={(key) => {
            setCurrentThreadId(key);
            window.history.pushState({}, "", `/chat/${key}`);
          }}
        />
        <Layout style={{ overflow: "hidden" }}>
          {/* Header */}
          <Header
            style={{
              background: "#fff",
              padding: "0 20px",
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #f0f0f0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              height: 56,
              lineHeight: "56px",
              flexShrink: 0,
            }}
          >
            <BarsOutlined
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18, cursor: "pointer", color: "#595959" }}
            />
            <div style={{ display: "flex", alignItems: "center", marginLeft: 24 }}>
              <span style={{ fontSize: 14, color: "#8c8c8c", marginRight: 8 }}>对话模式：</span>
              <AgentSelector value={agentId} onChange={selectAgent} />
            </div>
          </Header>
          {/* Content fills remaining height, no scroll on this level */}
          <Content style={{ flex: 1, overflow: "hidden", background: "#f7f9fc" }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </LayoutContext.Provider>
  );
}
