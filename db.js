const { Client } = require('pg')

const Db = function () {
  this.client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }) 
  this.client.connect()
}

Db.prototype.add = async function (params) {
  console.log("Start to save email.")
  const { id, name, email, url } = params

  this.client.query('INSERT INTO comments (id, name, email, url) VALUES ($1, $2, $3, $4)', [id, name, email, url])
  .then((res) => {
    console.log("Save new email successfully!")
    this.client.end()
  })
  .catch((e) => {
    console.error(e.stack)
  })
}

Db.prototype.get = async function (id) {
  this.client.query(`SELECT name, email, url FROM comments WHERE id='${id}'`)
  .then((res) => {
    if ( res.rows && res.rows.length ) {
      return res.rows[0]
    } else {
      return false;
    }
  })
  .catch((e) => {
    console.err(e.stack)
    return false;
  })
}

module.exports = Db
