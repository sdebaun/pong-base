// Generated by CoffeeScript 1.9.2
(function() {
  var pongular,
    slice = [].slice;

  pongular = require('pongular').pongular;

  pongular.module('pong-base', []).service('$firebase', function() {
    var Firebase;
    Firebase = require('firebase');
    return function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Firebase, args, function(){});
    };
  }).service('$q', function() {
    return require('q');
  }).service('$encodeKey', function() {
    return function(key) {
      return encodeURIComponent(key).replace(/\./g, '%2E');
    };
  }).service('$promise', function($q) {
    return function(fn) {
      var d;
      d = $q.defer();
      fn(d);
      return d.promise;
    };
  }).service('$pb', function($firebase, $promise) {
    var PromiseBase;
    PromiseBase = (function() {
      function PromiseBase(path_or_fb) {
        this.path_or_fb = path_or_fb;
        this.fb = (typeof this.path_or_fb === 'string') && $firebase(this.path_or_fb) || this.path_or_fb;
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

      PromiseBase.prototype.child = function(name) {
        return new PromiseBase(this.fb.child(name));
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
  }).service('$model', function($encodeKey, indexer) {
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
        return this.index(key).child($encodeKey(val)).once().then((function(_this) {
          return function(snap) {
            var k, ref, results, v;
            ref = snap.val();
            results = [];
            for (k in ref) {
              v = ref[k];
              results.push(_this.all().child(k));
            }
            return results;
          };
        })(this));
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
  }).service('indexer', function($encodeKey) {
    var Indexer;
    return Indexer = (function() {
      function Indexer(model1, field1) {
        this.model = model1;
        this.field = field1;
      }

      Indexer.prototype.update = function(snap) {
        var index_key;
        index_key = $encodeKey(snap.val()[this.field]);
        return this.model.index(this.field).child(index_key).child(snap.ref().key()).set(true);
      };

      Indexer.prototype.start = function() {
        return this.model.all().on('child_added', (function(_this) {
          return function(snap) {
            return _this.update(snap);
          };
        })(this));
      };

      return Indexer;

    })();
  }).service('$watch', function() {
    return function(model) {
      var i, indexer, len, ref, results;
      ref = model.indexers;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        indexer = ref[i];
        indexer.start();
        results.push(console.log('started index watcher for', indexer.model.name(), indexer.field));
      }
      return results;
    };
  });

}).call(this);