const AV = require('leancloud-storage');
console.log("env", process.env)
const { LEANCLOUD_APP_ID, LEANCLOUD_APP_KEY, LEANCLOUD_DB_LINK } = process.env
AV.init({
  appId: LEANCLOUD_APP_ID,
  appKey: LEANCLOUD_APP_KEY,
  serverURL: LEANCLOUD_DB_LINK
})

const Comment = AV.Object.extend("comment");

const Db = function() {}

Db.prototype.add = async function(params) {
  const comment = new Comment();
  const { id, name, email, url } = params;
  comment.set("id", id);
  comment.set("name", name);
  comment.set("email", email);
  comment.set("url", url);

  comment.save()
    .then((res) => {
      console.log("Save new email successfully!")
    })
    .catch((e) => {
      console.error(e.stack)
    })
}

Db.prototype.get = function (id) {
  console.log(`Start to get email by ${id}.`)
  const query = new AV.Query('comment');
  query.equalTo('id', id);
  return query.find().then(function(comments) {
    const rows = []
    if (comments.length > 0) {
      rows[0] = comments[0].attributes;
    }
    return {
      rows
    }
  });
}

module.exports = Db