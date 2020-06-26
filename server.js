const express = require('express')
const bodyParser = require('body-parser')
const md5 = require('md5')
const config = require('./config')
const Github = require("@octokit/rest")
const uuid = require('uuid/v1')
const cors = require('cors')
const yaml = require('js-yaml')

const notification = require('./notification')

const API = function () {
  this.port = config.port
  this.server = express()

  // set cors
  this.corsOptions = {
    origin: function (origin, callback) {
      if (!config.cors) {
        return callback(null, true);
      }

      const whitelist = config.cors.allowed_domains
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    }
  }
}

API.prototype.constructor = API

API.prototype.serve = function () {
  this.server.use( bodyParser.urlencoded({ extended: true }) )
  this.server.get('/', (req, res) => res.send('Hello World!'))

  this.server.post("/post-comment", cors(this.corsOptions), (req, res, next) => {

    console.log("Start to check params.")

    const { options, fields } = req.body

    if ( !options || !options["slug"] ) {
      return res.status(402).send("Missing options!")
    }

    if ( !fields ) {
      return res.status(402).send("Missing fields!")
    }

    const blacklistPassed = this.checkBlackList(fields);
    if ( !blacklistPassed ) {
      return res.status(403).send("Request not allowed!")
    }

    if (!this.checkContentValid(fields["message"])) {
      return res.status(403).send("No Chinese word in your message!");
    }

    const [isFieldsValid, err] = this.checkFieldsValid(fields)
    if ( !isFieldsValid ) {
      return res.status(402).send(err)
    }

    console.log("Start to create file.")
    const files = this.createFile(options.slug, fields)
    
    console.log("Start to post comment to github.")
    this.postComment(files, res)

    new notification(fields, options)
  })

  this.server.listen(process.env.PORT || this.port, () => {
    console.log(`Start app listening on port ${this.port}`)
  })
}

API.prototype.checkBlackList = function (fields) {
  const blacklist = config.blacklist;
  for (let field in blacklist) {
    const val = fields[field];
    const isValid = blacklist[field].every(item => {
      return !val || val.indexOf(item) === -1;
    });
    if (!isValid) {
      console.error(`${val} is not allowed!`)
      return false;
    }
  }

  return true;
}

API.prototype.checkContentValid = function(content) {
  const reg = new RegExp("[\u4e00-\u9fa5]", "g");
  return reg.test(content);
}

API.prototype.checkFieldsValid = function (fields) {
  const required = ["name", "email", "message"]
  for ( let field of required ) {
    if ( !fields[field] ) {
      return [false, `Field ${field} is required!`]
    }
  }
  return [true, ""]
}

API.prototype.createFile = function (slug, fields) {
  const timestamp = Date.now()
  const datetime = Math.floor( timestamp / 1000 )
  const { name, parent, email, url, message } = fields

  this.output = {
    _id: uuid(),
    parent: parent,
    name: name,
    email: md5(email),
    url: url,
    message: message,
    date: datetime
  }

  const path = `_data/comments/${slug}/comment-${timestamp}.yml`
  const content = yaml.safeDump(this.output)

  console.log(content)

  return [{
    path: path,
    mode: '100644',
    type: 'blob',
    content: content
  }]
}

API.prototype.postComment = async function (files, res) {
  const token = process.env.GITHUB_TOKEN
  const { user, repo, branch } = config.github

  const github = new Github({
    auth: token
  })

  const ref = `heads/${branch}`
  let baseTree = null

  github.git.getRef({
    owner: user,
    repo: repo,
    ref: ref
  })
  .then(({ data }) => {
    baseTree = data.object.sha
    return github.git.createTree({
      owner: user,
      repo: repo,
      tree: files,
      base_tree: baseTree
    })
  })
  .then(({ data }) => {
    return github.git.createCommit({
      owner: user,
      repo: repo,
      message: `New Comment by ${this.output.name}`,
      tree: data.sha,
      parents: [baseTree]
    })
  })
  .then(({ data }) => {
    return github.git.updateRef({
      owner: user,
      repo: repo,
      ref: ref,
      sha: data.sha
    })
  })
  .then(() => {
    res.json({
      fields: this.output
    })
  })
  .catch((err) => {
    console.error(err)
    res.send("Fail to post comment to github!")
  })
}

module.exports = API
