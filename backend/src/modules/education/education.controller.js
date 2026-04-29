const asyncHandler = require("../../lib/async-handler");
const { cleanMultiline, cleanString } = require("../../utils/sanitize");
const { collect, required } = require("../../utils/validators");
const service = require("./education.service");

const listPosts = asyncHandler(async (req, res) => {
  const posts = await service.listPosts(req.auth, req.query.farmId);
  res.json({ posts });
});

const createPost = asyncHandler(async (req, res) => {
  const { title, body, farmId } = req.body;
  const errors = collect(required(title, "Title"), required(body, "Body"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const post = await service.createPost(req.auth, {
    farmId,
    title: cleanString(title, 160),
    body: cleanMultiline(body, 3000),
    file: req.file || null
  });

  res.status(201).json({ post });
});

module.exports = {
  createPost,
  listPosts
};
