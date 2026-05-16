import httpx
import asyncio

async def test():
    # This requires a valid token, which we don't have easily in this environment
    # but we can check if the backend starts up and routes are registered
    print("Backend check...")

asyncio.run(test())
