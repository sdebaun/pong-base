pongular = require('pongular').pongular

pongular.module 'pong-base'

# stand-ins for services that exist in browser
.service 'Firebase', -> require 'firebase'

.service '$q', -> require 'q'

# used on a server to turn on index watchers
.service '$watch', ->
	(model)->
		for indexer in model.indexers
			indexer.start()
			console.log 'started index watcher for', indexer.model.name(), indexer.field
