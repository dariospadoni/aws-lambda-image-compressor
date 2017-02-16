// dependencies
var async = require('async');
var path = require('path');
var AWS = require('aws-sdk');
var Q = require('q');
var gm = require('gm').subClass({
  imageMagick: true
});
require('dotenv').config();

// get reference to S3 client
var s3 = new AWS.S3();
exports.handler = function (event, context) {

  var bucket = event.Records[0].s3.bucket.name;
  //bucket where processed images will be saved
  var destinationBucket = process.env.DESTINATION_BUCKET;
  // Object key may have spaces or unicode non-ASCII characters.
  var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  var srcPath = path.dirname(srcKey) + '/';
  if (srcPath === './') {
    srcPath = '';
  }

  //compressed images desired width and subfolder
  var _1200px = {
    width: 1200,
    destinationPath: "hero"
  };
  var _1020px = {
    width: 1020,
    destinationPath: "large"
  };
  var _600px = {
    width: 600,
    destinationPath: "medium"
  };
  var _400px = {
    width: 400,
    destinationPath: "small"
  };
  var _sizesArray = [_1200px, _1020px, _600px, _400px];

  // Infer the image type.
  var typeMatch = srcKey.match(/\.([^.]*)$/);
  var fileName = path.basename(srcKey);
  if (!typeMatch) {
    console.error('unable to infer image type for key ' + srcKey);
    return;
  }
  var imageType = typeMatch[1].toLowerCase();
  var imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'eps'];
  if (imageTypes.indexOf(imageType) === -1) {
    console.log('skipping non-image ' + srcKey);
    return;
  }

  console.log('optimizing image ' + srcKey);
  async.waterfall([

    function download(next) {
      console.log('downloading image');
      s3.getObject({
        Bucket: bucket,
        Key: srcKey
      }, next);
    },

    function convert(response, next) {
      console.log('converting image');
      gm(response.Body)
        .antialias(true)
        .density(72)
        .toBuffer('jpg', function (err, buffer) {
          if (err) {
            next(err);  // call the main callback in case of error
          }
          else {
            next(null, buffer);
          }
        });
    },

    function process(response, next) {

      var promises = [];

      function processImage(response, index) {
        var deferred = Q.defer();
        console.log('processing image');
        //get image size
        gm(response).size(function (err, imgSize) {

          var width = _sizesArray[index].width;

          var position = fileName.lastIndexOf('.');
          var key = srcPath + _sizesArray[index].destinationPath + "/"+ fileName.slice(0, position) + ".jpg";

          if (imgSize.width > width) {
            console.log('image resizing ' + imgSize.width + ' --> ' + width);
            this.resize(width).toBuffer('jpg', function (err, buffer) {
              if(err) {
                deferred.reject(err);
                return;
              }
              console.log('uploading image ' + key + ' to bucket ' + destinationBucket);
              s3.putObject({
                Bucket: destinationBucket,
                Key: key,
                Body: buffer,
                ContentType: 'image/jpeg',
                ACL: 'public-read'
              }, function () {
                console.log('image uploaded');
                deferred.resolve();
              });
            });
          }

          else {
            //if the image is smaller than the current resize width no resizing is needed
            //just copy image to its destination bucket
            console.log('skipping image resizing');
            this.toBuffer('jpg', function (err, buffer) {
              console.log('uploading image ' + key + ' to bucket ' + destinationBucket);
              s3.putObject({
                Bucket: destinationBucket,
                Key: key,
                Body: buffer,
                ContentType: 'image/jpeg',
                ACL: 'public-read'
              }, function () {
                console.log('image uploaded');
                deferred.resolve();
              });
            });
          }
        });

        return deferred.promise;
      }

      for(var i = 0; i < _sizesArray.length; i++) (function(i) {
        promises.push(processImage(response, i));
      })(i);

      return Q.all(promises).then(
        function() {
          console.log('all resizing completed');
          next(null);
        }, function(err) {
          console.log('some resizing went wrong ' + err);
          next(err);
        });
    }

  ],
    function waterfallCallback (err) {
      if (err) {
        console.error('error during image optimization: ' + err);
      } else {
        console.error('image optimization successful');
      }
      context.done();
    });
};