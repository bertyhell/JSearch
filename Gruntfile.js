module.exports = function(grunt) {
  grunt.initConfig({
    createindex: {
      build: {
        root: './test-website',
        src: './test-website/**/*.htm',
        dest: './test-website/script/search_index.json'
      }
    }
  });
  grunt.loadTasks('./tasks');
  grunt.registerTask('default', ['createindex:build']);

};