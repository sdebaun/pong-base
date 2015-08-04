pongular = require('pongular').pongular

require '../../node.js' # pong-base

pongular.module 'app', ['pong-base']
.uses __dirname + 'app/**/*.shared.coffee'

.service 'fbRoot', (Firebase)-> new Firebase("http://sparks-development.firebaseio.com")
