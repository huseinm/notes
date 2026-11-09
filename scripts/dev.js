import { spawn } from 'child_process';

console.log('🚀 Starting Apple Notes Self-Hosted in Development mode...\n');

const server = spawn('npm', ['run', 'dev', '--prefix', 'server'], {
  stdio: 'inherit',
  shell: true
});

const client = spawn('npm', ['run', 'dev', '--prefix', 'client'], {
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
