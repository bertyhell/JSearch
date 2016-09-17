using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Windows;
using Ookii.Dialogs.Wpf;

namespace InvertedFileIndexer
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window, INotifyPropertyChanged
    {

        public MainWindow()
        {
            InitializeComponent();

            //string Text = File.ReadAllText(@"search_styles.css");
            //SaveTextToFile(new CodeColorizer().Colorize(Text, Languages.Css), "search_example_css_highlight.html");
            cssBrowser.Source = new Uri(Path.GetFullPath("search_example_css_highlight.html"));

            //string Text = File.ReadAllText(@"search_example_html.txt");
            //SaveTextToFile(new CodeColorizer().Colorize(Text, Languages.Html), "search_example_html_highlight.html");
            htmlBrowser.Source = new Uri(Path.GetFullPath("search_example_html_highlight.html"));

            jsBrowser.Source = new Uri(Path.GetFullPath("websiteroot"));


            DataContext = this;
        }

        private void BtnGenerateIndexClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                if (Directory.Exists(txtWebsitePath.Text))
                {
                    IndexManager.AddWebsiteToIndex(txtWebsitePath.Text, txtFileTypes.Text); //TODO 060 validate textbox with extensions to see if its invalid
                    //TODO 030 store all inputfields in settingsfile for next use
                    OnPropertyChanged("IsIndexGenerated");
                    MessageBox.Show("The index has been generated. Indexed " + IndexManager.NumberOfIndexedFiles + " pages. \nIndex contains " + IndexManager.NumberOfIndexedWords + " words.");
                    txtSearchTerm.Focus();
                }
                else
                {
                    MessageBox.Show("Selected directory doesn't exist", "Error");
                }
            }
            catch (UnauthorizedAccessException Ex)
            {
                MessageBox.Show("Error: " + Ex.Message, "No access", MessageBoxButton.OK, MessageBoxImage.Error, MessageBoxResult.OK);
            }
        }

        private List<SearchResult> _searchResults;

        public List<SearchResult> SearchResults
        {
            get { return _searchResults; }
            set
            {
                _searchResults = value;
                OnPropertyChanged("SearchResults");
            }
        }

        public bool IsIndexGenerated
        {
            get { return IndexManager.IsIndexGenerated; }
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged(string propertyName)
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, new PropertyChangedEventArgs(propertyName));
            }
        }

        private void BtnBrowserClicked(object sender, RoutedEventArgs e)
        {
            var Fbd = new VistaFolderBrowserDialog { Description = "Please select the Website directory", UseDescriptionForTitle = true, SelectedPath = Environment.SpecialFolder.MyComputer.ToString() };
            var Dialog = Fbd.ShowDialog(this);
            if (Dialog != null && (bool)Dialog)
            {
                txtWebsitePath.Text = Fbd.SelectedPath;
            }
        }

        private void SearchTermChanged(object sender, System.Windows.Input.KeyEventArgs e)
        {
            SearchResults = IndexManager.Search(txtSearchTerm.Text);
        }

        public void SaveTextToFile(string strData, string fullPath)
        {
            StreamWriter ObjReader = new StreamWriter(fullPath);
            ObjReader.Write(strData);
            ObjReader.Close();
        }


    }
}
