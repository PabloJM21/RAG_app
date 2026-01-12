from enum import Enum



class ChatModels(str, Enum):
    QWEN3_CODER_30B_A3B_INSTRUCT = "qwen3-coder-30b-a3b-instruct"
    LLAMA_3_1_8B_INSTRUCT = "meta-llama-3.1-8b-instruct"
    OPENAI_GPT_OSS_120B = "openai-gpt-oss-120b"
    QWEN3_30B_A3B_INSTRUCT_2507 = "qwen3-30b-a3b-instruct-2507"
    QWEN3_32B = "qwen3-32b"
    QWEN3_235B_A22B = "qwen3-235b-a22b"
    LLAMA_3_3_70B_INSTRUCT = "llama-3.3-70b-instruct"
    QWEN_QWQ_32B = "qwen-qwq-32b"
    DEEPSEEK_R1 = "deepseek-r1"
    DEEPSEEK_R1_DISTILL_LLAMA_70B = "deepseek-r1-distill-llama-70b"
    MISTRAL_LARGE_INSTRUCT = "mistral-large-instruct"
    QWEN2_5_CODER_32B_INSTRUCT = "qwen2.5-coder-32b-instruct"
    TEUKEN_7B_INSTRUCT_RESEARCH = "teuken-7b-instruct-research"
    CODESTRAL_22B = "codestral-22b"
    LLAMA_3_1_SAUERKRAUTLM_70B_INSTRUCT = "llama-3.1-sauerkrautlm-70b-instruct"



CHAT_SUBCATEGORIES = {
    "coder": [
        ChatModels.QWEN3_CODER_30B_A3B_INSTRUCT,
        ChatModels.QWEN2_5_CODER_32B_INSTRUCT,
    ],
    "thinker": [
        ChatModels.OPENAI_GPT_OSS_120B,
        ChatModels.DEEPSEEK_R1,
        ChatModels.DEEPSEEK_R1_DISTILL_LLAMA_70B,
    ],
    "classifier": [
        ChatModels.MISTRAL_LARGE_INSTRUCT,
        ChatModels.QWEN3_32B,
    ],
    "generator": [
        ChatModels.LLAMA_3_1_8B_INSTRUCT,
        ChatModels.LLAMA_3_3_70B_INSTRUCT,
        ChatModels.CODESTRAL_22B,
        ChatModels.TEUKEN_7B_INSTRUCT_RESEARCH,
    ],
    "reasoner": [
        ChatModels.QWEN3_235B_A22B,
        ChatModels.QWEN_QWQ_32B,
    ],
}

# This extension allows to call the models directly (lower case)
CHAT_SUBCATEGORIES |= {
    model.value: model
    for model in ChatModels
}






class RagModels(str, Enum):
    QWEN3_30B_A3B_THINKING_2507 = "qwen3-30b-a3b-thinking-2507"
    QWEN3_32B = "qwen3-32b"
    QWEN3_235B_A22B = "qwen3-235b-a22b"
    QWEN_QWQ_32B = "qwq-32b"
    DEEPSEEK_R1 = "deepseek-r1"
    DEEPSEEK_R1_DISTILL_LLAMA_70B = "deepseek-r1-distill-llama-70b"
    LLAMA_3_1_8B_RAG = "meta-llama-3.1-8b-rag"
    LLAMA_3_1_8B_RAG_DEV = "meta-llama-3.1-8b-rag-dev"


RAG_SUBCATEGORIES = {
    "reasoner": [
        RagModels.QWEN3_30B_A3B_THINKING_2507,
        RagModels.QWEN3_235B_A22B,
        RagModels.QWEN3_32B,
        RagModels.QWEN_QWQ_32B,
        RagModels.DEEPSEEK_R1,
    ],
    "thinker": [
        RagModels.DEEPSEEK_R1_DISTILL_LLAMA_70B,
    ],
    # remaining subcategories do NOT apply
    "rag": [
        RagModels.LLAMA_3_1_8B_RAG,
        RagModels.LLAMA_3_1_8B_RAG_DEV,
    ],
}



from enum import Enum


