'use strict';
let path    = require('path');
let _       = require('lodash');
let cheerio = require('cheerio');

module.exports = function(grunt) {
  let NONWORD_LIST = [
    'all', 'among', 'an', 'and', 'are', 'as', 'attempt', 'attempting', 'be', 'between', 'by', 'called', 'can', 'cannot', 'class', 'common',
    'could', 'defines', 'defined', 'define', 'did', 'did\'t', 'does', 'doesn\'t', 'each', 'etc', 'even', 'false', 'first', 'for', 'from', 'get', 'give',
    'gives', 'go', 'gone', 'has', 'have', 'had', 'haven\'t', 'i.e.', 'if', 'implement', 'in', 'io', 'I/O', 'into', 'is', 'it', 'its', 'last', 'least',
    'may', 'most', 'must', 'not', 'of', 'on', 'one', 'onto', 'or', 'over', 'represents', 'such', 'so', 'see', 'some', 'support', 'supports', 'take',
    'takes', 'that', 'the', 'them', 'then', 'there', 'these', 'this', 'those', 'though', 'to', 'too', 'true', 'two', 'type', 'under', 'use', 'used',
    'uses', 'useful', 'usefully', 'via', 'was', 'wasn\'t', 'well', 'well-known', 'what', 'what\'s', 'when', 'whenever', 'where', 'which', 'while', 'who',
    'whose', 'will', 'won\'t', 'why', 'with', 'you', 'your' ];
  let siteIndex = {};

  function addToIndex(text, pagePath, closestId) {
    text = text.replace(/[\r\n\t]/g, ' ');

    text.split(' ').forEach(function(word) {
      word = word.toLowerCase().trim();
      if (word.length > 1 && !_.includes(NONWORD_LIST, word)) {
        if (siteIndex[word]) { // first occurence found in entire site
         let page = _.find(siteIndex[word], {'pagePath': pagePath});
          if (page) { // word was already found on this page
            let location = _.find(page.locations, {'closestId': closestId});
            if (location) { // word was already found within the same element
              location.occurences++;
            } else { // word was already found on this page, but in a different element
              page.locations.push({
                'closestId': closestId,
                'occurences': 1
              });
            }
          } else { // word was already found, but on a different page
            siteIndex[word].push({
              'pagePath': pagePath,
              'locations': [{
                'closestId': closestId,
                'occurences': 1
              }]
            });
          }
        } else {
           siteIndex[word] = [
            {
              'pagePath': pagePath,
              'locations': [{
                'closestId': closestId,
                'occurences': 1
              }]
            }
          ];
        }
      }
    });
  }

  /**
   * Figure out what fonts are being used in all the html pages and output their @font-face definitions to /build/content/styles/fonts.css
   */

  grunt.registerMultiTask('createindex', 'generates js index for the given files', function() {
    let websiteRoot = grunt.config.get('createindex.build.root');

    // getting all html pages from website
    this.files.forEach(function(file) {
      grunt.log.writeln('Processing ' + file.src.length + ' files.');

      //file.src is the list of all matching file names.
      file.src.forEach(function(pagePath){
        // Sort all elements by depth (descending)
        // Get text from each element, and delete from document

        console.log('Indexing page: ' + pagePath);
        let html         = grunt.file.read(pagePath);
        let $            = cheerio.load(html);
        let $elements    = $('body *');
        let elementInfos = [];

        // Get the depth and closest id for each element
        $elements.each(function(index, element) {
          let $element     = $(element);
          let elementDepth = $element.parents().length;
          let closestId    = $element.closest('[id]').attr('id');
          elementInfos.push({
            element: $element,
            depth: elementDepth,
            closestId: closestId
          });
        });

        _.orderBy(elementInfos, 'elementDepth', 'desc');
        elementInfos.forEach(function(elementInfo) {
          elementInfo.element.children().remove();
          addToIndex(elementInfo.element.text(), pagePath, elementInfo.closestId);
        });
      });
    });

    // Output the create search index to file
    grunt.file.write(grunt.config.get('createindex.build.dest'), 'searchIndex = ' + JSON.stringify(siteIndex) + ';');
  });
};
