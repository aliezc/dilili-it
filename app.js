'use strict';

var siegrune = require('siegrune');
var gather = require('./lib/gather.js');
var redis = require('redis');
var mongo = require('mongodb');

var url = 'mongodb://127.0.0.1:27017/dilili';

var app = siegrune.createServer();

// app.addHost('it.dilili.moe');

app.setPort(2401);

app.get(/^\/css\/(.*)/, function(req, res){
	res.dir('./css');
});

app.get(/^\/image\/(.*)/, function(req, res){
	res.dir('./image');
});

app.get('/favicon.ico', './favicon.ico');

app.get('/', function(req, res){
	mongo.MongoClient.connect(url, function(err, db){
		if(err){
			// 连接错误
			res.statusCode = 500;
			res.send(new Buffer(''));
		}else{
			var rc = redis.createClient();
			rc.on('error', function(err){
				res.statusCode = 500;
				res.send(new Buffer(''));
			});
			rc.auth('dilili', function(){
				var page = +req.QUERY.page || 1;
				rc.get('it_count', function(err, tmp){
					if(err){
						res.statusCode = 500;
						res.send(new Buffer(''));
					}else{
						var cnt = +tmp.toString();
						db.collection('it').find({}).sort({time: -1}).skip((page - 1) * 10).limit(10).toArray(function(err, arr){
							var str = '';
							for(var i = 0; i < arr.length; i++){
								str += '<a href="/read/' + arr[i].md5 + '">' + arr[i].title + '</a>'
							}
							
							if(str == ''){
								str = '<a style="text-align:center">没有啦 ╮（╯＿╰）╭</a>';
							}
							
							var left = page <= 1 ? '' : '<a href="?page=' + (page - 1) + '" class="prev">上一页</a>';
							var right = page >= Math.ceil(cnt / 10) ? '' : '<a href="?page=' + (page + 1) + '"  class="next">下一页</a>';
							
							res.render('./html/index.htm', {
								title: "滴哩哩软文网",
								list: str,
								prev: left,
								next: right
							});
							
							rc.quit();
							db.close();
						});
					}
				});
			});
		}
	});
});

app.get(/^\/read\/([0-9a-z]*)/, function(req, res){
	var id = req.REQUEST[0];
	mongo.MongoClient.connect(url, function(err, db){
		if(err){
			// 连接错误
			res.statusCode = 500;
			res.send(new Buffer(''));
		}else{
			db.collection('it').find({md5: id}).toArray(function(err, data){
				if(err){
					// 错误
					res.statusCode = 500;
					res.send(new Buffer(''));
				}else{
					if(data.length == 0){
						res.statusCode = 404;
						res.render('./html/read.htm', {
							title: '找不到指定文章',
							body: '404 - Not Found',
							time: ''
						});
					}else{
						res.render('./html/read.htm', {
							title: data[0].title,
							body: data[0].body,
							time: new Date(data[0].time).toLocaleString()
						});
					}
				}
				
				db.close();
			});
		}
	});
});

//gather();
//setInterval(gather, 1000 * 60 * 60 * 3);

app.listen();