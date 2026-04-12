import { Sandbox } from '@e2b/code-interpreter';

export class SandboxManager {
  private static instance: SandboxManager;
  private currentSandbox: Sandbox | null = null;
  private currentPreviewUrl: string | null = null;

  private constructor() {}

  public static getInstance(): SandboxManager {
    if (!SandboxManager.instance) {
      SandboxManager.instance = new SandboxManager();
    }
    return SandboxManager.instance;
  }

  public async getOrCreateSandbox(): Promise<Sandbox> {
    if (this.currentSandbox) {
      try {
        // Quick check if sandbox is still alive
        await this.currentSandbox.commands.run('echo 1');
        return this.currentSandbox;
      } catch (e) {
        this.currentSandbox = null;
      }
    }

    // We create a standard Node/Ubuntu sandbox.
    this.currentSandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
    });
    return this.currentSandbox;
  }

  public getPreviewUrl(): string | null {
    return this.currentPreviewUrl;
  }

  public setPreviewUrl(port: number) {
     if (this.currentSandbox) {
       this.currentPreviewUrl = `https://${this.currentSandbox.sandboxId}-${port}.e2b.dev`;
     }
  }

  // Detects port from stdout e.g. "localhost:3000", "port: 5173", "127.0.0.1:8080"
  public detectPort(output: string): number | null {
    const portRegex = /(?:localhost:|127\.0\.0\.1:|port\s*:?\s*)(\d{4,5})/i;
    const match = output.match(portRegex);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }
}

export const sandboxManager = SandboxManager.getInstance();
