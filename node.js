var pongular;

pongular = require('pongular').pongular;

pongular.module('pong-base', []).service('Firebase', function() {
  return require('firebase');
}).service('$q', function() {
  return require('q');
}).service('$modelManager', function(startCounterHandler) {
  return function(model, options) {
    model.listen = function() {
      var counter_name, counter_options, ref, results;
      console.log('listening to', model.key());
      if (options.timestamp) {
        model.orderByChild('created_on').equalTo(null).on('child_added', function(snap) {
          console.log('timestamp on', snap.ref().key());
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
      ref = options.counters;
      results = [];
      for (counter_name in ref) {
        counter_options = ref[counter_name];
        results.push(startCounterHandler(model, counter_name, counter_options));
      }
      return results;
    };
    return model;
  };
}).service('startCounterHandler', function(updateAllTargetCounters, getTargetRefs, updateTargetCounter) {
  return function(model, counter_name, counter_options) {
    var counted_old_field, field, query, ref, remove_handler, update_handler, value;
    counted_old_field = counter_name + '_counted';
    console.log('adding counter to', model.key(), 'countif', counter_options.countIf, 'named', counter_name);
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
      updateAllTargetCounters(counter_options.target, rec, rec[counter_name + '_counted'], 0);
      return snap.ref().child(counter_name + '_counted').remove();
    };
    query = counter_options.countIf ? ((ref = counter_options.countIf, field = ref[0], value = ref[1], ref), model.orderByChild(field).equalTo(value)) : model;
    query.on('child_added', function(snap) {
      return update_handler(snap, 'added');
    });
    query.on('child_changed', function(snap) {
      return update_handler(snap, 'changed');
    });
    return query.on('child_removed', remove_handler);
  };
}).service('updateAllTargetCounters', function(updateTargetCounter, getTargetRefs) {
  return function(counter_name, target, rec, count_value_old, count_value_new) {
    var delta, i, len, ref, target_ref;
    delta = count_value_new - count_value_old;
    if (delta !== 0) {
      ref = getTargetRefs(target, rec);
      for (i = 0, len = ref.length; i < len; i++) {
        target_ref = ref[i];
        updateTargetCounter(target_ref, counter_name, delta);
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

var di;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

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
        return ref;
      };
      return decorate(fbRef);
    };
  }
]);
