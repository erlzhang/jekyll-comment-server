const mailgun = require('mailgun-js')
const config = require('./config')

const Notification = function () {
  const { MAILGUN_API_KEY, MAILGUN_DOMAIN } = process.env

  if ( !MAILGUN_API_KEY ) {
    return false;
  }

  this.agent = mailgun({
    apiKey: MAILGUN_API_KEY,
    domain: MAILGUN_DOMAIN
  })
}

Notification.prototype.notify = function (fields, options) {
  const { name, message } = fields
  const { url, title } = options
  const data = {
    from: 'Erl <admin@erl.im>',
    to: process.env.MAIL, 
    subject: `来自 ${name} 的评论`,
    html: `
<html>
  <body>
    <p>文章 <a href="${url}" target="_blank">${title}</a> 有新评论了:</p>
    <p>${message}</p>
  </body>
</html>
      ` 
  }

  return new Promise((resolve, reject) => {
    console.log("Start to notify author.")
    this.agent.messages().send(data, (err, body) => {
      if (err) {
        console.log(err)
        return reject(err)
      }

      return resolve(body)
    })
  })
}

Notification.prototype.reply = function (email, fields) {
}

module.exports = Notification
