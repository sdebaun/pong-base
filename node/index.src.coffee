pongular = require('pongular').pongular

pongular.module 'pong-base' , []

# stand-ins for services that exist in browser
.service 'Firebase', -> require 'firebase'

.service '$q', -> require 'q'

.service '$modelManager', (startCounterHandler, startCompositeHandler)->
	(model, options)->
		model.listen = ->
			console.log 'listening to', model.key()
			if options.timestamp
				model.orderByChild('created_on').equalTo(null).on 'child_added', (snap)->
					# console.log 'timestamp on', snap.ref().key()
					snap.ref().child('created_on').set( new Date().getTime() )
			if options.initialize
				model.orderByChild('is_initialized').equalTo(null).on 'child_added', (snap)->
					console.log 'initializing', snap.ref().key()
					options.initialize snap
					snap.ref().child('is_initialized').set( new Date().getTime() )
			for trigger_field, trigger_function of options.triggers
				model.orderByChild(trigger_field).equalTo(true).on 'child_added', (snap)->
					rec = snap.val()
					unless rec[trigger_field+'_triggered']
						snap.ref().child(trigger_field+'_triggered').transaction (old_val)->
							trigger_function snap
							true # sets _triggered
			for counter_name, counter_options of options.counters
				startCounterHandler(model, counter_name, counter_options)
			for composite_name, composite_fields of options.composites
				startCompositeHandler(model, composite_name, composite_fields)
		model

.service 'startCompositeHandler', ->
	(model, composite_name, fields)->
		console.log 'COMPOSITE: adding index builder to', model.key(), 'named', composite_name, 'with fields', fields...
		update_handler = (snap)->
			rec = snap.val()
			new_composite_value = (rec[f] || 'false' for f in fields).join('|')
			if rec[composite_name] != new_composite_value then snap.ref().child(composite_name).set new_composite_value
		model.on 'child_added', update_handler
		model.on 'child_changed', update_handler

.service 'startCounterHandler', (updateAllTargetCounters, getTargetRefs, updateTargetCounter)->
	(model, counter_name, counter_options)->
		counted_old_field = counter_name+'_counted'
		console.log 'COUNTER: adding to', model.key(), 'named', counter_name, 'countif', counter_options.countIf

		update_handler = (snap,evtname)->
			# console.log evtname, 'handler triggered on', model.key(), snap.key()
			rec = snap.val()
			count_value_new = if counter_options.total then rec[counter_options.total]||0 else 1

			snap.ref().child(counter_name+'_counted').transaction (count_value_old)->
				updateAllTargetCounters(counter_name, counter_options.target, rec, count_value_old, count_value_new)

		remove_handler = (snap)->
			# console.log 'remove handler triggered on', model.key(), snap.key()
			rec = snap.val()

			updateAllTargetCounters(counter_name, counter_options.target, rec, rec[counter_name+'_counted'], 0)
			snap.ref().child(counter_name+'_counted').remove() # in case the record wasnt actually deleted, just fell out of filter

		query = if counter_options.countIf
			[field,value] = counter_options.countIf
			model.orderByChild(field).equalTo(value)
		else
			model

		query.on 'child_added', (snap)-> setTimeout  (-> update_handler(snap,'added')), 0
		query.on 'child_changed', (snap)-> setTimeout (-> update_handler(snap,'changed')), 0
		query.on 'child_removed', (snap)-> setTimeout (-> remove_handler(snap)), 0

.service 'updateAllTargetCounters', (updateTargetCounter, getTargetRefs)->
	(counter_name, target, rec, count_value_old, count_value_new)->
		delta = count_value_new - count_value_old
		unless delta == 0
			for target_ref in getTargetRefs(target,rec)
				setTimeout (->updateTargetCounter(target_ref, counter_name, delta)), 0
		count_value_new

.service 'updateTargetCounter', ->
	(target_ref, counter_name, delta)->
		target_ref.child(counter_name).transaction (current_counter)->
			console.log 'updating counter', target_ref.key(), counter_name, current_counter, delta
			current_counter + delta

.service 'getTargetRefs', ->
	(target,rec)->
		targetRef = (typeof target=='function') && target(rec) || target
		targetRefs = (targetRef.length) && targetRef || [targetRef,]

