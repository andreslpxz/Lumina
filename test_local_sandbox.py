from backend.app.services.local_sandbox import get_local_sandbox
import os

def test_sandbox():
    sandbox = get_local_sandbox()
    print(f"Workspace path: {sandbox.workspace_path}")

    # Test write
    sandbox.files.write("test.txt", "hello local world")
    print("File written")

    # Test read
    content = sandbox.files.read("test.txt")
    print(f"File content: {content}")
    assert content == "hello local world"

    # Test command
    result = sandbox.commands.run("ls test.txt")
    print(f"Command stdout: {result.stdout}")
    assert "test.txt" in result.stdout

    print("LocalSandbox tests passed!")

if __name__ == "__main__":
    test_sandbox()
