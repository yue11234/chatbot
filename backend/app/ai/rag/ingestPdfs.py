"""
ingestPdfs.py - 离线多 PDF 入库脚本

从项目根目录 resource/*.pdf 加载所有 PDF，使用 RecursiveCharacterTextSplitter
分块后写入 ChromaDB 'handbook' 集合。

为什么不用 SemanticChunker：
  SemanticChunker 在分块时需要先对整段原文做 embedding 以检测语义边界，
  学术论文一整页文字（尤其中文）可达数百至数千 token，会直接超出
  mxbai-embed-large（512 token 上限）和其他短上下文模型的限制，
  导致写入 ChromaDB 失败或产生 NaN embedding。
  RecursiveCharacterTextSplitter 不依赖 embedding，先在字符层面安全分块，
  再由 ChromaDB 批量 embed，可稳定处理任意长度 PDF。

运行方式（在 backend/ 目录下）：
    uv run python -m app.ai.rag.ingestPdfs
"""

import re
import sys
import pathlib
import logging

# --- sys.path bootstrap（兼容直接运行和 -m 两种方式）---
_HERE = pathlib.Path(__file__).resolve().parent          # backend/app/ai/rag
_APP_ROOT = _HERE.parent.parent                          # backend/app
_RESOURCE_DIR = _HERE.parent.parent.parent.parent / "resource"  # 项目根/resource

if str(_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(_APP_ROOT))

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document

from ai.rag.chromaClient import embedding, client
from core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 分块参数
#
# mxbai-embed-large 最大上下文 512 tokens。
# 英文学术文本中，一个单词平均 1.5 个子词 token；
# 中英混合 + 数学公式的情况下，200 字符约折合 150-300 tokens，
# 远低于 512 上限，是最保守的安全值。
# bge-m3 支持 8192 token，200 字符对它同样适用。
# ---------------------------------------------------------------------------
CHUNK_SIZE = 200
CHUNK_OVERLAP = 30
MIN_CHUNK_LEN = 20   # 过短的碎片不写入，避免 NaN embedding


def clean_text(text: str) -> str:
    """
    清理 PDF 提取出的原始文本：
    - 去除空字节（null byte）：是 bge-m3 产生 NaN embedding 的常见原因
    - 合并连续空白为单个空格，保留换行
    - 去除控制字符（保留制表符和换行）
    """
    text = text.replace("\x00", "")
    text = re.sub(r"[^\S\n]+", " ", text)       # 合并行内连续空白
    text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)  # 去除控制字符
    return text.strip()


def load_pdfs(resource_dir: pathlib.Path) -> list[Document]:
    """加载目录下所有 PDF，每页为一个 Document，metadata 保留 source 和 page。"""
    pdf_files = sorted(resource_dir.glob("*.pdf"))
    if not pdf_files:
        raise FileNotFoundError(f"resource 目录下没有找到 PDF：{resource_dir}")

    all_docs: list[Document] = []
    for pdf_path in pdf_files:
        logger.info(f"加载：{pdf_path.name}")
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            for doc in pages:
                doc.metadata["source"] = pdf_path.name
                doc.page_content = clean_text(doc.page_content)
            all_docs.extend(pages)
            logger.info(f"  -> {len(pages)} 页")
        except Exception as e:
            logger.error(f"加载失败 {pdf_path.name}：{e}")

    logger.info(f"共加载 {len(all_docs)} 页")
    return all_docs


def chunk_documents(docs: list[Document]) -> list[Document]:
    """
    用 RecursiveCharacterTextSplitter 分块。
    中英文都适用：先尝试在段落/句子/逗号/空格处分割，最终按字符。
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", "。", "！", "？", ".", "!", "?", "；", ";", " ", ""],
        length_function=len,
    )

    chunked: list[Document] = []
    for doc in docs:
        if len(doc.page_content) < MIN_CHUNK_LEN:
            continue  # 跳过近空白页
        try:
            pieces = splitter.create_documents(
                texts=[doc.page_content],
                metadatas=[doc.metadata],
            )
            # 再次过滤清洗后仍过短的碎片
            pieces = [p for p in pieces if len(p.page_content.strip()) >= MIN_CHUNK_LEN]
            chunked.extend(pieces)
        except Exception as e:
            logger.warning(f"  分块失败（{doc.metadata.get('source')} p{doc.metadata.get('page')}）：{e}")

    logger.info(f"分块完成，共 {len(chunked)} 个 chunk")
    return chunked


def rebuild_vector_store(chunks: list[Document]) -> None:
    """
    重建向量库：删除旧 collection → 重新创建 Chroma 对象 → 分批写入。
    必须重新创建 Chroma 对象，否则旧对象仍持有已删除 collection 的引用，
    后续 add_documents 会报错。
    """
    logger.info("删除旧 'handbook' collection...")
    try:
        client.delete_collection("handbook")
        logger.info("已删除")
    except Exception as e:
        logger.warning(f"删除时出现问题（首次运行属正常）：{e}")

    # delete 后必须重新创建，不能复用模块级 hand_book_vector_store
    vector_store = Chroma(
        collection_name="handbook",
        persist_directory=settings.CHROMA_PATH,
        embedding_function=embedding,
        client=client,
        create_collection_if_not_exists=True,
    )

    logger.info(f"开始写入 {len(chunks)} 个 chunk...")
    batch_size = 20  # 保守批次，避免 SQLite 参数上限问题
    skipped = 0
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        try:
            vector_store.add_documents(batch)
            logger.info(f"  第 {i // batch_size + 1} 批写入完成（{len(batch)} 条）")
        except Exception as batch_err:
            # 批量失败时降级为逐条写入，跳过无法 embed 的单条
            logger.warning(f"  第 {i // batch_size + 1} 批失败，尝试逐条写入：{batch_err}")
            for doc in batch:
                try:
                    vector_store.add_documents([doc])
                except Exception as single_err:
                    skipped += 1
                    src = doc.metadata.get("source", "?")
                    pg = doc.metadata.get("page", "?")
                    logger.warning(
                        f"    跳过无法 embed 的 chunk（{src} p{pg}，"
                        f"长度={len(doc.page_content)}）：{single_err}"
                    )

    if skipped:
        logger.warning(f"共跳过 {skipped} 个无法 embed 的 chunk")
    logger.info("入库完成。")


def main() -> None:
    logger.info(f"resource 目录：{_RESOURCE_DIR}")
    docs = load_pdfs(_RESOURCE_DIR)
    chunks = chunk_documents(docs)
    rebuild_vector_store(chunks)


if __name__ == "__main__":
    main()
