/**
 * Created by Zhen on 2016/11/27.
 */

const cheerio = require('cheerio');
const entities = require('entities');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

var fetchUrl = 'http://liubin.org/promises-book/';
var fetchName = 'promises-book'; //保存在本地的目录
var entranceName = '';//入口 index.html
var netSpilder = fetchUrl.indexOf('https')!=-1 ? https : http;

//var fetchUrl = 'https://npm.taobao.org/mirrors/node/latest/docs/api/';
//var fetchName = 'node_docs'; //保存在本地的目录
var configDir = './public/'+fetchName;
var saveDir = configDir + '/site';
var urls = null; //初始化,所有的url
var fetchedUrls = null; //抓取过的url
var regex = /\b(href="|src="|href=".\/)\b\S*"/g; //g 遍历所有,正则匹配所有
var startFetchCount = 20; //最大抓取连接的个数
var currentFetchIndex = 0; //当前正在抓取的索引
var tempFileName = 'temp.json'; //抓取到的所有连接的文件名
var fetchedFileName = 'fetchedinfo.json'; //抓去过的连接文件名

//退出保存信息处理
exitHandler();
//程序初始化处理
initHandler();

//开始抓取
function fetch() {
    console.log('start fetch ...');
    if(urls.relativeUrls.length == 0) {
        fetchURL(entranceName, true);
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

//抓取指定的url,该url为相对url,
// isEntrance 是不是入口,是入口则调用fetchRun(),
// 不是则根据currentFetchIndex获取要抓取的url
function fetchURL(url, isEntrance){

    if(fetchedUrls.indexOf(url) == -1){ //防止重复获取
        var endUrl = getFetchURL(url)
        if(!endUrl) return;
        console.log('\nstart fetch: ' + endUrl);
        netSpilder.get(endUrl, function(res){
            //获取成功则保存和处理数据,失败打印请求信息
            if (res.statusCode === 200){
                var type = res.headers['content-type'];
                if(type.indexOf('image') != -1){
                    fetchBufferDataOperate(res, endUrl, url);
                }else {
                    fetchTextDataOperate(res, endUrl, url, isEntrance);
                }
            }else {
                console.log(endUrl + " : " + res.statusCode);
                console.log(JSON.stringify(res.headers));
            }
        });
    }

}

//抓取buffer类型的数据,可以是图片,视频,等二进制数据
function fetchBufferDataOperate(res, endUrl, url) {
    var saveDir = getSaveDir(url);
    var fileName = path.basename(endUrl);
    try {
        fs.statSync(saveDir);
    }catch (err){
        makeDirsSync(saveDir);
    }
    var savePath = path.join(saveDir, fileName);
    var writeStream = fs.createWriteStream(savePath);

    res.on('data', function(trunk){
        writeStream.write(trunk);
    });
    res.on('end',function(){
        writeStream.close();
        var item = operateFetchURL(url);
        if(fetchedUrls.indexOf(item) == -1) fetchedUrls.push(item);
        console.log('\nsave success!  ' + savePath);
    });
}

//抓取文本类型的数据
function fetchTextDataOperate(res, endUrl, url, isEntrance){
    var data = '';
    res.on('data', function(trunk){
        if(trunk) data += trunk;
        process.stdout.write('*');
    });
    res.on('end', function(){
        //文本类型数据处理
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
}

function getSaveDir(url) {
    url = operateFetchURL(url);
    var fileDir = path.join(saveDir, path.dirname(url));
    try {
        fs.statSync(fileDir);
    }catch (error){
        makeDirsSync(fileDir);
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
        makeDirsSync(savePath);
    }
    savePath = path.join(savePath, saveName);

    fs.writeFile(savePath, data, function(err){
        if(err){
            console.log(savePath + "  " + err);
            if(cb) cb(path.join(savePath, saveName),err);
        }else {
            console.log('\nsave success!  ' + savePath);
            if(cb) cb(saveName);
        }
    });
}

function initHandler() {

    try {
        fs.statSync(configDir);
    }catch(err){
        makeDirsSync(configDir);
    }

    try{
        var urlsPath = path.join(__dirname, configDir, tempFileName);
        var urlsData = fs.readFileSync(urlsPath).toString();
        urls = urlsData ? JSON.parse(urlsData) : {relativeUrls : [], absoluteUrls: [], emptyUrls: []};
    }catch(err){
        urls = {relativeUrls : [], absoluteUrls: [], emptyUrls: []};
    }

    try{
        var fetchedPath = path.join(__dirname, configDir, fetchedFileName);
        var data = fs.readFileSync(fetchedPath).toString();
        fetchedUrls = data ? JSON.parse(data) : [];
    }catch(err){
        fetchedUrls = [];
    }

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
    saveData(configDir, fetchedFileName, JSON.stringify(fetchedUrls), function(){
        saveData(configDir, tempFileName, JSON.stringify(urls), function(){
            process.exit();process.exit();
        });
    });
}

function makeDirSync(dirPath) {
    try {
        fs.statSync(dirPath);
    }catch (err){
        fs.mkdirSync(dirPath);
    }
}

function makeDirsSync(dirPath) {
    try {
        fs.statSync(dirPath)
    }catch(err){
        var dirComponent = path.relative(__dirname, dirPath);
        var dirComArr = dirComponent.split('/');
        //console.log(dirComArr);
        var dirName= __dirname;
        dirComArr.forEach(function(dirCom){
            dirName = path.join(dirName, dirCom);
            try {
                makeDirSync(dirName);
            }catch(error){
                console.log(error);
            }
        });
    }
}


module.exports.fetch = fetch;