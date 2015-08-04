pongular = require('pongular').pongular

pongular.module 'pong-base' , []

# stand-ins for services that exist in browser
.service 'Firebase', -> require 'firebase'

.service '$q', -> require 'q'

# used on a server to turn on index watchers
.service '$watch', ->
	(model)-> console.log 'starting watchers for', model.name()
