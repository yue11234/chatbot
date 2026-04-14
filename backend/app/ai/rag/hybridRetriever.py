"""
hybridRetriever.py - 懒加载混合检索器（BM25 + 向量）

首次调用 get_retriever() 时，从 ChromaDB 加载全量文档构建 BM25 索引，
与向量检索器组合为 EnsembleRetriever。
ChromaDB 为空时自动回退到纯向量检索。
"""

import asyncio
import logging
from typing import Optional

from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from ai.rag.chromaClient import hand_book_vector_store

logger = logging.getLogger(__name__)

# --- 检索参数 ---
VECTOR_K = 3
BM25_K = 3
BM25_WEIGHT = 0.4    # BM25 权重
VECTOR_WEIGHT = 0.6  # 向量检索权重（两者之和须为 1.0）

# --- 单例状态 ---
_retriever: Optional[BaseRetriever] = None
_retriever_lock = asyncio.Lock()


def _load_all_documents_from_chroma() -> list[Document]:
    """
    从 ChromaDB 'handbook' collection 读取全量文档，用于构建 BM25 索引。
    使用 .get() 而非 similarity_search，无需查询向量，直接返回所有存储内容。
    """
    try:
        raw = hand_book_vector_store.get()
        documents = []
        ids = raw.get("ids", [])
        contents = raw.get("documents") or []
        metadatas = raw.get("metadatas") or []

        for i in range(len(ids)):
            content = contents[i] if i < len(contents) else ""
            metadata = metadatas[i] if i < len(metadatas) else {}
            if content.strip():
                documents.append(Document(page_content=content, metadata=metadata))

        logger.info(f"从 ChromaDB 加载了 {len(documents)} 条文档用于构建 BM25 索引")
        return documents
    except Exception as e:
        logger.error(f"从 ChromaDB 加载文档失败：{e}")
        return []


def _build_retriever() -> BaseRetriever:
    """
    构建并返回检索器（同步函数，供 run_in_executor 调用）。
    - 有数据：返回 EnsembleRetriever（BM25 + 向量）
    - 无数据：回退到纯向量检索器，记录 WARNING
    """
    docs = _load_all_documents_from_chroma()

    vector_retriever = hand_book_vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": VECTOR_K},
    )

    if not docs:
        logger.warning(
            "'handbook' collection 为空，使用纯向量检索器。"
            "请先运行 ingestPdfs.py 完成入库。"
        )
        return vector_retriever

    bm25_retriever = BM25Retriever.from_documents(docs)
    bm25_retriever.k = BM25_K

    ensemble = EnsembleRetriever(
        retrievers=[bm25_retriever, vector_retriever],
        weights=[BM25_WEIGHT, VECTOR_WEIGHT],
    )
    logger.info(
        f"混合检索器构建完成：BM25(k={BM25_K}, w={BM25_WEIGHT}) + "
        f"向量(k={VECTOR_K}, w={VECTOR_WEIGHT})，共 {len(docs)} 条文档"
    )
    return ensemble


async def get_retriever() -> BaseRetriever:
    """
    异步懒加载单例。
    - 首次调用时在线程池中构建检索器（避免阻塞事件循环）
    - 使用 asyncio.Lock + 双重检查锁，防止并发请求重复初始化
    """
    global _retriever
    if _retriever is not None:
        return _retriever

    async with _retriever_lock:
        if _retriever is not None:  # 双重检查
            return _retriever

        logger.info("首次初始化混合检索器...")
        loop = asyncio.get_event_loop()
        _retriever = await loop.run_in_executor(None, _build_retriever)

    return _retriever


def invalidate_retriever() -> None:
    """
    清除检索器缓存，下次调用 get_retriever() 时将重新构建。
    在重新执行 ingestPdfs.py 后调用，以使 BM25 索引与最新数据同步。
    """
    global _retriever
    _retriever = None
    logger.info("混合检索器缓存已清除，下次请求将重新初始化")
