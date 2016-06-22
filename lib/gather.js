'use strict';

var ithome = require('ithome-gather');
var chinaz = require('chinaz-gather');
var assert = require('assert');
var mongo = require('mongodb');
var redis = require('redis');
var crypto = require('crypto');
var Emitter = require('events');

var url = 'mongodb://127.0.0.1:27017/dilili';

var insert_data = function(collection, data, cb){
	var md5 = crypto.createHash('md5').update(data.title).digest('hex');
	data.md5 = md5;
	var res = {
		insert: 0,
		exists: 0,
		fail: 0
	};
	collection.find({md5: md5}).count(function(err, cnt){
		if(err){
			console.log('检查数据错误：' + err);
			res.fail++;
			if('function' == typeof cb) cb.call(null, err, res);
		}else{
			if(cnt === 0){
				// 数据不存在，插入数据
				collection.insertOne(data, function(err, result){
					if(err){
						console.log('插入失败');
						res.fail++;
						if('function' == typeof cb) cb.call(null, err, res);
					}else{
						res.insert++;
						if('function' == typeof cb) cb.call(null, null, res);
					}
				});
			}else{
				res.exists++;
				if('function' == typeof cb) cb.call(null, null, res);
			}
		}
	});
}

var update_count = function(){
	mongo.MongoClient.connect(url, function(err, db){
		if(err){
			console.log('连接数据库错误： ' + err);
		}else{
			db.collection('it').find({}).count(function(err, cnt){
				if(err){
					console.log('查询数量错误：' + err);
				}else{
					var rs = redis.createClient();
					rs.on('error', function(err){
						console.log('Redis连接错误：' + err);
					});
					rs.auth('dilili', function(){
						rs.set('it_count', cnt.toString());
						db.close();
						console.log('信息数量：' + cnt);
					});
				}
			});
		}
	});
}

var save_data = function(refer, arr, cb){
	mongo.MongoClient.connect(url, function(err, db){
		var insert = 0, exists = 0, fail = 0;
		if(err){
			console.log('连接数据库出错：' + err);
		}else{
			var it = db.collection('it');
			for(var i = 0; i < arr.length; i++){
				var data = arr[i];
				data.show = true;
				data.refer = refer;
				insert_data(it, data, function(err, res){
					insert += res.insert;
					exists += res.exists;
					fail += res.fail;
					
					if(arr.length == insert + exists + fail){
						console.log(new Date().toUTCString() + ': ' + refer + '已处理' + arr.length + '条数据，新增' + insert + '条，已存在' + exists + '条，插入失败' + fail + '条。');
						db.close();
						if('function' == typeof cb) cb.call(null);
					}
				});
			}
		}
	});
}

module.exports = function(){
	ithome(1, 1, function(arr){
		save_data('ithome', arr, update_count);
	});
	
	chinaz(1, 1, function(arr){
		save_data('chinaz', arr, update_count);
	});
}