"""
Module Registry implementation for ChimeraForge.

This module manages the state and capabilities of all system modules.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class ModuleInfo:
    """
    Information about a module in the ChimeraForge system.
    
    Attributes:
        id: Unique identifier for the module ("eye", "brain", "mouth", "ear")
        name: Human-readable name of the module
        description: Description of the module's capabilities
        enabled: Whether the module is currently active
        capabilities: List of capabilities this module provides
    """
    id: str
    name: str
    description: str
    enabled: bool = False
    capabilities: List[str] = field(default_factory=list)


class ModuleRegistry:
    """
    Registry for managing module states and capabilities.
    
    Tracks which modules are enabled/disabled and provides methods
    to query and modify module states.
    """
    
    def __init__(self):
        """
        Initialize the module registry with all four modules in disabled state.
        """
        self._modules: Dict[str, ModuleInfo] = {
            "eye": ModuleInfo(
                id="eye",
                name="Eye Module",
                description="Vision module that detects faces or objects from webcam input",
                enabled=False,
                capabilities=["face_detection", "object_detection", "vision_processing"]
            ),
            "brain": ModuleInfo(
                id="brain",
                name="Brain Module",
                description="Reasoning module that interprets events and plans responses using LLM",
                enabled=False,
                capabilities=["llm_reasoning", "context_analysis", "action_planning"]
            ),
            "mouth": ModuleInfo(
                id="mouth",
                name="Mouth Module",
                description="Voice output module that converts text to speech",
                enabled=False,
                capabilities=["text_to_speech", "voice_output"]
            ),
            "ear": ModuleInfo(
                id="ear",
                name="Ear Module",
                description="Voice input module that listens to microphone and converts speech to text",
                enabled=False,
                capabilities=["speech_recognition", "voice_input", "audio_processing"]
            )
        }
    
    def get_all_modules(self) -> List[ModuleInfo]:
        """
        Get information about all modules.
        
        Returns:
            List of all ModuleInfo objects
        """
        return list(self._modules.values())
    
    def get_module(self, module_id: str) -> Optional[ModuleInfo]:
        """
        Get information about a specific module.
        
        Args:
            module_id: ID of the module to retrieve
            
        Returns:
            ModuleInfo if found, None otherwise
        """
        return self._modules.get(module_id)
    
    def toggle_module(self, module_id: str) -> Optional[ModuleInfo]:
        """
        Toggle the enabled state of a module.
        
        Args:
            module_id: ID of the module to toggle
            
        Returns:
            Updated ModuleInfo if module exists, None otherwise
        """
        module = self._modules.get(module_id)
        if module:
            module.enabled = not module.enabled
            return module
        return None
    
    def is_enabled(self, module_id: str) -> bool:
        """
        Check if a module is enabled.
        
        Args:
            module_id: ID of the module to check
            
        Returns:
            True if module exists and is enabled, False otherwise
        """
        module = self._modules.get(module_id)
        return module.enabled if module else False
