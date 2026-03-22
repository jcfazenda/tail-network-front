import { spawn } from 'node:child_process';

const extraArgs = process.argv.slice(2);
const children = [];
let shuttingDown = false;

function startProcess(command, args, name) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const current of children) {
      if (current.pid && current.pid !== child.pid) {
        current.kill('SIGTERM');
      }
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  console.log(`[dev] started ${name}`);
  children.push(child);
}

startProcess(process.execPath, ['mock-api/server.mjs'], 'mock-api');
startProcess('npx', ['ng', 'serve', '--proxy-config', 'proxy.conf.json', ...extraArgs], 'ng-serve');

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (child.pid) {
      child.kill('SIGTERM');
    }
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
