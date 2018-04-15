var nodemailer = require('nodemailer');
var admin = require('firebase-admin');
var serviceAccount = require('./CaredFor-cd5306cb0e97.json');
var CronJob = require('cron').CronJob;
var fs = require('fs');
var handlebars = require('handlebars');
var http = require('http');
var querystring = require('querystring');
var jsdom = require('jsdom');
;

// set credentials for firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://caredfor-e1076.firebaseio.com/'
});

// set up mail sender
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
         user: 'govi218mu@gmail.com',
         pass: 'collyjuddlesticks739'
     }
 });

// read html file to render
var readHTMLFile = function(path, callback) {
    fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        }
        else {
            callback(null, html);
        }
    });
};

// access database references
var db = admin.database();
var snrRef = db.ref('senior');
var mailRef = db.ref('mailList')

snrRef.on('child_added', function (snapshot) {
  var snr = snapshot.val();
  console.log('before' + snr.seniorID + snr.relativeEmail);
  checkMailingList(snr.seniorID, snr.relativeEmail);
});

// listen for new updates in mailing list
function checkMailingList(SeniorID, relativeEmail) {  

  console.log(SeniorID);
  mailRef.once('value', function(snapshot) {
    
    if(!snapshot.hasChild(SeniorID)) {
      var childUpdate = db.ref('/mailList/' + SeniorID).set({
        updateEmail: relativeEmail
      });
      readHTMLFile('./welcome.html', function(err, html) {
        var template = handlebars.compile(html);
        var replacements = {
          img_ref: "<img src=https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='" + SeniorID + "'>" + "</img>"
        }
        var htmlToSend = template(replacements);
        var mailOptions = {
          from: 'welcome@caredforapp.ca',
          to: relativeEmail,
          subject: 'Welcome to CaredFor',
          html: htmlToSend
        };
        
        transporter.sendMail(mailOptions, function(err, info) {
          if(err){
              return console.log(err);
          }
          console.log('Message sent: ' + info.response);
        });
      });
      
    } else {
      console.log('yaaaas' + snapshot.val());
    }
  });
}

// insert img tag to html
handlebars.registerHelper('link', function(text, seniorID) {
  url = handlebars.escapeExpression(url);
  text = handlebars.escapeExpression(text);

  return new handlebars.SafeString(
    "<img src=https://api.qrserver.com/v1/create-qr-code/?size=150x150&data='" + seniorID + "'>" + "</img>"
  );
});

/* Optional features */

// Method to make POST request to QR code api

function PostCode(seniorID) {
  // Build the post string from an object
  var post_data = querystring.stringify({
      'data' : seniorID
  })
  console.log(post_data);
  var post_options = {
    host: 'api.qrserver.com',
    port: '80',
    path: '/v1/create-qr-code/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(post_data)
    }
  };
    // Set up the request
  var post_req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
          fs.writeFile('./' + seniorID + '.png', chunk, function(err, res) {
          if (err) {
            console.log(err);
          }
          console.log("write successful");
        })
    });
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
}

//Set reminders as Cron Jobs below
new CronJob('00 55 11 * * 1-5', function() { 
  mailRef.once('value')
}, null, true, "America/New_York");
