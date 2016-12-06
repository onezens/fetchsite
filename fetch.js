/**
 * Created by Zhen on 2016/11/27.
 */

const cheerio = require('cheerio');
const entities = require('entities');
const https = require('https');
const fs = require('fs');
const path = require('path');

var fetchUrl = 'https://npm.taobao.org/mirrors/node/latest/docs/api/';
var fetchName = 'node_docs'; //保存在本地的目录
var saveDir = './public/'+fetchName;
var urls = null; //初始化,所有的url
var fetchedUrls = null; //抓取过的url
var regex = /\b(?:href="|src=")\b\S*"/g; //g 遍历所有,正则匹配所有
var fetchPointer = 0; //抓取数据索引
var startFetchCount = 20; //第一次启动获取连接的个数

//退出保存信息处理
exitHandler();
//程序初始化处理
initHandler();

//开始抓取
function fetch() {
    console.log('start fetch ...');

    function fetchContent() {
        if(urls.relativeUrls.length == fetchedUrls.length){
            console.log('all source fetched!');
            process.exit();
        }else {
            console.log('urls: ' + urls.relativeUrls.length + ' fetched urls: ' + fetchedUrls.length);
            urls.relativeUrls.forEach(function(match){
                fetchURL(match);
            });
        }
    }

    if(urls.relativeUrls && urls.relativeUrls.length>0){ //有默认值
        fetchContent();
    }else{
        fetchURL('index.html');
    }
}

function fetchURL(furl){
    fetchContentWithUrl(furl);
    function fetchContentWithUrl(url) {
        if(fetchedUrls.indexOf(url) == -1){ //防止重复获取
            var endUrl = getFetchURL(url)
            if(!endUrl) return;

            console.log('start fetch: ' + endUrl);
            https.get(endUrl, function(res){
                if (res.statusCode === 200){
                    var data = null;
                    res.on('data', function(trunk){
                        data += trunk;
                        process.stdout.write('*');
                    });
                    res.on('end', function(){
                        console.log('fetch end');
                        var matches = data.toString().match(regex);
                        var absoluteUrls = urls.absoluteUrls;
                        var relativeUrls = urls.relativeUrls;
                        matches.forEach(function(match){
                            var item = operateFetchURL(match);
                            //完整http路径不处理
                            if(item.indexOf('http://') != -1 || item.indexOf('https://') != -1){
                                if(absoluteUrls.indexOf(item) == -1) absoluteUrls.push(item);
                            }else {
                                if(relativeUrls.indexOf(item) == -1) relativeUrls.push(item);
                            }
                        });

                        saveData(getSaveDir(url), path.basename(endUrl), data.toString(), function(savepath, error){
                            if(!error){
                                var item = operateFetchURL(url);
                                if(fetchedUrls.indexOf(item) == -1) fetchedUrls.push(item);
                            }
                            if(urls.relativeUrls.length == fetchedUrls.length) {
                                console.log('all source fetched!');
                                process.exit();
                            }

                        });
                    });
                }else {
                    console.log(endUrl + " : " + res.statusCode);
                    console.log(JSON.stringify(res.headers));
                }

            });
        }
    }

}


function getSaveDir(url) {
    url = operateFetchURL(url);
    var fileDir = path.join(saveDir, path.dirname(url));
    try {
        fs.statSync(fileDir);
    }catch (error){
        fs.mkdirSync(fileDir);
    }
    return fileDir;
}


function getFetchURL(url){
    if(url.indexOf('http://')!=-1 || url.indexOf('https://')!=-1){
        return null;
    }
    return fetchUrl + operateFetchURL(url);
}

function operateFetchURL(url){

    if(url.indexOf('href="') != -1){
        url = url.replace('href="','').replace('"', '');
    }
    if(url.indexOf('src="') != -1) {
        url = url.replace('src="', '').replace('"', '');
    }
    return url;
}

function saveData(savePath, saveName, data, cb){
    savePath = path.isAbsolute(savePath) ? savePath : path.join(__dirname, savePath);

    try {
        fs.statSync(savePath);
    }catch (error){
        fs.mkdirSync(savePath);
    }
    savePath = path.join(savePath, saveName);

    fs.writeFile(savePath, data, function(err){
        if(err){
            console.log(savePath + "  " + err);
            if(cb) cb(path.join(savePath, saveName),err);
        }else {
            console.log('save success!  ' + savePath);
            if(cb) cb(saveName);
        }
    });
}

function initHandler() {
    var fetchedPath = path.join(__dirname, saveDir, 'fetchedinfo.json');
    var urlsPath = path.join(__dirname, saveDir, 'temp.json');
    var data = fs.readFileSync(fetchedPath).toString();
    var urlsData = fs.readFileSync(urlsPath).toString();
    fetchedUrls = data ? JSON.parse(data) : [];
    urls = urlsData ? JSON.parse(urlsData) : {relativeUrls : [], absoluteUrls: []};
}

function exitHandler() {
    var isFirst = true;
//在控制台按下ctrl+c 后会触发这个方法;
    process.on('SIGINT', function(){
        if(isFirst){
            console.log('再次按下ctrl+c退出控制台');
            setTimeout(function(){
                isFirst = true;
            },3000);
        }else {
            saveData(saveDir, 'fetchedinfo.json', JSON.stringify(fetchedUrls), function(){
                saveData(saveDir, 'temp.json', JSON.stringify(urls), function(){
                    process.exit();process.exit();
                });
            });
        }
        isFirst = false;
    });
}


module.exports.fetch = fetch;