'use strict';
import * as _ from 'lodash';
import * as cheerio from 'cheerio';
import {ISearchPageResult} from '../test-website/script/search_index_manager';
import IFileMap = grunt.file.IFileMap;

require('cheerio-get-css-selector').init();

interface IElementInfo {
  element: Cheerio;
  depth: number;
  elementSelector: string;
}

module.exports = function(grunt: IGrunt) {
  let NONWORD_LIST = [
    'all', 'among', 'an', 'and', 'are', 'as', 'attempt', 'attempting', 'be', 'between', 'by', 'called', 'can', 'cannot', 'class', 'common',
    'could', 'defines', 'defined', 'define', 'did', 'did\'t', 'does', 'doesn\'t', 'each', 'etc', 'even', 'false', 'first', 'for', 'from', 'get', 'give',
    'gives', 'go', 'gone', 'has', 'have', 'had', 'haven\'t', 'i.e.', 'if', 'implement', 'in', 'io', 'I/O', 'into', 'is', 'it', 'its', 'last', 'least',
    'may', 'most', 'must', 'not', 'of', 'on', 'one', 'onto', 'or', 'over', 'represents', 'such', 'so', 'see', 'some', 'support', 'supports', 'take',
    'takes', 'that', 'the', 'them', 'then', 'there', 'these', 'this', 'those', 'though', 'to', 'too', 'true', 'two', 'type', 'under', 'use', 'used',
    'uses', 'useful', 'usefully', 'via', 'was', 'wasn\'t', 'well', 'well-known', 'what', 'what\'s', 'when', 'whenever', 'where', 'which', 'while', 'who',
    'whose', 'will', 'won\'t', 'why', 'with', 'you', 'your' ];
  let siteIndex: {[searchWord: string]: ISearchPageResult[]} = {};

  function addToIndex(text: string, pagePath: string, elementSelector: string) {
    text = text.replace(/[\r\n\t]/g, ' ');

    text.split(' ').forEach(function(word: string) {
      word = word.toLowerCase().trim();
      if (word.length > 1 && !_.includes(NONWORD_LIST, word)) {
        if (siteIndex[word]) { // first occurrence found in entire site
         let page = _.find(siteIndex[word], {'pagePath': pagePath});
          if (page) { // word was already found on this page
            let location = _.find(page.locations, {'elementSelector': elementSelector});
            if (location) { // word was already found within the same element
              location.occurrences++;
            } else { // word was already found on this page, but in a different element
              page.locations.push({
                'elementSelector': elementSelector,
                'occurrences': 1
              });
            }
          } else { // word was already found, but on a different page
            siteIndex[word].push({
              'pagePath': pagePath,
              'locations': [{
                'elementSelector': elementSelector,
                'occurrences': 1
              }]
            });
          }
        } else {
           siteIndex[word] = [
            {
              'pagePath': pagePath,
              'locations': [{
                'elementSelector': elementSelector,
                'occurrences': 1
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
    let websiteRoot = String(grunt.config.get('createindex.build.root'));

    // getting all html pages from website
    this.files.forEach(function(file: IFileMap) {
      grunt.log.writeln('Processing ' + file.src.length + ' files.');

      // file.src is the list of all matching file names.
      file.src.forEach(function(pagePath){
        // Sort all elements by depth (descending)
        // Get text from each element, and delete from document

        console.log('Indexing page: ' + pagePath);
        let html                         = grunt.file.read(pagePath);
        let $                            = cheerio.load(html);
        let $elements: Cheerio           = $('body *');
        let elementInfos: IElementInfo[] = [];

        // Get the depth and closest id for each element
        $elements.each(function(index: number, element: CheerioElement) {
          let $element: Cheerio     = $(element);
          let elementDepth = $element.parents().length;

          elementInfos.push({
            element: $element,
            depth: elementDepth,
            elementSelector: (<any>cheerio).getUniqueSelector($element)
          });
        });

        _.orderBy(elementInfos, 'elementDepth', 'desc');
        elementInfos.forEach(function(elementInfo) {
          elementInfo.element.children().remove();
          addToIndex(elementInfo.element.text(), pagePath.substring(websiteRoot.length), elementInfo.elementSelector);
        });
      });
    });

    // Output the create search index to file
    grunt.file.write(String(grunt.config.get('createindex.build.dest')), JSON.stringify(siteIndex));
  });
};
