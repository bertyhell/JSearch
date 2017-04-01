'use strict';
var _ = require('lodash');
var cheerio = require('cheerio');
require('cheerio-get-css-selector').init();
module.exports = function (grunt) {
    var NONWORD_LIST = [
        'all', 'among', 'an', 'and', 'are', 'as', 'attempt', 'attempting', 'be', 'between', 'by', 'called', 'can', 'cannot', 'class', 'common',
        'could', 'defines', 'defined', 'define', 'did', 'did\'t', 'does', 'doesn\'t', 'each', 'etc', 'even', 'false', 'first', 'for', 'from', 'get', 'give',
        'gives', 'go', 'gone', 'has', 'have', 'had', 'haven\'t', 'i.e.', 'if', 'implement', 'in', 'io', 'I/O', 'into', 'is', 'it', 'its', 'last', 'least',
        'may', 'most', 'must', 'not', 'of', 'on', 'one', 'onto', 'or', 'over', 'represents', 'such', 'so', 'see', 'some', 'support', 'supports', 'take',
        'takes', 'that', 'the', 'them', 'then', 'there', 'these', 'this', 'those', 'though', 'to', 'too', 'true', 'two', 'type', 'under', 'use', 'used',
        'uses', 'useful', 'usefully', 'via', 'was', 'wasn\'t', 'well', 'well-known', 'what', 'what\'s', 'when', 'whenever', 'where', 'which', 'while', 'who',
        'whose', 'will', 'won\'t', 'why', 'with', 'you', 'your'];
    var siteIndex = {};
    function addToIndex(text, pagePath, elementSelector) {
        text = text.replace(/[\r\n\t]/g, ' ');
        text.split(' ').forEach(function (word) {
            word = word.toLowerCase().trim();
            if (word.length > 1 && !_.includes(NONWORD_LIST, word)) {
                if (siteIndex[word]) {
                    var page = _.find(siteIndex[word], { 'pagePath': pagePath });
                    if (page) {
                        var location_1 = _.find(page.locations, { 'elementSelector': elementSelector });
                        if (location_1) {
                            location_1.occurrences++;
                        }
                        else {
                            page.locations.push({
                                'elementSelector': elementSelector,
                                'occurrences': 1
                            });
                        }
                    }
                    else {
                        siteIndex[word].push({
                            'pagePath': pagePath,
                            'locations': [{
                                    'elementSelector': elementSelector,
                                    'occurrences': 1
                                }]
                        });
                    }
                }
                else {
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
    grunt.registerMultiTask('createindex', 'generates js index for the given files', function () {
        var websiteRoot = String(grunt.config.get('createindex.build.root'));
        this.files.forEach(function (file) {
            grunt.log.writeln('Processing ' + file.src.length + ' files.');
            file.src.forEach(function (pagePath) {
                console.log('Indexing page: ' + pagePath);
                var html = grunt.file.read(pagePath);
                var $ = cheerio.load(html);
                var $elements = $('body *');
                var elementInfos = [];
                $elements.each(function (index, element) {
                    var $element = $(element);
                    var elementDepth = $element.parents().length;
                    elementInfos.push({
                        element: $element,
                        depth: elementDepth,
                        elementSelector: cheerio.getUniqueSelector($element)
                    });
                });
                _.orderBy(elementInfos, 'elementDepth', 'desc');
                elementInfos.forEach(function (elementInfo) {
                    elementInfo.element.children().remove();
                    addToIndex(elementInfo.element.text(), pagePath.substring(websiteRoot.length), elementInfo.elementSelector);
                });
            });
        });
        grunt.file.write(String(grunt.config.get('createindex.build.dest')), JSON.stringify(siteIndex));
    });
};
//# sourceMappingURL=createindex.js.map