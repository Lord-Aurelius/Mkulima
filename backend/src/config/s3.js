const { S3Client } = require("@aws-sdk/client-s3");
const env = require("./env");

const s3 = new S3Client({
  region: env.s3.region,
  endpoint: env.s3.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.s3.accessKeyId,
    secretAccessKey: env.s3.secretAccessKey
  }
});

module.exports = s3;
