import os

class Config:
    # Azure Speech
    AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
    AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
    AZURE_SPEECH_ENDPOINT = os.getenv("AZURE_SPEECH_ENDPOINT")

    # CORS
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")

    # Gemini
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # 🔑 put your Gemini key here
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")  # default fast model

    JSON_SORT_KEYS = False