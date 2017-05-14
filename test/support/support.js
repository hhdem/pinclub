var User = require('../../proxy/user');
var Topic = require('../../proxy/topic');
var Board = require('../../proxy/board');
var Reply = require('../../proxy/reply');
var ready = require('ready');
var eventproxy = require('eventproxy');
var utility = require('utility');
var tools = require('../../common/tools');

function randomInt() {
    return (Math.random() * 10000).toFixed(0);
}

var createUser = exports.createUser = function (callback) {
    var key = new Date().getTime() + '_' + randomInt();
    tools.bhash('password', function (err, passhash) {
        User.newAndSave('alsotang' + key, 'alsotang' + key, passhash, 'alsotang' + key + '@gmail.com', '', false, callback);
    });
};

exports.createUserByNameAndPwd = function (loginname, pwd, callback) {
    tools.bhash(pwd, function (err, passhash) {
        User.newAndSave(loginname, loginname, passhash, loginname + +new Date() + '@gmail.com', '', true, callback);
    });
};

var createTopic = exports.createTopic = function (authorId, callback) {
    var key = new Date().getTime() + '_' + randomInt();
    Topic.newAndSave('topic title' + key, 'test topic content' + key, 'share', authorId, callback);
};

var createImage = exports.createImage = function (authorId, board, callback) {
    var key = new Date().getTime() + '_' + randomInt();
    var image = {};
    image.title = 'image title' + key;
    image.content = 'test image content' + key;
    image.author_id = authorId;
    image.type = 'image';
    image.image = 'xxxxx';
    image.board = board;
    Topic.newAndSaveImage(image, callback);
};

var createBoard = exports.createBoard = function (authorId, type, callback) {
    Board.newAndSave('I am board', type, authorId, callback);
};

var createReply = exports.createReply = function (topicId, authorId, callback) {
    Reply.newAndSave('I am content', topicId, authorId, callback);
};

var createSingleUp = exports.createSingleUp = function (replyId, userId, callback) {
    Reply.getReply(replyId, function (err, reply) {
        reply.ups = [];
        reply.ups.push(userId);
        reply.save(function (err, reply) {
            callback(err, reply);
        });
    });
};

function mockUser(user) {
    return 'mock_user=' + JSON.stringify(user) + ';';
}

ready(exports);

var ep = new eventproxy();
ep.fail(function (err) {
    console.error(err);
});

ep.all('user', 'user2', 'user3', 'admin', function (user, user2, user3, admin) {
    exports.normalUser = user;
    exports.normalUserCookie = mockUser(user);

    exports.normalUser2 = user2;
    exports.normalUser2Cookie = mockUser(user2);

    exports.activedUser = user3;
    exports.activedUserCookie = mockUser(user3);

    var adminObj = admin.toObject();
    adminObj.is_admin = true;
    exports.adminUser = admin;
    exports.adminUserCookie = mockUser(adminObj);

    createTopic(user._id, ep.done('topic'));
    createBoard(user._id, '', ep.done('board'));
});

ep.on('needActive', function (user) {
    user.active = true;
    user.save(function(err){
        ep.emit('user3', user);
    });
});

ep.on('emptyAccessToken', function (user) {
    user.accessToken = undefined;
    user.active = true;
    user.save(function(err){
        ep.emit('user2', user);
    });
});

createUser(ep.done('user'));
createUser(ep.done('emptyAccessToken'));
createUser(ep.done('needActive'));
createUser(ep.done('admin'));


ep.all('board', function (board) {
    exports.testBoard = board;
    createImage(exports.normalUser._id, board, ep.done('image'));
});

ep.all('image', function (image) {
    exports.testImage = image;
    createReply(image._id, exports.normalUser._id, ep.done('replyimage'));
});

ep.all('topic', function (topic) {
    exports.testTopic = topic;
    createReply(topic._id, exports.normalUser._id, ep.done('reply'));
});

ep.all('reply', 'replyimage', function (reply, replyimage) {
    exports.testReply = reply;
    exports.testReplyImage = replyimage;
    exports.ready(true);
});