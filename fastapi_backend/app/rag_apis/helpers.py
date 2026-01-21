import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
import pandas as pd


import os
import time

# Orchestrators
from app.rag_apis.docling_api import DoclingClient, DoclingOutputType
from app.rag_apis.image2caption_api import MultiModalVisionClient
from app.rag_apis.chat_api import ChatOrchestrator

# -----------------------------------------
# Docling
# -----------------------------------------

# Tokenizers and chunkers

from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from docling_core.transforms.chunker.tokenizer.base import BaseTokenizer
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from transformers import AutoTokenizer
from docling_core.transforms.chunker.base import BaseChunk
from docling_core.transforms.chunker.hierarchical_chunker import DocChunk, HierarchicalChunker

# Doc conversion

from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter

# from pdf path
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import PdfFormatOption




# helpers for disc paths

from app.rag_services.helpers import get_doc_paths, get_log_paths, get_doc_name, get_user_api_keys


#logs
from app.log_generator import InfoLogger
from app.generate_markdown import export_logs

# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines, Paragraph, Retrieval



"""

async def get_docling_client():

    user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

    client = DoclingClient(user_key_list=user_key_list, base_api="https://chat-ai.academiccloud.de/v1")



"""