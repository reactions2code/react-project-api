// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for examples
const Post = require('../models/post')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnershipComments = customErrors.requireOwnershipComments

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()
// CREATE
// POST /examples
router.post('/posts/:id/comments', requireToken, (req, res, next) => {
  // set owner of new example to be current user
  req.body.comment.owner = req.user.id
  const newComment = req.body.comment
  Post.findById(req.params.id)
    .then(post => {
      post.comments.push(newComment)
      return post.save()
    })
    // respond to succesful `create` with status 201 and JSON of new "example"
    .then(post => {
      res.status(201).json({ post: post.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /examples/5a7db6c74d55bc51bdf39793
router.patch('/posts/:id/comments/:commentid', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.comment.owner
  const commentId = req.params.commentid
  const postId = req.params.id
  const commentUpdate = req.body.comment.content
  Post.findById(postId)
    .then(handle404)
    .then(post => {
      requireOwnershipComments(req, post)
      post.comments.id(commentId).content = commentUpdate
      return post.save()
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /examples/5a7db6c74d55bc51bdf39793
router.delete('/posts/:id/comments/:commentid', requireToken, (req, res, next) => {
  const postId = req.params.id
  const commentId = req.params.commentid
  Post.findById(postId)
    .then(handle404)
    .then(post => {
      requireOwnershipComments(req, post)
      post.comments.id(commentId).remove()
      return post.save()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// INDEX
router.get('/posts/:id/comments', requireToken, (req, res, next) => {
  const postId = req.params.id
  Post.findById(postId)
    .then(post => {
      // `examples` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return post.comments.map(comments => comments.toObject())
    })
    // respond with status 200 and JSON of the examples
    .then(post => res.status(200).json({ post: post }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
