<h1 align="center"> CHATBOT </h1>
<p align="center">
  <a href="./README.md" target="_Self">English</a> |
  <strong style="background-color: green;">中文</strong>
</p>

**CHATBOT** 是一个基于 LangGraph + FastAPI + Next.js + ChromaDB 构建的 AI 智能体全栈聊天应用模板。

它可以作为快速搭建 AI 智能体聊天应用的脚手架，支持 RAG（检索增强生成）知识库问答、多智能体协作、流式输出等能力。

## 项目演示
![项目演示](https://github.com/user-attachments/assets/c81856de-8d84-4484-a21c-0117aae64404)

多智能体聊天：



---

## 特性

1. 基于 **LangGraph** 框架搭建智能体，支持自定义行为逻辑编排（StateGraph）
2. 支持 **RAG 知识库问答**，使用 ChromaDB 向量存储 + BM25 混合检索
3. 支持智能体**工具调用**（Tool Calling）
4. 后端基于 **FastAPI** 实现，全异步调用，支持 SSE 流式输出
5. 前端基于 **Next.js 14 + Ant Design 5** 实现，支持 Markdown 渲染和代码高亮
6. 支持 **多智能体协作**（Supervisor 模式）
7. 支持**多种大模型**：OpenAI（GPT-4o）、DeepSeek、阿里通义千问（Qwen）、Ollama 本地模型
8. 支持通过**线程（Thread）** 管理多轮对话历史
9. 聊天记录保存在本地浏览器缓存中

---

## 目录结构

```
chatbot/
├── backend/          # Python FastAPI 后端服务
│   ├── app/
│   │   ├── ai/       # AI 核心：LLM 工厂、智能体、RAG
│   │   ├── api/      # API 路由与数据结构定义
│   │   ├── db/       # 数据库模型与连接配置
│   │   ├── core/     # 全局配置（config.py）
│   │   ├── utils/    # 工具函数
│   │   └── main.py   # FastAPI 应用入口
│   ├── resource/     # ChromaDB 向量库持久化存储
│   ├── .env          # 环境变量配置文件
│   └── pyproject.toml
│
├── frontend/         # Next.js React TypeScript 前端
│   ├── app/
│   │   ├── chat/     # 聊天页面与组件
│   │   └── components/ # 侧边栏、智能体选择器等公共组件
│   ├── package.json
│   └── tailwind.config.ts
│
├── README.md
└── README_zh.md
```

---

## 快速开始

### 后端服务

**第一步：配置环境变量**

将 `.env.example` 重命名为 `.env`，并按需填写：

```properties
# 数据库配置（默认使用 SQLite，也可切换为 MySQL）
DATABASE_URL=sqlite+aiosqlite:///resource/database.db
# DATABASE_URL=mysql+aiomysql://root:root@localhost/ai-chatkit

# 应用配置
DEBUG=True
APP_NAME=AI ChatKit

# 选择一个大模型 API（三选一）

# OpenAI
OPENAI_API_KEY=
OPENAI_BASE_URL=
DEFAULT_MODEL=gpt-4o-mini

# 阿里通义千问（推荐国内使用）
# DASHSCOPE_API_KEY=
# DEFAULT_MODEL=qwen-plus

# DeepSeek
# DEEPSEEK_API_KEY=
# DEFAULT_MODEL=deepseek-chat

# Embedding 模型（需要本地 Ollama 部署，支持中英双语）
EMBEDDING_MODEL=bge-m3

# ChromaDB 向量库本地存储路径
CHROMA_PATH=resource/chroma_db
```

**第二步：安装依赖并启动服务**

```sh
# 安装 uv（Python 依赖管理工具）
pip install uv

# 进入后端目录（将 ${workdir} 替换为你的实际路径）
cd ${workdir}/backend

# 安装依赖
uv sync --frozen

# 激活虚拟环境（Linux/macOS）
source .venv/bin/activate

# 激活虚拟环境（Windows）
# .venv/Scripts/activate

# 启动后端服务
python app/run_server.py
```

后端默认运行在 `http://localhost:8000`

---

### RAG 知识库部署

本项目使用本地 Ollama 部署的 `bge-m3` 作为 Embedding 模型（支持中英双语）。使用 RAG 功能前，需要先在本地部署 Ollama 并拉取 bge-m3：

```sh
# 安装 Ollama 后拉取 bge-m3
ollama pull bge-m3
```

参考：https://ollama.com/library/bge-m3

---

### 前端应用（开发模式）

```sh
# 进入前端目录
cd ${workdir}/frontend

# 安装 pnpm（如未安装）
npm install -g pnpm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 前端应用（生产模式）

```sh
# 构建
npm run build

# 启动生产服务器
npm start
```

启动成功后访问：http://localhost:3000/

> 本项目使用 Next.js App Router + Ant Design 5。为避免首次加载样式错位（FOUC），已在 `frontend/app/AntdRegistry.tsx` 中配置 `@ant-design/cssinjs` 的 `StyleProvider`，并在 `frontend/app/layout.tsx` 中包裹全局布局。

---

## 内置智能体

本项目自带以下智能体，可在前端通过下拉框切换：

### 1. paper-assistant（论文助手）

基于 LangGraph StateGraph 构建，支持 RAG 检索。主要用于演示知识库问答，能够回答关于以下主题的问题：

- 基于 GAN 的图像翻译
- 扩散模型（Diffusion Models）
- 红外与可见光图像转换
- 深度学习图像合成与超分辨率

知识库文档通过 `backend/app/ai/rag/ingestPdfs.py` 写入 ChromaDB，检索时采用 BM25 + 向量的混合检索策略。

参考：[backend/app/ai/agent/paper_assistant.py](backend/app/ai/agent/paper_assistant.py)

---

### 2. multi-agent-supervisor（多智能体协作）

基于 LangGraph Supervisor 模式构建，包含三个专属子智能体：

| 子智能体 | 职责 |
|---|---|
| `math_agent` | 数学计算与推理 |
| `code_agent` | 代码生成与调试 |
| `general_agent` | 通用问答 |

Supervisor 负责根据用户问题自动路由到对应子智能体处理，处理完毕后汇总返回结果。

参考：[backend/app/ai/agent/multi_agent.py](backend/app/ai/agent/multi_agent.py)

---

## 扩展开发

如需添加自定义智能体：

1. 在 `backend/app/ai/agent/` 下新建智能体文件，使用 LangGraph 编写 StateGraph 逻辑
2. 在 `backend/app/ai/agent/agents.py` 的 `DEFAULT_AGENTS` 注册表中添加新智能体
3. 前端无需改动，智能体列表会通过 API 自动同步

---

## 技术栈

| 层次 | 技术 |
|---|---|
| 后端框架 | FastAPI + Uvicorn |
| 智能体编排 | LangGraph 0.5+ |
| LLM 集成 | LangChain（OpenAI / DeepSeek / Qwen / Ollama）|
| 向量存储 | ChromaDB |
| 混合检索 | BM25 + 向量（EnsembleRetriever）|
| 数据库 | SQLAlchemy async（SQLite / MySQL）|
| 前端框架 | Next.js 14 + React 18 |
| UI 组件库 | Ant Design 5 |
| 样式 | Tailwind CSS |
| 流式传输 | SSE（Server-Sent Events）|
