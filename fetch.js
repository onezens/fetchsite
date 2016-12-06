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
var urls = null; //初始化
var saveDir = './public/'+fetchName;
var fetchedUrls = null;

exitHandler();
initHandler();

function fetch() {
    console.log('fetch');
    if (urls.index && urls.index.length>0){
        urls.index.forEach(function(match){
            fetchURL(match);
        });
    }else{
        https.get(fetchUrl+'index.html', function(res){

            if (res.statusCode === 200){
                var data = null;
                res.on('data', function(trunk){
                    data += trunk;
                })
                res.on('end', function(){
                    saveData('./public/'+fetchName, 'index.html', data);
                    var regex = /\b(?:href="|src=")\b\S*"/g; //g 遍历所有,正则匹配所有
                    var matches = data.toString().match(regex);
                    var result = [];
                    matches.forEach(function(match){
                        //完整http路径不处理
                        if(url.indexOf('http://') == -1 || url.indexOf('https://') == -1){
                            result.push(operateFetchURL(match) ? operateFetchURL(match) : match);
                        }
                    });
                    urls.index = result;
                    saveData(saveDir, 'temp.json', JSON.stringify(urls))
                    saveData(saveDir, 'index.html', data);
                    matches.forEach(function(match){
                        fetchURL(match);
                    });
                });
            }else {
                console.log(res.statusCode);
                console.log(JSON.stringify(res.headers));
            }
        });
    }
}

function initHandler() {
    var fetchedPath = path.join(__dirname, saveDir, 'fetchedinfo.json');
    var urlsPath = path.join(__dirname, saveDir, 'temp.json');
    var data = fs.readFileSync(fetchedPath).toString();
    var urlsData = fs.readFileSync(urlsPath).toString();
    fetchedUrls = data ? JSON.parse(data) : [];
    urls = urlsData ? JSON.parse(urlsData) : {};
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
                process.exit();
            });
        }
        isFirst = false;
    });
}

function fetchURL(url){

   if(fetchedUrls.indexOf(url) == -1){ //防止重复获取
       var endUrl = getFetchURL(url);
       if(!endUrl) return; //默认http开头完整url不被获取,防止陷入死循环
       console.log('start fetch: ' + endUrl);
       https.get(endUrl, function(res){
           if (res.statusCode === 200){
               var data = null;
               res.on('data', function(trunk){
                   data += trunk;
                   process.stdout.write('*');
               });
               res.on('end', function(){
                   saveData(getSaveDir(url), path.basename(endUrl), data.toString(), function(savepath, error){
                       if(!error){
                           fetchedUrls.push(operateFetchURL(url));
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
    if(url.indexOf('http://')!=-1 || url.indexOf('https://')!=-1){
        return null;
    }
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


module.exports.fetch = fetch;