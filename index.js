var needle   = require('needle'),
    cheerio  = require('cheerio'),
    async    = require('async'),
    http     = require('http'),
    request  = require('request'),
    readline = require('readline');

var newsUrl = 'https://www.057.ua/news',
    rssURL  = 'https://www.057.ua/rss',
    news    = [],
    links   = [];

var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('Input quantity of news what you want to parse: ');
rl.prompt();

rl.on('line', function(line) {
    if (Number(line) && line > 0) {
        console.log('Start parsing...');
        parseNews(line);
    } else {
        rl.prompt();
    }
}).on('close',function(){
    process.exit(0);
});

/**
 * This function get news links by quantity(parameter count) from RSS and make them parsing
 * @param count
 */
function parseNews(count)
{
    needle.get(newsUrl, function (err, res) {
        if (err) throw err;

        if (res.statusCode !== 200) return false;

        request(rssURL, function (error, response, html) {
            if (!error && response.statusCode === 200) {

                //Loading RSS page
                var $ = cheerio.load(html, {
                    xmlMode: true
                });

                //Taking links and push them to array 'links'
                $('item').each(function (key, value) {
                    if (key === count) return false;

                    links.push($(this).find('link').text());
                });

                //Depending from count we do async parse each article
                async.times(count, function (i, cb) {
                    request(links[i], function (error, response, page) {
                        if (!error && response.statusCode === 200) {

                            //Loading HTML page
                            var $ = cheerio.load(page);

                            //Taking main image, if exist
                            var image = $('.article-photo--main').html();
                            if (image === undefined) {
                                image = null;
                            }

                            $('.io-article-body .col-xs-12.col-sm-3').remove();

                            news.push({
                                'title': $('.title-container.inner-title').html(), //Taking article title
                                'image': image,
                                'text' : $('.io-article-body').html(),             //Taking all article text
                                'link' : links[i]                                  //Link for article
                            });
                            cb(null, news);
                        }
                    });
                }, function (err) {
                    createDOM(news);
                });
            }
        });
    });
}

/**
 * This function make DOM-tree for news
 * @param news
 */
function createDOM(news)
{
    var html =
        '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<meta charset="UTF-8">' +
        '<title>Result of parsing https://www.057.ua/news</title>' +
        '<body>' +
            '<h2 style="text-align: center">Новости</h2>' +
            '<div>'
    ;

    //Added each new to html variable
    for(var item in news) {
        if (!news.hasOwnProperty(item)) {
            continue;
        }

        html += news[item]['title'];

        if (news[item]['image'] !== null) {
            html += news[item]['image'];
        }

        html += news[item]['text'];
        html +=
            '<p>Cсылка на статью: <a href="' + news[item]['link'] + '">' + news[item]['link'] + '</a></p>';
        html += '<p>======================================================================================';
        html += '=====================================================================================</p>';
    }

    html +=
        '</div>' +
        '</body>' +
    '</html>';


    http.createServer(function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        res.write(html);
        res.end();
    }).listen(8888, '127.0.0.1');
    console.log('Server running at http://127.0.0.1:8888');
}

