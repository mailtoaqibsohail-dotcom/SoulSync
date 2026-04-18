const { execSync } = require('child_process');
const path = require('path');

console.log('Building React client...');
try {
  const clientDir = path.join(__dirname, '../client');
  execSync('npm install', { cwd: clientDir, stdio: 'inherit' });
  execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });
  console.log('Client build complete');
} catch (error) {
  console.error('Client build failed:', error.message);
  process.exit(1);
}
