module.exports = {

	apps: [{
		name: 'Podium',
		script: 'npm',
		args: 'start-production'
	}],

	deploy: {
		production: {

			user: 'ubuntu',
			ref: 'origin/master',
			repo: 'https://github.com/carter-andrewj/podium-admin-server.git',
			path: '/home/ubuntu/podium-admin-server',
			'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js',

			// CHANGE THESE ON REDEPLOYMENT TO NEW SERVER
			host: 'ec2-35-178-193-209.eu-west-2.compute.amazonaws.com',
			key: '~/.ssh/podium-admin-server.pem',

		}
	}
	
}