import os
from dotenv import load_dotenv

# Load .env if present (for local dev)
load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Local dev only
    app.run(debug=True)