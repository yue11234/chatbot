import chromadb
from chromadb.config import Settings
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from core.config import settings

client = chromadb.PersistentClient(
    path=settings.CHROMA_PATH,
    settings=Settings(anonymized_telemetry=False),
)

embedding = OllamaEmbeddings(model=settings.EMBEDDING_MODEL)

hand_book_vector_store = Chroma(
    collection_name="handbook",
    persist_directory=settings.CHROMA_PATH,
    embedding_function=embedding,
    client=client,
    create_collection_if_not_exists=True,
)
