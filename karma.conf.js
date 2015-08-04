// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],
    browsers: ['PhantomJS'],

    files: [
      'test/site/bower_components/angular/angular.js',
      'test/site/bower_components/angularfire/dist/angularfire.js',
      'test/site/bower_components/firebase/firebase.js',
      'browser.js',
      'browser-specs.js'
    ]
  });
};