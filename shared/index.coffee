# shared by browser and node
di = (typeof window!='undefined') && window.angular || require('pongular').pongular
di.module 'pong-base'

.service '$encodeKey', ->
	(key)-> encodeURIComponent(key).replace(/\./g, '%2E')

.service '$promise', ($q)->
	(fn)->
		d = $q.defer()
		fn(d)
		d.promise

.service '$pb', (Firebase, $promise)->
	class PromiseBase
		constructor: (@path_or_fb,@indexTo)->
			@fb = (typeof(@path_or_fb)=='string') && new Firebase(@path_or_fb) || @path_or_fb

		# convenience methods
		toArray: -> @once().then (snap)-> (v for k,v of snap.val())

		# general firebase methods
		key: -> @fb.key()
		child: (name,indexTo)-> new PromiseBase(@fb.child(name),indexTo)
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

		# additional action that converts an index reference into an array of references
		lookup: ->
			unless @indexTo then throw 'A promisebase must be created via "by" to be able to lookup with it'
			@once().then (snap)=> (@indexTo.child(k) for k,v of snap.val())

	(args...)-> new PromiseBase(args...)


.service '$model', ($encodeKey, indexer)->
	class Model
		constructor: (@root,@index_fields)->
			@indexers = (new indexer(@,field) for field in @index_fields)
		name: -> @root.key()
		all: -> @root.child('all')
		index: (key)-> @root.child('by').child(key)
		by: (key,val)-> @index(key).child($encodeKey(val), @all())
		id: (key)->@all.child($encodeKey(key))

	(args...)-> new Model(args...)

.service 'indexer', ($encodeKey)->
	class Indexer
		constructor: (@model,@field)->
		addIndexItem: (index_key,item_key)->
			@model.index(@field).child($encodeKey(index_key)).child(item_key).set true
		removeIndexItem: (index_key,item_key)->
			@model.index(@field).child($encodeKey(index_key)).child(item_key).remove()
		update: (snap)->
			rec = snap.val()
			new_index_key = rec[@field]; old_index_key = rec[@field + "_old"]; item_key = snap.ref().key()
			return if (typeof(new_index_key)=='null') || (new_index_key==old_index_key)
			@addIndexItem new_index_key, item_key
			@removeIndexItem old_index_key, item_key
			snap.ref().child(@field+"_old").set new_index_key
			# console.log 'updated index', @model.name(), @field, item_key, new_index_key, old_index_key
		remove: (snap)->
			old_index_key = snap.val()[@field]
			return if typeof(old_index_key)=='null'
			@removeIndexItem old_index_key, snap.ref().key()
		start: ->
			@model.all().on 'child_added', (snap)=>@update(snap)
			@model.all().on 'child_changed', (snap)=>@update(snap)
			@model.all().on 'child_removed', (snap)=>@remove(snap)



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
		


