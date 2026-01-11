import { spawn, ChildProcess } from "child_process";

let devServer: ChildProcess | null = null;

export async function setup() {
  // Check if dev server is already running
  try {
    const response = await fetch("http://localhost:5173");
    if (response.ok) {
      console.log("Dev server already running");
      return;
    }
  } catch {
    // Server not running, start it
  }

  console.log("Starting dev server...");

  devServer = spawn("npm", ["run", "dev"], {
    stdio: "pipe",
    detached: true,
  });

  // Wait for server to be ready
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch("http://localhost:5173");
      if (response.ok) {
        console.log("Dev server ready");
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Dev server failed to start");
}

export async function teardown() {
  if (devServer && devServer.pid) {
    // Kill the process group
    try {
      process.kill(-devServer.pid, "SIGTERM");
    } catch {
      // Process may have already exited
    }
    devServer = null;
  }
}
