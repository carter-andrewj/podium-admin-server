module.exports = {
  apps: [{
    name: 'podium-admin-server',
    script: './index.js'
  }],
  deploy: {
    production: {
      user: 'ubuntu',
      ref: 'origin/master',
      repo: 'https://github.com/carter-andrewj/podium-admin-server.git',
      path: '/home/ubuntu/podium-admin-server',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js',

      // POPULATE THESE
      host: '{AWS EC2 PUBLIC DNS NAME}',
      key: '~/.ssh/{NAME OF LOCAL SSH KEY FILE}.pem',

    }
  }
}