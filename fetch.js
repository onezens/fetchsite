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
var startFetchCount = 20; //最大抓取连接的个数
var currentFetchIndex = 0; //当前正在抓取的索引

//退出保存信息处理
exitHandler();
//程序初始化处理
initHandler();

//开始抓取
function fetch() {
    console.log('start fetch ...');
    if(urls.relativeUrls.length == 0) {
        fetchURL('index.html', true);
    }else if(urls.relativeUrls.length == fetchedUrls.length){
        console.log('all source fetched!');
        exitApp();
    }else {
        fetchRun();
    }
}

//一次抓取多条
function fetchRun(){

    if(urls.relativeUrls.length < startFetchCount) {
        currentFetchIndex = urls.relativeUrls.length;
    }else {
        currentFetchIndex = startFetchCount;
    }
    var startIndex = currentFetchIndex;
    for(var i=0; i<startIndex; i++){
        var currentUrl = urls.relativeUrls[i];
        fetchURL(currentUrl);
    }
}


function fetchURL(url, isEntrance){

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
                    var matches = data.toString().match(regex);
                    var absoluteUrls = urls.absoluteUrls;
                    var relativeUrls = urls.relativeUrls;
                    if(matches && matches.length>0){
                        matches.forEach(function(match){
                            var item = operateFetchURL(match);
                            //锚点不处理
                            if(item.indexOf('#') == -1){
                                //完整http路径不处理
                                if(item.indexOf('http://') != -1 || item.indexOf('https://') != -1){
                                    if(absoluteUrls.indexOf(item) == -1) absoluteUrls.push(item);
                                }else {
                                    if(relativeUrls.indexOf(item) == -1) relativeUrls.push(item);
                                }
                            }
                        });
                    }else{
                        urls.emptyUrls.push(endUrl);
                    }

                    //保存抓取的网页数据
                    saveData(getSaveDir(url), path.basename(endUrl), data.toString(), function(savepath, error){
                        if(!error){
                            var item = operateFetchURL(url);
                            if(fetchedUrls.indexOf(item) == -1) fetchedUrls.push(item);
                        }
                        if(urls.relativeUrls.length == fetchedUrls.length) {
                            console.log('all source fetched!');
                            exitApp();
                        }

                    });
                    //获取数据成功的回调
                    if(typeof cb == 'function') cb();

                    //如果是入口获取数据则,开始循环抓取
                    if(isEntrance){
                        fetchRun();
                    }else{
                        //递归调用
                        if(currentFetchIndex < urls.relativeUrls.length){
                            fetchURL(urls.relativeUrls[currentFetchIndex]);
                            currentFetchIndex++;
                        }
                    }
                });
            }else {
                console.log(endUrl + " : " + res.statusCode);
                console.log(JSON.stringify(res.headers));
            }

        });
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
    if(url.indexOf('http://')!=-1 || url.indexOf('https://')!=-1){ //全url, 不抓取
        return null;
    }

    if(url.indexOf('#') != -1){ //锚点不抓取
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
    urls = urlsData ? JSON.parse(urlsData) : {relativeUrls : [], absoluteUrls: [], emptyUrls: []};
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
            exitApp();
        }
        isFirst = false;
    });
}

function exitApp() {
    saveData(saveDir, 'fetchedinfo.json', JSON.stringify(fetchedUrls), function(){
        saveData(saveDir, 'temp.json', JSON.stringify(urls), function(){
            process.exit();process.exit();
        });
    });
}


module.exports.fetch = fetch;