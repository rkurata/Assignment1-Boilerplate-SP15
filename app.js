//dependencies for each module used
var express = require('express');
var passport = require('passport');
var InstagramStrategy = require('passport-instagram').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var http = require('http');
var path = require('path');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');
var Instagram = require('instagram-node-lib');
var Facebook = require('fbgraph');
var mongoose = require('mongoose');
var app = express();
var async = require('async');

//local dependencies
var models = require('./models');

//client id and client secret here, taken from .env
dotenv.load();
var INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
var INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
var INSTAGRAM_CALLBACK_URL = process.env.INSTAGRAM_CALLBACK_URL;
var INSTAGRAM_ACCESS_TOKEN = "";
var FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
var FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
var FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL;
var FACEBOOK_ACCESS_TOKEN = "";

Instagram.set('client_id', INSTAGRAM_CLIENT_ID);
Instagram.set('client_secret', INSTAGRAM_CLIENT_SECRET);
//Facebook.set('client-id', FACEBOOK_APP_ID);
//Facebook.set('client_secret', FACEBOOK_APP_SECRET);
//Facebook.setAccessToken(access_token);


//connect to database
mongoose.connect(process.env.MONGODB_CONNECTION_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log("Database connected succesfully.");
});

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Instagram profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the InstagramStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Instagram
//   profile), and invoke a callback with a user object.
passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: INSTAGRAM_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    models.User.findOrCreate({
      "name": profile.username,
      "id": profile.id,
      "access_token": accessToken 
    }, function(err, user, created) {
      
      // created will be true here
      models.User.findOrCreate({}, function(err, user, created) {
        // created will be false here
        process.nextTick(function () {
          // To keep the example simple, the user's Instagram profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Instagram account with a user record in your database,
          // and return that user instead.
          return done(null, profile);
        });
      })
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: FACEBOOK_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    models.User.findOrCreate({
      "name": profile.username,
      "id": profile.id,
      "access_token": accessToken 
    }, function(err, user, created) {
      
      // created will be true here
      models.User.findOrCreate({}, function(err, user, created) {
        // created will be false here
        process.nextTick(function () {
          // To keep the example simple, the user's Instagram profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Instagram account with a user record in your database,
          // and return that user instead.
          return done(null, profile);
        });
      })
    });
  }
));

//Configures the Template engine
app.engine('handlebars', handlebars({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat',
                  saveUninitialized: true,
                  resave: true}));
app.use(passport.initialize());
app.use(passport.session());

//set environment ports and start application
app.set('port', process.env.PORT || 3000);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 
    return next(); 
  }
  res.redirect('/login');
}

//routes
app.get('/', function(req, res){
  res.render('login');
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/igaccount', ensureAuthenticated, function(req, res){
  res.render('igaccount', {user: req.user});
});


app.get('/photos', ensureAuthenticated, function(req, res){
  var query  = models.User.where({ name: req.user.username });
  query.findOne(function (err, user) {
    if (err) return handleError(err);
    if (user) {
      // doc may be null if no document matched
      Instagram.users.self({
        access_token: user.access_token,
        complete: function(data) {
          //Map will iterate through the returned data obj
          var imageArr = data.map(function(item) {
            //create temporary json object
            tempJSON = {};
            tempJSON.url = item.images.low_resolution.url;
            //insert json object into image array
           
           

            return tempJSON;
          });
          res.render('photos', {photos: imageArr});
        }
      }); 
    }
  });
});

app.get('/feed', ensureAuthenticated, function(req, res){
  var query  = models.User.where({ name: req.user.username });
  query.findOne(function (err, user) {
    if (err) return handleError(err);
    if (user) {
      // doc may be null if no document matched
      Instagram.users.self({
        access_token: user.access_token,
        complete: function(data) {
          //Map will iterate through the returned data obj
          var imageArr = data.map(function(item) {
            //create temporary json object
            tempJSON = {};
            tempJSON.url = item.images.low_resolution.url;
            //insert json object into image array
           
           //get photo caption from image
           if (item.caption) {
            tempJSON.caption = item.caption.text;
           } else {
            tempJSON.caption = null;
           }
           

            return tempJSON;
          });
          res.render('feed', {feed: imageArr, user:req.user});
        }
      }); 
    }
  });
});




// Post instagram/like
app.post('/feed', ensureAuthenticated, function(req, res){
  var query = models.User.where({ name: req.user.username});
  query.findOne(function (err, user) {
    if (err) return handleError(err);
      if (user) {
        Instagram.media.likes({
          access_token: user.access_token,
          media_id: req.body.media_id,
          complete: function(data) {
            res.redirect('/feed');
          }
        });

        Instagram.media.delete({
          access_token: user.access_token,
          media_id: req.body.media_id,
          complete: function(data) {
            res.redirect('/feed');
          }
        });


      }
    });
});

