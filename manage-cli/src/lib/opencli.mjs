import { spawn } from 'child_process';

export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });

    let stdout = '';
    let stderr = '';

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

export async function registerWithOpenCLI(launcherPath) {
  try {
    await runCommand('opencli', ['register', launcherPath]);
    return true;
  } catch (error) {
    throw new Error(`Failed to register with opencli: ${error.message}`);
  }
}

export async function checkOpenCLIInstalled() {
  try {
    await runCommand('opencli', ['--version'], { silent: true });
    return true;
  } catch (error) {
    return false;
  }
}