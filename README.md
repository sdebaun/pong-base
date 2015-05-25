# pong-base
node/pongular module providing firebase promise-wrapping, q sugar, lightweight ORM with indexes

## installation

```bash
$ npm install [THIS REPO URL]
```

update your ```Gruntfile.js``` to make sure shared code ends up in the same place in your ```dist/```.

```
    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.client %>',
          dest: '<%= yeoman.dist %>/public',
          src: [
            '*.{ico,png,txt}',
            '.htaccess',
            'bower_components/**/*',
            'assets/images/{,*/}*.{webp}',
            'assets/fonts/**/*',
            'index.html'
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          dest: '<%= yeoman.dist %>/public/assets/images',
          src: ['generated/*']
        }, {
          expand: true,
          dest: '<%= yeoman.dist %>',
          src: [
            'package.json',
            'client/app/**/*.shared.coffee', // ADD FOR SHARED MODULES ON CLIENT!
            'server/**/*'
          ]
        }]
      },
```