import os
import subprocess
from typing import Optional

class LocalCommands:
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path

    def run(self, command: str):
        # We run the command in the workspace directory
        process = subprocess.run(
            command,
            shell=True,
            cwd=self.workspace_path,
            capture_output=True,
            text=True
        )
        return LocalCommandResult(
            stdout=process.stdout,
            stderr=process.stderr,
            exit_code=process.returncode
        )

class LocalCommandResult:
    def __init__(self, stdout: str, stderr: str, exit_code: int):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code

class LocalFiles:
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path

    def write(self, path: str, content: str):
        full_path = os.path.join(self.workspace_path, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)

    def read(self, path: str) -> str:
        full_path = os.path.join(self.workspace_path, path)
        with open(full_path, "r") as f:
            return f.read()

class LocalSandbox:
    def __init__(self, workspace_id: str):
        self.sandbox_id = workspace_id
        # We'll use a standard workspace directory relative to the backend root
        self.workspace_path = os.path.abspath(os.path.join(os.getcwd(), "workspace"))
        os.makedirs(self.workspace_path, exist_ok=True)

        self.commands = LocalCommands(self.workspace_path)
        self.files = LocalFiles(self.workspace_path)

# Singleton/Registry for local sandboxes (sharing the same workspace as per user request)
_local_sandbox = None

def get_local_sandbox() -> LocalSandbox:
    global _local_sandbox
    if _local_sandbox is None:
        _local_sandbox = LocalSandbox("local_user")
    return _local_sandbox
