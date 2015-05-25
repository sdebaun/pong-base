pongular = require('pongular').pongular

pongular.module 'pong-base', []

.service '$firebase', ->
	Firebase = require 'firebase'
	(args...)-> new Firebase(args...)

.service '$q', -> require 'q'

.service '$encodeKey', ->
	(key)-> encodeURIComponent(key).replace(/\./g, '%2E')

.service '$promise', ($q)->
	(fn)->
		d = $q.defer()
		fn(d)
		d.promise

.service '$pb', ($firebase, $promise)->
	class PromiseBase
		constructor: (@path_or_fb)->
			@fb = (typeof(@path_or_fb)=='string') && $firebase(@path_or_fb) || @path_or_fb

		# convenience methods
		toArray: -> @once().then (snap)-> (v for k,v of snap.val())

		# general firebase methods
		key: -> @fb.key()
		child: (name)-> new PromiseBase(@fb.child(name))
		on: (args...)-> @fb.on(args...)

		# generic handlers
		_no_return: (fname, arg)->
			$promise (d)=>
				@fb[fname] arg, -> d.resolve()
		_no_arg: (fname)->
			$promise (d)=>
				@fb[fname] -> d.resolve()

		# firebase action method wrappers
		push: (obj)->
			$promise (d)=>
				newref = @fb.push obj, -> d.resolve(new PromiseBase(newref))
		once: ->
			$promise (d)=>
				@fb.once 'value', (snap)-> d.resolve(snap)
		remove: -> @_no_arg 'remove'
		set: (val)-> @_no_return 'set', val
		update: (obj)-> @_no_return 'update', obj
	(args...)-> new PromiseBase(args...)


.service '$model', ($encodeKey, indexer)->
	class Model
		constructor: (@root,@index_fields)->
			@indexers = (new indexer(@,field) for field in @index_fields)
		name: -> @root.key()
		all: -> @root.child('all')
		index: (key)-> @root.child('by').child(key)
		by: (key,val)->
			@index(key).child($encodeKey(val)).once().then (snap)=>
				(@all().child(k) for k,v of snap.val())

	(args...)-> new Model(args...)

.service 'indexer', ($encodeKey)->
	class Indexer
		constructor: (@model,@field)->
		update: (snap)->
			index_key = $encodeKey(snap.val()[@field])
			@model.index(@field).child(index_key).child(snap.ref().key()).set true
		start: ->
			@model.all().on 'child_added', (snap)=>@update(snap)

.service '$watch', ->
	(model)->
		for indexer in model.indexers
			indexer.start()
			console.log 'started index watcher for', indexer.model.name(), indexer.field

	# (fb,init)->
	# 	watchloader =
	# 		index: (object_name,indexed_field)->
	# 			collRef = fb.child(object_name)
	# 			indexRef = fb.child(object_name+"_by").child(indexed_field)
	# 			collRef.on 'child_added', (snap)->
	# 				index_key = encodeKey(snap.val()[indexed_field])
	# 				indexRef.child(index_key).child(snap.ref().key()).set true
	# 				console.log 'indexed %s by %s', snap.ref().key(), index_key
	# 		# group: (object_name,indexed_field)->
	# 		# 	console.log 'on something'
	# 		# relation: (object_name,indexed_field)->
	# 		# 	console.log 'on something'
	# 	init(watchloader)
		


