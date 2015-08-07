pongular = require('pongular').pongular;

require '../site/server.coffee'
require '../site/app/app.shared.coffee'

pongular.module 'app'

.service 'faker', -> require 'faker'

.value 'fakePictures', [
	'http://worldtravelbliss.com/wp-content/uploads/2015/04/BM-2015-Carnival-of-Mirrors.jpg'
	'https://pbs.twimg.com/media/BzyXBnMIQAEU9HU.jpg'
	'http://boropulse.com/wp-content/uploads/2015/04/Lightning-In-a-Bottle-1.jpg'
	'http://www.neontommy.com/sites/default/files/users/user620/LIB%20Woogie%20Stage.jpg'
	'http://www.psybient.org/love/wp-content/uploads/Yaga-report-photo-2.jpg'
	'http://www.psybient.org/love/wp-content/uploads/Yaga-report-photo-4.jpg'
	'http://festivalfire.com/wp-content/uploads/2015/05/LIB2015.jpg'
	'http://imgs.l4lmcdn.com/wild-woods-festival.jpg'
	'http://www.neontommy.com/sites/default/files/users/user620/LIB%20Seminar.jpg'
	'https://www.goabase.net/pic/20140110tribalgathering_20131105034003.jpg'
	'https://s-media-cache-ak0.pinimg.com/736x/8d/f6/41/8df641b1d49e6270f74493f17cb8e5a5.jpg'
	'http://sensiblereason.com/wp-content/uploads/2015/03/scamp31.jpg'
	'http://i.imgur.com/nUTcriDl.jpg'
	'http://sensiblereason.com/wp-content/uploads/2015/03/junglejame1.jpg'
]
.service 'fixture', (faker,pick,fakePictures)->
	profile: ->
		uid: "google:" + Math.floor(100000000000000000000 + Math.random() * 900000000000000000000)
		name_first: faker.name.firstName()
		name_last: faker.name.lastName()
		email: faker.internet.email()
		profile_pic_url: faker.image.avatar()
	event: ->
		name: pick(['Wild','Luminous','Enchanted','Chakra','Midnight','Solstice','Reggae','Trance','Free','Lucid','Lightning', 'Cosmic', 'Zen', 'Conscious','Northern']) + ' ' +
			pick(['Mountain','Music','Drum','Spirit','Totem','Vision','Forest','Woods','Desert','River','Valley']) + ' ' +
			pick(['Fest','Gathering','Beats','Festival','Convergence','Revelation','Unity','Groove','Nexus','Dreams','Portal', 'Connection'])
		url: faker.internet.domainName()
		address1: faker.address.streetAddress() + ' ' + faker.address.streetName()
		city: faker.address.city()
		state: faker.address.stateAbbr()
		zip: faker.address.zipCode()
		is_public: pick([true,false])
		card_pic: pick(fakePictures)
	eventOwner: (event,profile)->
		profile_key: profile.key()
		event_key: event.key()

.service 'pick', ->
	(arr)-> arr[Math.floor(Math.random()*arr.length)]

pongular.injector(['app', 'pong-base']).invoke ($q, fixture, fbRoot, Profile, Event, EventOwner, pick, $promise)->
	$promise (d)-> fbRoot.remove( d.resolve )
	.then ->
		console.log 'all data removed from firebase'
	.then ->
		console.log 'adding Profiles'
		$q.all (Profile.promise.push(fixture.profile()) for i in [1..30])
	.then (profiles)->
		console.log "#{profiles.length} profiles generated"

		$q.all (Event.promise.push(fixture.event()) for i in [1..15])
		.then (events)->
			console.log "#{events.length} events generated"
			$q.all (EventOwner.promise.push(fixture.eventOwner(e,pick(profiles))) for e in events)
			.then (eventOwners)-> console.log "#{eventOwners.length} owners assigned"
	.catch (err)-> console.log "Err", err
	.finally -> process.exit()