class EmbeddingModels(str, Enum):
    E5_MISTRAL_7B_INSTRUCT = "e5-mistral-7b-instruct"
    MULTILINGUAL_E5_LARGE_INSTRUCT = "multilingual-e5-large-instruct"
    QWEN3_EMBEDDING_4B = "qwen3-embedding-4b"


EMBEDDING_SUBCATEGORIES = {
    "multi_lang":
    [ EmbeddingModels.MULTILINGUAL_E5_LARGE_INSTRUCT],
    "english":[EmbeddingModels.E5_MISTRAL_7B_INSTRUCT],
    "long_context":[EmbeddingModels.QWEN3_EMBEDDING_4B],
    "embeddings": [
        EmbeddingModels.E5_MISTRAL_7B_INSTRUCT,
        EmbeddingModels.MULTILINGUAL_E5_LARGE_INSTRUCT,
        EmbeddingModels.QWEN3_EMBEDDING_4B,
    ],

}


# ───────────────────────────────────────────────
# Models and Subcategories
# ───────────────────────────────────────────────
# ───────────────────────────────────────────────
# MULTIMODAL (image/video/audio → text reasoning)
# ───────────────────────────────────────────────
class MultiModalModels(str, Enum):
    GEMMA_3_27B_IT = "gemma-3-27b-it"                     # general vision-language understanding
    MEDGEMMA_27B_IT = "medgemma-27b-it"                   # medical / scientific image analysis
    QWEN2_5_VL_72B_INSTRUCT = "qwen2.5-vl-72b-instruct"   # text + image + video reasoning
    INTERNVL2_5_8B = "internvl2.5-8b"                     # efficient vision-language model
    QWEN2_5_OMNI_7B = "qwen2.5-omni-7b"                   # text + image + audio multimodal model


MULTIMODAL_SUBCATEGORIES = {
    # For captioning, object detection, OCR, and visual reasoning
    "vision_only": [
        MultiModalModels.GEMMA_3_27B_IT,
        MultiModalModels.INTERNVL2_5_8B,
    ],

    # For temporal or multi-frame reasoning (video, sequences)
    "video_reasoning": [
        MultiModalModels.QWEN2_5_VL_72B_INSTRUCT,
    ],

    # For medical or scientific image interpretation
    "medical": [
        MultiModalModels.MEDGEMMA_27B_IT,
    ],

    # For text + image + audio combined reasoning
    "omni": [
        MultiModalModels.QWEN2_5_OMNI_7B,
    ],

    # Default pool (fallback)
    "multimodal": [
        MultiModalModels.GEMMA_3_27B_IT,
        MultiModalModels.MEDGEMMA_27B_IT,
        MultiModalModels.QWEN2_5_VL_72B_INSTRUCT,
        MultiModalModels.INTERNVL2_5_8B,
        MultiModalModels.QWEN2_5_OMNI_7B,
    ],
}


class ImageGenerationModels(str, Enum):
    FLUX_1_SCHNELL = "flux"  # Official model name used by AcademicCloud (text-to-image)


IMAGE_GENERATION_SUBCATEGORIES = {
    # Fast and photorealistic rendering (general use)
    "realistic": [ImageGenerationModels.FLUX_1_SCHNELL],

    # Artistic or stylized image generation (still handled by FLUX)
    "artistic": [ImageGenerationModels.FLUX_1_SCHNELL],

    # Anime or fantasy-like styles (FLUX can adapt via prompt)
    "anime": [ImageGenerationModels.FLUX_1_SCHNELL],

    # Default fallback pool
    "image_generation": [ImageGenerationModels.FLUX_1_SCHNELL],
}


class ImageEditModels(str, Enum):
    QWEN_IMAGE_EDIT = "qwen-image-edit"  # Official model name for semantic & appearance editing


IMAGE_EDIT_SUBCATEGORIES = {
    # Photorealistic modifications or text removal/addition
    "realistic": [ImageEditModels.QWEN_IMAGE_EDIT],

    # Painterly restyling or artistic transformations
    "artistic": [ImageEditModels.QWEN_IMAGE_EDIT],

    # Fantasy, illustration, or stylized edits
    "anime": [ImageEditModels.QWEN_IMAGE_EDIT],

    # Default fallback
    "image_edit": [ImageEditModels.QWEN_IMAGE_EDIT],
}