app.get('/fbaccount', ensureAuthenticated, function (req, res){
  
  var query = models.User.where({ id: req.user.id});
  query.findOne(function (err, user) {
    if (err) return handleError(err);
    if (user) {

      Facebook.setAccessToken(user.access_token);

      Facebook.get('/' + req.user.id, function (err, results) {


        var birthday = results.birthday;
        var email = results.email;
        var locale = results.locale;
        var hometown = results.hometown.name;
        console.log(results);

      Facebook.get('/' + req.user.id + "/posts", function (err, results) {
          // console.log(results);
        var data = results.data;
          console.log(data);
        var imageArr = data.map(function (item) {
          tempJSON = [];
          tempJSON.url = item.picture;
              console.log(tempJSON.url);

           if (item.caption) {
              tempJSON.caption = item.caption;
            } else {
              tempJSON.caption = null;
            }
            
            tempJSON.time = item.created_time;
            tempJSON.description = item.description;
            tempJSON.iconurl = item.icon;
            tempJSON.story = item.story;

            tempJSON.pid = item.id;

          return tempJSON;
          //console.log(res);

        });
        res.render('fbaccount', {fbaccount: imageArr, birthday: birthday, hometown: hometown, email: email, locale: locale, user:req.user});

      
      });
      });
    }
  });
});


// GET FACEBOOK PHOTOS
app.get('/facebook', ensureAuthenticated, function(req, res){
  

  var query  = models.User.where({ id: req.user.id});
  query.findOne(function (err, user) {

  var imageArr = [];
    

    if (err) return handleError(err);
    if (user) {

      Facebook.setAccessToken(user.access_token);
      
      Facebook.get('/' + req.user.id + "/photos", function(err, results){
    //console.log(results);
        var data = results.data;
      //console.log(data);
        
        var imageArr = data.map(function(item) {
          //create temporary json object
          
              tempJSON = {};
              tempJSON.url = item.source;
          
              if (item.caption) {
                tempJSON.caption = item.caption;
              } else {
                tempJSON.caption = null;
              }
              
              tempJSON.time = item.created_time;
              tempJSON.description = item.name;
              //console.log(item.name);
             
              var date = new Date(item.created_time);
              tempJSON.year = date.getFullYear();
             
              Facebook.get('/' + item.id + '/likes?summary=1', function(err, ress) {
                  tempJSON.likect = ress.summary.total_count;
                  
                  imageArr.push(tempJSON.likect);
                  console.log('number of likes: '+ tempJSON.likect);
             
                  
              //res.render('facebook', {user: req.user, facebook: imageArr});

              }); //end GET LIKE COUNT
              
             // async.each(item, 
               // function(item, callback){
                 // item.
               // }
               return tempJSON;
                  
              
        }); //end imageArr

console.log(imageArr);

res.render('facebook', {user: req.user, facebook: imageArr});

      }); // end GET PHOTOS
  }});
});


// GET FACEBOOK USER'S LIKED ITEMS
app.get('/fblike', ensureAuthenticated, function(req, res){
  var query  = models.User.where({ id: req.user.id});
  query.findOne(function (err, user) {
    if (err) return handleError(err);
    if (user) {
      Facebook.setAccessToken(user.access_token);
      
      //get pictures from my posts
      Facebook.get('/' + req.user.id + "/likes", function(err, results){
       
        var data = results.data;

        var likeArr = data.map(function(item) {
          tempJSON = {};
          tempJSON.category = item.category;
          tempJSON.name = item.name;
          tempJSON.created_time = item.created_time;
          var date = new Date(item.created_time);
              tempJSON.year = date.getFullYear();
          


          tempJSON.id = item.id;

         // console.log(item.category);
         Facebook.get('/' + item.id + '?fields=cover', function(err, results){
          //console.log(results);
          //var d = results.data;

          //var coverArr = d.map(function(item)
           // {tempJSON = {};
           // tempJSON.url = item.source;
           // console.log(item.source);
        //  });
          //tempJSON.url = results.cover.source;
          //console.log(results.cover.source);
         })

          return tempJSON;

        });


        res.render('fblike', {user: req.user, fblike: likeArr});
      });
    }
  });
});

// GET /auth/instagram
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Instagram authentication will involve
//   redirecting the user to instagram.com.  After authorization, Instagram
//   will redirect the user back to this application at /auth/instagram/callback
app.get('/auth/instagram',
  passport.authenticate('instagram'),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email', 
                                              'user_posts',
                                             'read_stream',
                                             'user_birthday',
                                             'user_about_me',
                                             'user_likes',
                                             'user_location',
                                             'user_photos',
                                             'user_hometown',
                                             'user_status',
                                             'user_friends',
                                             'user_interests'
                                             ] }),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });

// GET /auth/instagram/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login'}),
  function(req, res) {
    res.redirect('/igaccount');
  });

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login'}),
  function(req, res) {
    res.redirect('/fbaccount');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
