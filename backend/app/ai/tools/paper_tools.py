import asyncio
import logging

from langchain_core.tools import tool
from ai.rag.hybridRetriever import get_retriever

logger = logging.getLogger(__name__)


@tool
async def search_papers(query: str) -> str:
    """
    Search the academic paper knowledge base using hybrid BM25 + vector retrieval.
    Use this tool to answer questions about GAN models, diffusion models,
    infrared/visible light image translation, and related deep learning techniques.
    Always use this tool when the user asks about the content of the papers.
    """
    try:
        retriever = await get_retriever()

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, retriever.invoke, query)

        if not results:
            return "No relevant content found in the knowledge base."

        formatted = []
        for doc in results:
            source = doc.metadata.get("source", "unknown")
            page = doc.metadata.get("page", "?")
            formatted.append(f"[Source: {source}, Page: {page}]\n{doc.page_content}")

        return "\n\n---\n\n".join(formatted)

    except Exception as e:
        logger.error(f"search_papers failed: {e}")
        return f"Knowledge base search failed: {str(e)}"
