# aws-lambda-image-compressor
AWS lambda function to compress and resize images 

This is a Lambda Function which resizes/reduces images automatially. When an image is put on some AWS S3 bucket, this function will resize/reduce it and save it into a new bucket.

I found 2 projects which doing the same but I could not make them properly work. With the first (https://github.com/ysugimoto/aws-lambda-image) I could not compress PNG images; with the second  (https://github.com/slimfancy/image-lambda) I had issues with packaging and module dependency on S3. 

I then decided to write my simple function and some gulp task to quickly deploy it into AWS. This article (http://jice.lavocat.name/blog/2015/image-conversion-using-amazon-lambda-and-s3-in-node.js/) was a great reference.

# image compression flow
The function should be invoked by a S3 trigger when a new image is uploaded to some S3 bucket. Once invoked, the function creates compressed and resized images of the original images and save them into another bucket. 

# requirements
node.js (AWS Lambda working version is 4.3.2)

# 
