"""Shared provider selection rules for config, prompt preview, and generation."""

from typing import Optional


def resolve_auto_provider(
    has_replicate: bool = False,
    has_huggingface: bool = False,
    has_fal: bool = False,
) -> str:
    """Select the same preferred engine everywhere; ComfyUI is the no-key default."""
    if has_replicate:
        return "replicate"
    if has_huggingface:
        return "huggingface"
    if has_fal:
        return "fal"
    return "comfyui"


def resolve_provider(
    provider: Optional[str],
    has_replicate: bool = False,
    has_huggingface: bool = False,
    has_fal: bool = False,
) -> str:
    selected = (provider or "comfyui").strip().lower()
    if selected != "auto":
        return selected
    return resolve_auto_provider(has_replicate, has_huggingface, has_fal)
