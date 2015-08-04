pongular = require('pongular').pongular

require 'pong-express'
require './server.coffee'

pongular.injector(['app', 'pong-express', 'pong-base']).invoke ($serve, $watch, express)->

	# TODO/pong-base: make this a service $watch that you call, that starts watchers on every $model created
	# $watch(m) for m in []

	$serve 9000, (app)-> # simplest syntax i could get to
		app.use express.static( __dirname + '/public')
		app.use '/bower_components', express.static __dirname + '/bower_components'

