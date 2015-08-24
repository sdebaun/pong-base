# shared by browser and node
di = if (typeof window!='undefined') then window.angular else require('pongular').pongular
extend = if (typeof window!='undefined') then window.angular.extend else require('extend')

di.module 'pong-base'

.service '$encodeKey', ->
  (key)-> encodeURIComponent(key).replace(/\./g, '%2E')

.service '$promise', ['$q', ($q)->
  (fn)->
    d = $q.defer()
    fn(d)
    d.promise
]

.service '$model', ['$encodeKey', '$promise', ($encodeKey, $promise)->
  (fbRef, options={})->
    decorate = (ref)->
      ref.promise = 
        push: (obj)->
          $promise (d)->
            newRef = ref.push obj, -> d.resolve( decorate(newRef) )
        get: (idx_or_key,key_for_idx)->
          query = if idx_or_key && key_for_idx
            ref.orderByChild(idx_or_key).equalTo(key_for_idx)
          else if idx_or_key && !key_for_idx
            ref.orderByKey().equalTo(idx_or_key)
          else
            ref
          $promise (d)-> query.once 'value', d.resolve
        getFirst: (idx_or_key,key_for_idx)->
          ref.promise.get(idx_or_key,key_for_idx).then (snap)->
            rec = snap.val()
            key = Object.keys(rec)[0]
            val = rec[key]
            val.$id = key
            val

      ref.buildQuery = (byChild, withValue, limitTo)->
        if typeof withValue == 'object' then withValue = withValue.join('|')

        query = byChild && ref.orderByChild(byChild) || ref.orderByKey()
        if withValue then query = query.equalTo withValue
        unless withValue || byChild || limitTo then query = query.equalTo 'SINGLE'
        query = query.limitToFirst(limitTo||1)

      ref.single = -> fbRef.child('SINGLE')
      extend ref, options.methods
      ref

    decorate fbRef
]

# .service 'indexer', ['$encodeKey', ($encodeKey)->
#   class Indexer
#     constructor: (@model,@field)->
#     addIndexItem: (index_key,item_key)->
#       @model.index(@field).child($encodeKey(index_key)).child(item_key).set true
#     removeIndexItem: (index_key,item_key)->
#       @model.index(@field).child($encodeKey(index_key)).child(item_key).remove()
#     update: (snap)->
#       rec = snap.val()
#       new_index_key = rec[@field]; old_index_key = rec[@field + "_old"]; item_key = snap.ref().key()
#       return if (typeof(new_index_key)=='null') || (new_index_key==old_index_key)
#       @addIndexItem new_index_key, item_key
#       @removeIndexItem old_index_key, item_key
#       snap.ref().child(@field+"_old").set new_index_key
#       # console.log 'updated index', @model.name(), @field, item_key, new_index_key, old_index_key
#     remove: (snap)->
#       old_index_key = snap.val()[@field]
#       return if typeof(old_index_key)=='null'
#       @removeIndexItem old_index_key, snap.ref().key()
#     start: ->
#       @model.all().on 'child_added', (snap)=>@update(snap)
#       @model.all().on 'child_changed', (snap)=>@update(snap)
#       @model.all().on 'child_removed', (snap)=>@remove(snap)
# ]


  # (fb,init)->
  #   watchloader =
  #     index: (object_name,indexed_field)->
  #       collRef = fb.child(object_name)
  #       indexRef = fb.child(object_name+"_by").child(indexed_field)
  #       collRef.on 'child_added', (snap)->
  #         index_key = encodeKey(snap.val()[indexed_field])
  #         indexRef.child(index_key).child(snap.ref().key()).set true
  #         console.log 'indexed %s by %s', snap.ref().key(), index_key
  #     # group: (object_name,indexed_field)->
  #     #   console.log 'on something'
  #     # relation: (object_name,indexed_field)->
  #     #   console.log 'on something'
  #   init(watchloader)
    


