var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/loginPost', {useNewUrlParser: true});
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function () {
    console.log("Connected to mongodb server");
});
var crypto = require('crypto');
var cipher = crypto.createCipher('aes-256-cbc','hiddenkey');

var userSchema = mongoose.Schema({
    uid: String,
    upwd: String
});


var userModel = mongoose.model('User', userSchema);

var commentSchema = mongoose.Schema({
    author:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    } ,
    contents: String,
    c_date: {type: Date, default: Date.now()}
});
var postSchema = mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: String,
    contents: String,
    p_date: Date,
    comments: [commentSchema]
});

var commentModel = mongoose.model('Comment', commentSchema);
var postModel = mongoose.model('Post', postSchema);

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'index'});
});

router.get('/join', function (req, res, next) {
    res.render('join', {title: 'join'});
});

router.post('/join', function (req, res) {
    var uid = req.body['id'];
    var upwd = req.body['pwd'];

    var crypted = cipher.update(upwd,'utf8','base64');
    crypted += cipher.final('base64');
    console.log('암호화 : ' + crypted);

    var user = new userModel();
    user.uid = uid;
    user.upwd = crypted;

    user.save(function (err) {
        if (err) {
            return handleError(err);
        }
    });
    res.send('회원 가입을 축하합니다.<br><button><a href="/">홈으로</a> </button>');
});

router.get('/login', function (req, res, next) {
    res.render('login');
});
router.post('/login', function (req, res) {
    var lid = req.body['id'];
    var lpwd = req.body['pwd'];
    var crypted = cipher.update(lpwd,'utf8','base64');
    crypted += cipher.final('base64');
    console.log('암호화 : ' + crypted);


    userModel.findOne({uid: lid}, function (err, result) {
        if (result != null) {
            var rid = result.uid;
            var rpwd = result.upwd;

            if (rid === lid && rpwd === crypted) {
                req.session.user = {
                    objId:result._id,
                    id:result.uid,
                    pwd:result.upwd
                };
                req.session.logined = true;
                res.render('loginOk', {id: req.session.user.id});
            } else {
                res.redirect('login');
            }
        } else {
            res.redirect('login');
        }
    });
});
router.get('/logout', function (req, res, next) {
    req.session.destroy();
    res.redirect('/');
});
router.get('/loginIndex', function (req, res, next) {
    var lid = req.session.user.id;
    postModel.find({}).populate('author').exec( function (err, result) {
        res.render('loginIndex', {id: lid, post: result});
    });
});
router.get('/write', function (req, res, next) {
    res.render('write');
});
router.post('/write',function (req, res, next){
    var post = new postModel();
    post.title = req.body['title'];
    post.contents = req.body['contents'];
    post.author = req.session.user.objId;

    post.save(function (err){
        if(err){
            return handleError(err);
        }
        res.redirect('/loginIndex');
    });
});
router.get('/post/:id', function (req, res) {
    postModel.findOne({_id: req.params.id}).populate(['author','comments.author']).exec( function (err, result) {
        console.log(result);
        console.log(req.session.user.id);
        res.render('post', { post: result, lid:req.session.user.id });
    });
});
router.post('/post/:id/update', function (req, res) {
    var pid = req.body['pid'];
    postModel.findOne({_id: pid}, function (err, result) {
        res.render('p_updateOk',{pid:pid});
    });
});
router.post('/p_updateOk',function (req, res) {
   var pid= req.body['pid'];
   var title = req.body['title'];
   var contents = req.body['contents'];

    postModel.findOne({_id: pid}, function (err, result) {
        result.title = title;
        result.contents = contents;

        result.save(function (err) {
            if (err) {
                throw err;
            } else {
                res.redirect('/post/'+pid);
            }
        });
    });

});
router.post('/post/:id/delete', function (req, res) {
    var pid = req.body['pid'];
    postModel.deleteOne({_id: pid}, function (err, result) {
        res.send('삭제 되었습니다.<button><a href="/loginIndex">목록</a> </button>');
    });
});

router.post('/comment', function (req, res){
    var comment = new commentModel();
    comment.contents = req.body['contents'];
    comment.author = req.session.user.objId;

    postModel.findOneAndUpdate({_id : req.body['id']}, { $push: { comments : comment}}, function (err, result) {
        if(err){
            console.log(err);
            res.redirect('/loginIndex');
        }
        res.redirect('/post/'+req.body['id']);
    });
});

router.post('/comment/update', function (req, res){
    var contents = req.body['contents'];
    var pid = req.body['pid'];
    var cid = req.body['cid'];

    postModel.update({'_id' : pid,'comments._id':cid}, {'$set':{'comments.$.contents':contents}}, function (err, result) {
        res.redirect('/post/'+pid);
    });
});

router.post('/comment/delete', function (req, res) {
    var pid = req.body['pid'];
    var cid = req.body['cid'];
    postModel.findOneAndUpdate({_id: pid},{$pull:{comments:{_id:cid}}} ,function (err, result) {
        res.redirect('/post/'+pid);
    });
});

router.get('/searchUser', function (req, res, next) {
    res.render('searchUser', {title: 'searchUser'});
});
router.post('/searchUser', function (req, res, next) {
    var sid = req.body['id'];

    userModel.findOne({uid: sid}, function (err, docs) {
        if (result != null) {
            res.render('/searchUserOk');
        } else {
            res.send('검색결과가 없습니다<button><a href="/">홈으로</a> </button>')
        }
    });
});
router.post('/searchUserOk', function (req, res, next) {
    var sid = req.body['sid'];

    userModel.findOne({uid: sid}, function (err, result) {
        res.render('searchUserOk', {rid: result.uid, rpwd: result.upwd});
    });
});

router.post('/update', function (req, res) {
    var rid = req.body['rid'];

    userModel.findOne({uid: rid}, function (err, result) {
        res.render('updateOk', {r_id: result._id});
    });
});

router.post('/updateOk', function (req, res) {
    var r_id = req.body['r_id'];
    var rid = req.body['rid'];
    var rpwd = req.body['rpwd'];

    var crypted = cipher.update(rpwd,'utf8','base64');
    crypted += cipher.final('base64');
    console.log('암호화 : ' + crypted);

    userModel.findOne({_id: r_id}, function (err, result) {
        result.uid = rid;
        result.upwd = crypted;

        result.save(function (err) {
            if (err) {
                throw err;
            } else {
                res.send('수정되었습니다. <button><a href="/">홈으로</a> </button>');
            }
        });
    });
});

router.post('/delete', function (req, res) {
    var rid = req.body['rid'];

    userModel.deleteOne({uid: rid}, function (err, result) {
        res.send('회원 탈퇴 되었습니다.<button><a href="/">홈으로</a> </button>');
    });
});

router.get('/error', function (req, res, next) {
    res.render('error', {title: 'error'});
});

module.exports = router;
