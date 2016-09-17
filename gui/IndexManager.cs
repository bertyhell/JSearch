using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Windows;
using Newtonsoft.Json;

namespace InvertedFileIndexer
{
    /**
 * This terminal application creates an Apache Lucene index in a folder and adds files into this index
 * based on the input of the user.
 */
    class IndexManager
    {
        //TODO 070 add filename to important strings
        //TODO 080 allow partial search

        private static Dictionary<string, Dictionary<string, int>> _index;
        private static readonly String[] NONWORD_LIST = { "all", "among", "an", "and", "are", "as", "attempt", "attempting", "be", "between", "by", "called", "can", "cannot", "class", "common", "could", "defines", "defined", "define", "did", "did't", "does", "doesn't", "each", "etc", "even", "false", "first", "for", "from", "get", "give", "gives", "go", "gone", "has", "have", "had", "haven't", "i.e.", "if", "implement", "in", "io", "I/O", "into", "is", "it", "its", "last", "least", "may", "most", "must", "not", "of", "on", "one", "onto", "or", "over", "represents", "such", "so", "see", "some", "support", "supports", "take", "takes", "that", "the", "them", "then", "there", "these", "this", "those", "though", "to", "too", "true", "two", "type", "under", "use", "used", "uses", "useful", "usefully", "via", "was", "wasn't", "well", "well-known", "what", "what's", "when", "whenever", "where", "which", "while", "who", "whose", "will", "won't", "why", "with", "you", "your" };
        //private static Dictionary<string, int> _pageLengths;
       
        public static void AddWebsiteToIndex(string directory, string fileTypes)
        {
                _index = new Dictionary<string, Dictionary<string, int>>();
                //_pageLengths = new Dictionary<string, int>();
                //TODO 040 add more file types like asp en jsp
                foreach (var Path in Directory.GetFiles(directory, "*.*", SearchOption.AllDirectories))
                {
                    foreach (string Extension in fileTypes.Split(','))
                    {
                        if (Path.EndsWith(Extension))
                        {
                            AddFileToIndex(directory, Path);
                            NumberOfIndexedFiles++;
                            break;
                        }
                    }
                }
                GenerateJsonIndexFiles();
        }

        public static bool IsIndexGenerated
        {
            get { return _index != null; }
        }

        public static int NumberOfIndexedFiles { get; set; }

        public static int NumberOfIndexedWords
        {
            get { return _index.Count; }
        }

        private static void AddFileToIndex(string directory, string path)
        {
            string FileContent = ReadFile(path);
            string TextContent = RemoveHtmlTags(FileContent);

            String RelativePath = path.Substring(directory.Length + 1, path.Length - directory.Length - 1).Replace('\\', '/');//store relative path to pages --> less size
            //_pageLengths.Add(RelativePath, TextContent.Length);
            AddToIndex(TextContent, RelativePath);
        }

        private static void AddToIndex(string textContent, string filepath)
        {
            //int WordLocation = 0;
            foreach (string Word in textContent.Split(' '))
            {
                if (Word.Length > 1 && !NONWORD_LIST.Contains(Word))
                {
                    string LowerWord = Word.ToLower();
                    if (!_index.ContainsKey(LowerWord))
                    {
                        //add record for this word
                        _index.Add(LowerWord, new Dictionary<string, int>());
                    }
                    //add word location to existing record
                    if (!_index[LowerWord].ContainsKey(filepath))
                    {
                        //add new record for this file
                        _index[LowerWord].Add(filepath, 0);
                    }
                    //add word location
                    //INDEX[LowerWord][filepath].Locations.Add(WordLocation);
                    _index[LowerWord][filepath]++;

                }
                //WordLocation += Word.Length + 1; //wordlength + space
            }
        }

        private static string ReadFile(string path)
        {
            string Line;
            string FileContent = "";
            StreamReader Reader = new StreamReader(path);
            while ((Line = Reader.ReadLine()) != null)
            {
                FileContent += Line;
            }
            Reader.Close();
            return FileContent;
        }

