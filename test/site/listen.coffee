pongular = require('pongular').pongular

require 'pong-express'
require './server.coffee'

pongular.injector(['app', 'pong-express', 'pong-base']).invoke ($serve, express, StartManagers)->

	StartManagers()

	$serve 9000, (app)->
		app.use '/bower_components', express.static __dirname + '/bower_components'
		app.use express.static( __dirname + '/public')
		app.all '/*', (req,res)-> res.sendFile('public/index.html', {root:__dirname})

