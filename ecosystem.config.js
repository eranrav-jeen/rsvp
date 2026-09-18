// pm2 process definition for the Jeen event API.
// Start with:  pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'jeen-event-api',
      cwd: './backend',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // Reads the rest (DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD, PORT)
      // from backend/.env via dotenv.
      max_memory_restart: '300M',
      time: true,
    },
  ],
};