        private static string RemoveHtmlTags(string source)
        {
            //TODO 070 check meta tags for keywords and description before removing tags
            Regex RemoveJs = new Regex("<script.*?>.*?</script>");//remove embedded scripts
            source = RemoveJs.Replace(source, "");
            Regex RemoveCss = new Regex("<style.*?>.*?</style>");//remove embedded styles
            source = RemoveCss.Replace(source, "");
            char[] Array = new char[source.Length];
            int ArrayIndex = 0;
            bool Inside = false;

            foreach (char Let in source)
            {
                if (Let == '<')
                {
                    Array[ArrayIndex] = ' ';//add space where tags where --> avoid string concats
                    ArrayIndex++;
                    Inside = true;
                    continue;
                }
                if (Let == '>')
                {
                    Inside = false;
                    continue;
                }
                if (!Inside)
                {
                    Array[ArrayIndex] = Let;
                    ArrayIndex++;
                }
            }
            string NoHtml = new string(Array, 0, ArrayIndex);
            NoHtml = NoHtml.Replace(',', ' ');//remove punctuations
            NoHtml = NoHtml.Replace('.', ' ');
            NoHtml = NoHtml.Replace(':', ' ');
            NoHtml = NoHtml.Replace('\\', ' ');
            NoHtml = NoHtml.Replace('/', ' ');

            Regex RemoveSpaces = new Regex(@"[\s\t][\s\t]+");
            return RemoveSpaces.Replace(NoHtml, " ");
        }

        public static List<SearchResult> Search(string searchString)
        {
            var Results = new Dictionary<string, int>();//filepath that contains searchterm(s) with total corresponding occurences

            foreach (var SearchWord in searchString.ToLower().Split(' '))
            {
                if (_index.ContainsKey(SearchWord))
                {
                    foreach (var FilePath in _index[SearchWord].Keys)
                    {
                        if (Results.ContainsKey(FilePath))
                        {
                            //found 2+ words on this page --> bonus score 10000
                            //search shortest distance between the words
                            //TODO 080 take in account how close the words are using their position --> store more info when searching for words

                            Results[FilePath] += 10000 + _index[SearchWord][FilePath];
                        }
                        else
                        {
                            Results.Add(FilePath, _index[SearchWord][FilePath]);
                        }
                    }
                }
            }

            //TODO sort files accoriding to match %;
            List<KeyValuePair<string, int>> ListResults = Results.ToList();

            ListResults.Sort(delegate(KeyValuePair<string, int> firstPair, KeyValuePair<string, int> nextPair)
                {
                    return -firstPair.Value.CompareTo(nextPair.Value);
                }
            );

            var ListResultScores = new List<SearchResult>();
            foreach (var KeyValuePair in ListResults)
            {
                ListResultScores.Add(new SearchResult{ FilePath = KeyValuePair.Key, Score = KeyValuePair.Value});
            }

            return ListResultScores;
        }

        private static void GenerateJsonIndexFiles()
        {
            try
            {
                string Json = JsonConvert.SerializeObject(_index);
                StreamWriter Writer = new StreamWriter("websiteroot\\search_index.js");
                Writer.Write("searchIndex = " + Json + ";");
                Writer.Flush();
                Writer.Close();
            }
            catch (Exception)
            {
                throw new NotSupportedException("The website is to large, contact the program designer to fix this if you need this functionality");
                //TODO 090 split index into subfiles --> adjust javascript code to use split up files

                ////split --> index to large for 1 file
                ////split index in 27 parts --> faster loading
                //List<Dictionary<string, Dictionary<string, int>>> AlfabethicWords = new List<Dictionary<string, Dictionary<string, int>>>(27); //26 letters, and others
                //for (int I = 0; I < 27; I++)
                //{
                //    AlfabethicWords.Add(new Dictionary<string, Dictionary<string, int>>());
                //}
                //foreach (string Word in _index.Keys)
                //{
                //    int StartingLetter = (Word[0]) - 'a';
                //    if (StartingLetter < 0 || StartingLetter > 25)
                //    {
                //        StartingLetter = 26;
                //    }
                //    AlfabethicWords[StartingLetter].Add(Word, _index[Word]);
                //}
                //for (int I = 0; I < AlfabethicWords.Count; I++)
                //{
                //    string Chapter = "";
                //    if (I < 26)
                //    {
                //        Chapter += (char)('a' + I);
                //    }
                //    else
                //    {
                //        Chapter += "other";
                //    }
                //    string Json = JsonConvert.SerializeObject(AlfabethicWords[I]);
                //    StreamWriter Writer = new StreamWriter("index_" + Chapter + ".js");
                //    Writer.Write("searchIndex_" + Chapter + " = " + Json + ";");
                //    Writer.Flush();
                //    Writer.Close();
                //}
            }
        }
    }
}
