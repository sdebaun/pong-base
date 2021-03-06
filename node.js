var pongular,
  slice = [].slice;

pongular = require('pongular').pongular;

pongular.module('pong-base', []).service('Firebase', function() {
  return require('firebase');
}).service('$q', function() {
  return require('q');
}).service('$modelManager', function(startCounterHandler, startCompositeHandler) {
  return function(model, options) {
    model.listen = function() {
      var composite_fields, composite_name, counter_name, counter_options, ref, ref1, ref2, results, trigger_field, trigger_function;
      console.log('listening to', model.key());
      if (options.timestamp) {
        model.orderByChild('created_on').equalTo(null).on('child_added', function(snap) {
          return snap.ref().child('created_on').set(new Date().getTime());
        });
      }
      if (options.initialize) {
        model.orderByChild('is_initialized').equalTo(null).on('child_added', function(snap) {
          console.log('initializing', snap.ref().key());
          options.initialize(snap);
          return snap.ref().child('is_initialized').set(new Date().getTime());
        });
      }
      ref = options.triggers;
      for (trigger_field in ref) {
        trigger_function = ref[trigger_field];
        model.orderByChild(trigger_field).equalTo(true).on('child_added', function(snap) {
          var rec;
          rec = snap.val();
          if (!rec[trigger_field + '_triggered']) {
            return snap.ref().child(trigger_field + '_triggered').transaction(function(old_val) {
              trigger_function(snap);
              return true;
            });
          }
        });
      }
      ref1 = options.counters;
      for (counter_name in ref1) {
        counter_options = ref1[counter_name];
        startCounterHandler(model, counter_name, counter_options);
      }
      ref2 = options.composites;
      results = [];
      for (composite_name in ref2) {
        composite_fields = ref2[composite_name];
        results.push(startCompositeHandler(model, composite_name, composite_fields));
      }
      return results;
    };
    return model;
  };
}).service('startCompositeHandler', function() {
  return function(model, composite_name, fields) {
    var update_handler;
    console.log.apply(console, ['COMPOSITE: adding index builder to', model.key(), 'named', composite_name, 'with fields'].concat(slice.call(fields)));
    update_handler = function(snap) {
      var f, new_composite_value, rec;
      rec = snap.val();
      new_composite_value = ((function() {
        var i, len, results;
        results = [];
        for (i = 0, len = fields.length; i < len; i++) {
          f = fields[i];
          results.push(rec[f] || 'false');
        }
        return results;
      })()).join('|');
      if (rec[composite_name] !== new_composite_value) {
        return snap.ref().child(composite_name).set(new_composite_value);
      }
    };
    model.on('child_added', update_handler);
    return model.on('child_changed', update_handler);
  };
}).service('startCounterHandler', function(updateAllTargetCounters, getTargetRefs, updateTargetCounter) {
  return function(model, counter_name, counter_options) {
    var counted_old_field, field, query, ref, remove_handler, update_handler, value;
    counted_old_field = counter_name + '_counted';
    console.log('COUNTER: adding to', model.key(), 'named', counter_name, 'countif', counter_options.countIf);
    update_handler = function(snap, evtname) {
      var count_value_new, rec;
      rec = snap.val();
      count_value_new = counter_options.total ? rec[counter_options.total] || 0 : 1;
      return snap.ref().child(counter_name + '_counted').transaction(function(count_value_old) {
        return updateAllTargetCounters(counter_name, counter_options.target, rec, count_value_old, count_value_new);
      });
    };
    remove_handler = function(snap) {
      var rec;
      rec = snap.val();
      updateAllTargetCounters(counter_name, counter_options.target, rec, rec[counter_name + '_counted'], 0);
      return snap.ref().child(counter_name + '_counted').remove();
    };
    query = counter_options.countIf ? ((ref = counter_options.countIf, field = ref[0], value = ref[1], ref), model.orderByChild(field).equalTo(value)) : model;
    query.on('child_added', function(snap) {
      return setTimeout((function() {
        return update_handler(snap, 'added');
      }), 0);
    });
    query.on('child_changed', function(snap) {
      return setTimeout((function() {
        return update_handler(snap, 'changed');
      }), 0);
    });
    return query.on('child_removed', function(snap) {
      return setTimeout((function() {
        return remove_handler(snap);
      }), 0);
    });
  };
}).service('updateAllTargetCounters', function(updateTargetCounter, getTargetRefs) {
  return function(counter_name, target, rec, count_value_old, count_value_new) {
    var delta, i, len, ref, target_ref;
    delta = count_value_new - count_value_old;
    if (delta !== 0) {
      ref = getTargetRefs(target, rec);
      for (i = 0, len = ref.length; i < len; i++) {
        target_ref = ref[i];
        setTimeout((function() {
          return updateTargetCounter(target_ref, counter_name, delta);
        }), 0);
      }
    }
    return count_value_new;
  };
}).service('updateTargetCounter', function() {
  return function(target_ref, counter_name, delta) {
    return target_ref.child(counter_name).transaction(function(current_counter) {
      console.log('updating counter', target_ref.key(), counter_name, current_counter, delta);
      return current_counter + delta;
    });
  };
}).service('getTargetRefs', function() {
  return function(target, rec) {
    var targetRef, targetRefs;
    targetRef = (typeof target === 'function') && target(rec) || target;
    return targetRefs = targetRef.length && targetRef || [targetRef];
  };
});

var di, extend;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

extend = typeof window !== 'undefined' ? window.angular.extend : require('extend');

di.module('pong-base').service('$encodeKey', function() {
  return function(key) {
    return encodeURIComponent(key).replace(/\./g, '%2E');
  };
}).service('$promise', [
  '$q', function($q) {
    return function(fn) {
      var d;
      d = $q.defer();
      fn(d);
      return d.promise;
    };
  }
]).service('$model', [
  '$encodeKey', '$promise', function($encodeKey, $promise) {
    return function(fbRef, options) {
      var decorate;
      if (options == null) {
        options = {};
      }
      decorate = function(ref) {
        ref.promise = {
          push: function(obj) {
            return $promise(function(d) {
              var newRef;
              return newRef = ref.push(obj, function() {
                return d.resolve(decorate(newRef));
              });
            });
          },
          get: function(idx_or_key, key_for_idx) {
            var query;
            query = idx_or_key && key_for_idx ? ref.orderByChild(idx_or_key).equalTo(key_for_idx) : idx_or_key && !key_for_idx ? ref.orderByKey().equalTo(idx_or_key) : ref;
            return $promise(function(d) {
              return query.once('value', d.resolve);
            });
          },
          getFirst: function(idx_or_key, key_for_idx) {
            return ref.promise.get(idx_or_key, key_for_idx).then(function(snap) {
              var key, rec, val;
              rec = snap.val();
              key = Object.keys(rec)[0];
              val = rec[key];
              val.$id = key;
              return val;
            });
          }
        };
        ref.buildQuery = function(byChild, withValue, limitTo) {
          var query;
          if (typeof withValue === 'object') {
            withValue = withValue.join('|');
          }
          query = byChild && ref.orderByChild(byChild) || ref.orderByKey();
          if (withValue) {
            query = query.equalTo(withValue);
          }
          if (!(withValue || byChild || limitTo)) {
            query = query.equalTo('SINGLE');
          }
          return query = query.limitToFirst(limitTo || 1);
        };
        ref.single = function() {
          return fbRef.child('SINGLE');
        };
        extend(ref, options.methods);
        return ref;
      };
      return decorate(fbRef);
    };
  }
]);
