from typing import Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig, RunnableLambda, RunnableSerializable
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

from ai.llm import get_model, settings
from ai.tools.paper_tools import search_papers

import logging
logger = logging.getLogger(__name__)


class AgentState(MessagesState):
    """State of the agent."""


tools = [search_papers]

instructions = """You are an academic paper assistant. You have access to a knowledge base \
containing research papers on topics including:
- GAN (Generative Adversarial Network) based image translation
- Diffusion model based image translation
- Infrared and visible light image conversion
- Deep learning methods for image synthesis and super-resolution

When the user asks a question related to these topics, always use the search_papers tool \
to retrieve relevant content from the knowledge base before answering.
Cite the source paper and page number when referencing specific content.
If the knowledge base does not contain relevant information, say so honestly.
Answer in the same language the user uses."""


def wrap_model(model: BaseChatModel) -> RunnableSerializable[AgentState, AIMessage]:
    model = model.bind_tools(tools)
    preprocessor = RunnableLambda(
        lambda state: [SystemMessage(content=instructions)] + state["messages"],
        name="StateModifier",
    )
    return preprocessor | model


async def call_model(state: AgentState, config: RunnableConfig) -> AgentState:
    m = get_model(config["configurable"].get("model", settings.DEFAULT_MODEL))
    model_runnable = wrap_model(m)
    response = await model_runnable.ainvoke(state, config)
    return {"messages": [response]}


def pending_tool_calls(state: AgentState) -> Literal["tools", "done"]:
    last_message = state["messages"][-1]
    if not isinstance(last_message, AIMessage):
        raise TypeError(f"Expected AIMessage, got {type(last_message)}")
    if last_message.tool_calls:
        return "tools"
    return "done"


agent = StateGraph(AgentState)
agent.add_node("model", call_model)
agent.add_node("tools", ToolNode(tools=tools))

agent.set_entry_point("model")
agent.add_edge("tools", "model")
agent.add_conditional_edges("model", pending_tool_calls, {"tools": "tools", "done": END})

paper_assistant = agent.compile(checkpointer=MemorySaver())
paper_assistant.name = "paper_assistant"
