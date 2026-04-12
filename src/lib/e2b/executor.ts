import { sandboxManager } from './sandbox';
import { truncateFileContent } from '../tools';

export async function executeToolCall(toolCall: any): Promise<any> {
  const sandbox = await sandboxManager.getOrCreateSandbox();

  if (toolCall.name === 'run_command') {
    const { command } = toolCall.arguments;
    try {
      // Execute as a background process if it contains '&' or seems like a dev server
      const isBackground = command.includes('&') || command.includes('npm run dev') || command.includes('npm start');

      const result = await sandbox.commands.run(command, {
        background: isBackground
      });

      const stdout = result.stdout || '';
      const stderr = result.stderr || '';

      const port = sandboxManager.detectPort(stdout) || sandboxManager.detectPort(stderr);
      if (port) {
        sandboxManager.setPreviewUrl(port);
      }

      if (isBackground) {
        return {
          stdout: `${stdout}\n[Process started in background]`,
          stderr
        };
      }

      return { stdout, stderr, exitCode: result.exitCode };
    } catch (e: any) {
      return { error: e.message || 'Unknown error occurred while running command' };
    }
  }

  if (toolCall.name === 'write_file') {
    const { path, content } = toolCall.arguments;
    try {
      // create dir if not exists
      const dirPath = path.substring(0, path.lastIndexOf('/'));
      if (dirPath) {
        await sandbox.commands.run(`mkdir -p ${dirPath}`);
      }
      await sandbox.files.write(path, content);
      return { success: true, message: `File written successfully to ${path}` };
    } catch (e: any) {
      return { error: e.message || 'Failed to write file' };
    }
  }

  if (toolCall.name === 'read_file') {
    const { path } = toolCall.arguments;
    try {
      const content = await sandbox.files.read(path);
      return { content: truncateFileContent(content) };
    } catch (e: any) {
      return { error: e.message || 'Failed to read file' };
    }
  }

  if (toolCall.name === 'load_skill') {
    const { skill_name } = toolCall.arguments;
    return { success: true, message: `Skill ${skill_name} loaded successfully.` };
  }

  if (toolCall.name === 'run_sql_query') {
      const { query } = toolCall.arguments;
      try {
          // Assume sqlite3 is installed or install it if missing? For now we assume standard e2b has sqlite3 or we can install it on first run
          // A safer approach: execute command via sandbox
          await sandbox.commands.run('apt-get update && apt-get install -y sqlite3');

          // Escape single quotes in query
          const escapedQuery = query.replace(/'/g, "'\\''");
          const result = await sandbox.commands.run(`sqlite3 database.sqlite '${escapedQuery}'`);
          return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
      } catch (e: any) {
          return { error: e.message };
      }
  }

  if (toolCall.name === 'search_web') {
      const { query } = toolCall.arguments;
      try {
          const apiKey = process.env.TAVILY_API_KEY;
          if (!apiKey) return { error: "TAVILY_API_KEY is not set." };

          const response = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ api_key: apiKey, query, include_answer: true })
          });
          const data = await response.json();
          return { answer: data.answer, results: data.results?.slice(0, 3) };
      } catch (e: any) {
           return { error: e.message };
      }
  }

  return { error: `Tool ${toolCall.name} not implemented` };
}
