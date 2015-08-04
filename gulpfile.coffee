gulp = require 'gulp'
gutil = require 'gulp-util'
mocha = require 'gulp-mocha'
server = require 'gulp-develop-server'
livereload = require 'gulp-livereload'
watch = require 'gulp-watch'
bowerFiles = require 'main-bower-files'
inject = require 'gulp-inject'
coffee = require 'gulp-coffee'
concat = require 'gulp-concat'
karma = require('karma').Server

compile_coffeescript = (src_paths,dest_name,dest='./')->
	gulp.src src_paths, {base: './'}
	.pipe coffee({bare:true}).on('error', gutil.log)
	.pipe concat dest_name
	.pipe gulp.dest dest

BROWSER_FILES = ['./browser/*.src.coffee', './shared/*.src.coffee']
BROWSER_SPECS = ['./browser/*.spec.coffee', './shared/*.spec.coffee']
NODE_FILES = ['./node/*.src.coffee', './shared/*.src.coffee']
NODE_SPECS = ['./node/*.spec.coffee', './shared/*.spec.coffee']
APP_FILES = ['./test/site/app/*.coffee']

gulp.task 'default', ['tdd']

# watches all node/browser/shared files and consantly compiles and runs tests
gulp.task 'tdd', ['browser:tdd', 'node:tdd' ]

gulp.task 'browser:tdd', ['browser:test'], ->
	gulp.watch BROWSER_FILES + BROWSER_SPECS, ['browser:test']

gulp.task 'browser:test', ['browser:compile'], (done)->
	new karma {configFile: __dirname + '/karma.conf.js', singleRun: true}, done
	.start()

gulp.task 'browser:compile', ->
	compile_coffeescript BROWSER_FILES, 'browser.js'
	compile_coffeescript BROWSER_SPECS, 'browser-specs.js'

gulp.task 'node:tdd', ['node:test'], ->
	gulp.watch NODE_FILES + NODE_SPECS, ['node:test']

gulp.task 'node:test', ['node:compile'], ->
	gulp.src ['./node/*.spec.coffee'], {read:false}
	.pipe mocha()	

gulp.task 'node:compile', ->
	compile_coffeescript NODE_FILES, 'node.js'

# runs a dev server w livereload on 9000
gulp.task 'serve', ['server:seed'], ->
	server.listen {path: './test/site/listen.coffee'}, livereload.listen
	gulp.watch [BROWSER_FILES..., BROWSER_SPECS..., NODE_FILES..., NODE_SPECS..., APP_FILES...], ['server:build']
	gulp.watch ['./test/site/public/*']
	.on 'change', (file)->
		server.changed (err)->
			unless err then livereload.changed(file.path)

gulp.task 'server:seed', ['server:build'], ->
	require('child_process').exec 'coffee test/fixtures/seed.coffee', (stdout,stderr,err)->
		if stdout && stdout.split
			stdout = stdout.split '\n'
			gutil.log l for l in stdout
		else gutil.log stdout
		if stderr && stderr.split
			stderr = stderr.split '\n'
			gutil.log l for l in stderr
		else gutil.log stderr
		if err then gutil.log err

gulp.task 'server:build', ['browser:test', 'node:test', 'server:compile', 'server:inject'], ->
	gulp.src ['./browser.js', './test/site/app/app.js']
	.pipe concat 'index.js'
	.pipe gulp.dest './test/site/public'

gulp.task 'server:compile', ->
	compile_coffeescript APP_FILES, 'app.js', './test/site/app'

gulp.task 'server:inject', ->
	testSiteFiles = bowerFiles( {paths: './test/site'} )
	gulp.src './test/site/public/index.html', {base: './'}
	.pipe inject(gulp.src(testSiteFiles, {read:false}), {name:'bower', relative:true})
	.pipe gulp.dest '.'
