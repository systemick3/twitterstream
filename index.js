var http = require('http'),
  fs = require('fs'),
  express = require('express'),
  morgan = require('morgan'),
  config = require('./config'),
  app = express();

app.set('port', process.env.PORT || config.port || 3000);
app.set('env', process.env.NODE_ENV || config.env || 'development');

// Logging print to both the console and a logfile
// Use morgan for logging errors
var logfile = fs.createWriteStream('./logs/access.log', { flags: 'a' });
app.use(morgan("combined", {stream: logfile}));
app.use(morgan("dev"));
var errorLogger = require('./utils/errorLogger');

// Create server
var server = http.createServer(app);

var io = require('socket.io').listen(server);

// var getTrends = function () {
//   var UK_WOEID = '23424975',
//     i,
//     params = { id: UK_WOEID },
//     trends,
//     searchTerms = [];

//   T.get('trends/place', params, function (err, data) {
//     //console.log(data[0].trends);
//     trends = data[0].trends;

//     for (i = 0; i < trends.length; i++) {
//       console.log('in loop');
//       searchTerms.push(trends[i].name);
//     }

//     console.log(searchTerms);

//     return searchTerms;
//   });
// };

var stream;
var Twit = require('twit');
var T = new Twit({
    consumer_key:         config.twitter.twitter_consumer_key,
    consumer_secret:      config.twitter.twitter_consumer_secret,
    access_token:         config.twitter.twitter_access_token,
    access_token_secret:  config.twitter.twitter_access_token_secret
});

var startStream = function (terms) {
  console.log('STARTING TWITTER STREAM');

  var TWEETS_BUFFER_SIZE = 100;

  var searchTerms = ['#php, #javascript'];
  //var testTerms = getTrends();
  //console.log('TEST');
  //console.log(testTerms);

  //console.log("Listening for tweets from San Francisco...");
  stream = T.stream('statuses/filter', { track: terms, language: 'en' });
  //var stream = T.stream('statuses/filter', { locations: [-122.75,36.8,-121.75,37.8] });
  var tweetsBuffer = [];
   
  stream.on('connect', function(request) {
      console.log('Connected to Twitter API');
  });
   
  stream.on('disconnect', function(message) {
      console.log('Disconnected from Twitter API. Message: ' + message);
  });
   
  stream.on('reconnect', function (request, response, connectInterval) {
    console.log('Trying to reconnect to Twitter API in ' + connectInterval + ' ms');
  })
   
  stream.on('tweet', function(tweet) {
    // if (tweet.geo == null) {
    //     return ;
    // }

    //console.log(tweet);

    var emitTweet = function () {
      var start = new Date().getTime(),
        end,
        secs;

      console.log('EMIT TWEET');
      var tweetsToEmit = [];
      // Send buffer only if it has tweets
      if (tweetsBuffer.length >= TWEETS_BUFFER_SIZE) {
        //broadcast tweets
        tweetsToEmit.push(tweetsBuffer[0]);
        console.log(tweetsToEmit);
        io.sockets.emit('tweets', tweetsToEmit);
        // Discard the rest of the tweets
        tweetsBuffer = [];
      }

      end = new Date.getTime();
      secs = end - start;
      console.log('secs = ' + secs);

      setTimeout(emitTweet, 20000);
    };

    //Create message containing tweet + username + profile pic + geo

    var msg = {};
    msg.text = tweet.text;
    //msg.geo = tweet.geo.coordinates;
    //msg.created = tweet.created_at;
    msg.text = tweet.text,
    msg.created_at = tweet.created_at
    msg.user = {
        name: tweet.user.name,
        screen_name: tweet.user.screen_name,
        image: tweet.user.profile_image_url,
        
    };
   
    //console.log(msg);

    // Sush msg into buffer
    tweetsBuffer.push(msg);

    //emitTweet();

    if (tweetsBuffer.length >= TWEETS_BUFFER_SIZE) {
      //broadcast tweets
      //tweetsToEmit.push(tweetsBuffer[0]);
      //console.log(tweetsToEmit);
      var slice = tweetsBuffer.slice(0, 1);
      console.log(slice);
      console.log('EMIT TWEET');
      io.sockets.emit('tweets', slice);
      // Discard the rest of the tweets
      tweetsBuffer = [];
    }

    // Send a tweet every 10 secs

    

  });

  var nbOpenSockets = 0;

  io.sockets.on('connection', function(socket) {
      console.log('Client connected !');
      //console.log(socket.request._query);
      var newTerm = '#' + socket.request._query.michael;

      if (nbOpenSockets <= 0) {
          nbOpenSockets = 0;
          console.log('First active client. Start streaming from Twitter');
          stream.start();
      }

      nbOpenSockets++;

      socket.on('disconnect', function() {
          console.log('Client disconnected !');
          nbOpenSockets--;

          if (nbOpenSockets <= 0) {
              nbOpenSockets = 0;
              console.log("No active client. Stop streaming from Twitter");
              searchTerms = [];
              stream.stop();
          }
      });
  });

};

(function init() {
  var UK_WOEID = '23424975',
    i,
    params = { id: UK_WOEID },
    trends,
    searchTerms = [];

  console.log('BOOTING APP');
  var d = new Date();
  console.log('TIME IS ' + d.toString());
  console.log(params);

  T.get('trends/place', params, function (err, data) {
    if (err) {
      console.log('TWITTER ERROR');
      console.log(err);
      //return callback(err);
    }

    //console.log(data[0].trends);
    trends = data[0].trends;

    for (i = 0; i < trends.length; i++) {
      //console.log('in loop');
      searchTerms.push(trends[i].name);
    }

    startStream(searchTerms);

  });

  // Reset the search terms every hour
  setTimeout(init, 3600000);
})();

// var init = function () {
//   var UK_WOEID = '23424975',
//     i,
//     params = { id: UK_WOEID },
//     trends,
//     searchTerms = [];

//   console.log('BOOTING APP');

//   T.get('trends/place', params, function (err, data) {
//     //console.log(data[0].trends);
//     trends = data[0].trends;

//     for (i = 0; i < trends.length; i++) {
//       //console.log('in loop');
//       searchTerms.push(trends[i].name);
//     }

//     startStream(searchTerms);

//   });

//   //setTimeout(init)
// };

// init();

var boot = function () {
  server.listen(app.get('port'), function(){
    console.info('Express server listening on port ' + app.get('port'));
    console.info('Current environment is ' + app.get('env'));
  });
};
var shutdown = function() {
  server.close();
};
if (require.main === module) {
  boot();
}
else {
  console.info('Running app as a module')
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = app.get('port');
}