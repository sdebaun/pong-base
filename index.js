var di,
  slice = [].slice;

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
]).service('$pb', [
  'Firebase', '$promise', function(Firebase, $promise) {
    var PromiseBase;
    PromiseBase = (function() {
      function PromiseBase(path_or_fb, indexTo1) {
        this.path_or_fb = path_or_fb;
        this.indexTo = indexTo1;
        this.fb = (typeof this.path_or_fb === 'string') && new Firebase(this.path_or_fb) || this.path_or_fb;
      }

      PromiseBase.prototype.toArray = function() {
        return this.once().then(function(snap) {
          var k, ref, results, v;
          ref = snap.val();
          results = [];
          for (k in ref) {
            v = ref[k];
            results.push(v);
          }
          return results;
        });
      };

      PromiseBase.prototype.key = function() {
        return this.fb.key();
      };

      PromiseBase.prototype.child = function(name, indexTo) {
        return new PromiseBase(this.fb.child(name), indexTo);
      };

      PromiseBase.prototype.on = function() {
        var args, ref;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return (ref = this.fb).on.apply(ref, args);
      };

      PromiseBase.prototype._no_return = function(fname, arg) {
        return $promise((function(_this) {
          return function(d) {
            return _this.fb[fname](arg, function() {
              return d.resolve();
            });
          };
        })(this));
      };

      PromiseBase.prototype._no_arg = function(fname) {
        return $promise((function(_this) {
          return function(d) {
            return _this.fb[fname](function() {
              return d.resolve();
            });
          };
        })(this));
      };

      PromiseBase.prototype.push = function(obj) {
        return $promise((function(_this) {
          return function(d) {
            var newref;
            return newref = _this.fb.push(obj, function() {
              return d.resolve(new PromiseBase(newref));
            });
          };
        })(this));
      };

      PromiseBase.prototype.once = function() {
        return $promise((function(_this) {
          return function(d) {
            return _this.fb.once('value', function(snap) {
              return d.resolve(snap);
            });
          };
        })(this));
      };

      PromiseBase.prototype.remove = function() {
        return this._no_arg('remove');
      };

      PromiseBase.prototype.set = function(val) {
        return this._no_return('set', val);
      };

      PromiseBase.prototype.update = function(obj) {
        return this._no_return('update', obj);
      };

      PromiseBase.prototype.lookup = function() {
        if (!this.indexTo) {
          throw 'A promisebase must be created via "by" to be able to lookup with it';
        }
        return this.once().then((function(_this) {
          return function(snap) {
            var k, ref, results, v;
            ref = snap.val();
            results = [];
            for (k in ref) {
              v = ref[k];
              results.push(_this.indexTo.child(k));
            }
            return results;
          };
        })(this));
      };

      return PromiseBase;

    })();
    return function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(PromiseBase, args, function(){});
    };
  }
]).service('$model', [
  '$encodeKey', 'indexer', function($encodeKey, indexer) {
    var Model;
    Model = (function() {
      function Model(root, index_fields) {
        var field;
        this.root = root;
        this.index_fields = index_fields;
        this.indexers = (function() {
          var i, len, ref, results;
          ref = this.index_fields;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            field = ref[i];
            results.push(new indexer(this, field));
          }
          return results;
        }).call(this);
      }

      Model.prototype.name = function() {
        return this.root.key();
      };

      Model.prototype.all = function() {
        return this.root.child('all');
      };

      Model.prototype.index = function(key) {
        return this.root.child('by').child(key);
      };

      Model.prototype.by = function(key, val) {
        return this.index(key).child($encodeKey(val), this.all());
      };

      Model.prototype.byKey = function(key) {
        return this.all().child($encodeKey(key));
      };

      return Model;

    })();
    return function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Model, args, function(){});
    };
  }
]).service('indexer', [
  '$encodeKey', function($encodeKey) {
    var Indexer;
    return Indexer = (function() {
      function Indexer(model, field1) {
        this.model = model;
        this.field = field1;
      }

      Indexer.prototype.addIndexItem = function(index_key, item_key) {
        return this.model.index(this.field).child($encodeKey(index_key)).child(item_key).set(true);
      };

      Indexer.prototype.removeIndexItem = function(index_key, item_key) {
        return this.model.index(this.field).child($encodeKey(index_key)).child(item_key).remove();
      };

      Indexer.prototype.update = function(snap) {
        var item_key, new_index_key, old_index_key, rec;
        rec = snap.val();
        new_index_key = rec[this.field];
        old_index_key = rec[this.field + "_old"];
        item_key = snap.ref().key();
        if ((typeof new_index_key === 'null') || (new_index_key === old_index_key)) {
          return;
        }
        this.addIndexItem(new_index_key, item_key);
        this.removeIndexItem(old_index_key, item_key);
        return snap.ref().child(this.field + "_old").set(new_index_key);
      };

      Indexer.prototype.remove = function(snap) {
        var old_index_key;
        old_index_key = snap.val()[this.field];
        if (typeof old_index_key === 'null') {
          return;
        }
        return this.removeIndexItem(old_index_key, snap.ref().key());
      };

      Indexer.prototype.start = function() {
        this.model.all().on('child_added', (function(_this) {
          return function(snap) {
            return _this.update(snap);
          };
        })(this));
        this.model.all().on('child_changed', (function(_this) {
          return function(snap) {
            return _this.update(snap);
          };
        })(this));
        return this.model.all().on('child_removed', (function(_this) {
          return function(snap) {
            return _this.remove(snap);
          };
        })(this));
      };

      return Indexer;

    })();
  }
]);
