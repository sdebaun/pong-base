require('pongular')
.pongular
.module('pong-base', []);

require('./node/index.coffee');
require('./shared/index.coffee');

// .uses('./node/**/*.coffee','./shared/**/*.coffee');
// this doesnt work when this file is included from elsewhere