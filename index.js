var http = require('http'),
  fs = require('fs'),
  express = require('express'),
  morgan = require('morgan'),
  config = require('./config'),
  logfile = fs.createWriteStream('./logs/access.log', { flags: 'a' }),
  errorLogger = require('./utils/errorLogger'),
  Twit = require('twit'),
  T,
  io,
  server,
  app = express();

app.set('port', process.env.PORT || config.port || 3000);
app.set('env', process.env.NODE_ENV || config.env || 'development');

// Logging print to both the console and a logfile
// Use morgan for logging errors
//var logfile = fs.createWriteStream('./logs/access.log', { flags: 'a' });
app.use(morgan("combined", {stream: logfile}));
app.use(morgan("dev"));

// Create server
server = http.createServer(app);

// Stream listen
io = require('socket.io').listen(server);

T = new Twit({
    consumer_key:         config.twitter.twitter_consumer_key,
    consumer_secret:      config.twitter.twitter_consumer_secret,
    access_token:         config.twitter.twitter_access_token,
    access_token_secret:  config.twitter.twitter_access_token_secret
});

var startStream = function (terms) {
  var start = new Date().getTime(),
    end,
    interval,
    stream,
    tweetsBuffer = [],
    msg,
    slice,
    TWEETS_BUFFER_SIZE = 100;

  console.log('STARTING TWITTER STREAM');

  stream = T.stream('statuses/filter', { track: terms, language: 'en' });

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

    // Format the tweet
    msg = {};
    msg.text = tweet.text;
    msg.text = tweet.text;
    msg.created_at = tweet.created_at;
    msg.id_str = tweet.id_str;
    msg.user_mentions = tweet.entities.user_mentions;
    msg.user = {
        name: tweet.user.name,
        screen_name: tweet.user.screen_name,
        image: tweet.user.profile_image_url,
    };

    // Push msg into buffer
    tweetsBuffer.push(msg);

    // How long is it since start was last set?
    end = new Date().getTime();
    interval = end - start;

    // If more than 10 secs OR we have 100 tweeets then broadcast all tweets
    if (interval >= 10000) {
      var slice = tweetsBuffer;
      console.log(slice);
      console.log('EMIT TWEET');
      io.sockets.emit('tweets', slice);

      // Discard the rest of the tweets
      tweetsBuffer = [];
      start = new Date().getTime();
    }

  });

  var nbOpenSockets = 0;

  io.sockets.on('connection', function(socket) {
      console.log('Client connected !');

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
    d = new Date(),
    searchTerms = [];

  console.log('INIT');
  console.log('TIME IS ' + d.toString());
  console.log(params);

  T.get('trends/place', params, function (err, data) {
    if (err) {
      console.log('TWITTER ERROR');
      console.log(err);
    }

    trends = data[0].trends;

    for (i = 0; i < trends.length; i++) {
      searchTerms.push(trends[i].name);
    }

    startStream(searchTerms);

  });

  // Reset the search terms every hour
  setTimeout(init, 3600000);
})();

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