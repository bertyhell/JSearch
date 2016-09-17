module.exports = function(grunt) {
  grunt.initConfig({
    createindex: {
      build: {
        root: './test-website',
        src: './test-website/**/*.htm',
        dest: './test-website/search_index.js'
      }
    }
  });
  grunt.loadTasks('./tasks');
  grunt.registerTask('default', ['createindex:build']);

};