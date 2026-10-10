// Local testing on a Mac: `pm2 start ecosystem.config.cjs`. (Server deploy uses systemd + nginx.)
module.exports = {
  apps: [
    {
      name: "siakad-backend",
      cwd: "./backend",
      script: ".venv/bin/gunicorn",
      args: "config.wsgi:application --bind 127.0.0.1:8000 --workers 2 --reload",
      interpreter: "none",
      max_memory_restart: "300M",
    },
    {
      name: "siakad-frontend",
      cwd: "./frontend",
      script: "node_modules/vite/bin/vite.js",
      interpreter: "node",
      max_memory_restart: "300M",
    },
  ],
};
