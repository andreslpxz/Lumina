from dotenv import load_dotenv

load_dotenv()

import os

# Supabase
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY: str = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# AI / Tools
GROQ_API_KEY: str = os.environ["GROQ_API_KEY"]
E2B_API_KEY: str = os.environ["E2B_API_KEY"]
TAVILY_API_KEY: str = os.environ["TAVILY_API_KEY"]
MODEL_NAME: str = os.environ.get("MODEL_NAME", "llama-3.3-70b-versatile")

# App
FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")
