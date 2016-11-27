import { createReadStream, readFile } from 'fs'

import express from 'express'
import { MongoClient, GridFSBucket } from 'mongodb'
import fetch from 'node-fetch'
import { test } from 'tape'

import serveGridfs from '../src'

const mongoConnection = MongoClient.connect('mongodb://localhost:27017/serve_grid_test')
mongoConnection.then(db => {
  db.collection('fs.files').count().then(r => {
    if (r) return
    Promise.all([
      uploadFile('./test/cat.png', '001'),
      uploadFile('./test/mouse.jpeg', '002', { contentType: 'image/jpeg' }),
      uploadFile('./test/cat.png', 'cat', { filename: 'catcat.png' }),
      uploadFile('./test/mouse.jpeg', 'm/mouse.jpeg'),
      uploadFile('./test/number.txt', '003'),
    ]).then(() => {
      console.log('DB setup completed.')
    })
  })

  db.collection('fs2.files').count().then(r => {
    if (r) return
    Promise.all([
      uploadFile('./test/cat.png', '001b', '', { bucketName: 'fs2' }),
    ]).then(() => {
      console.log('DB2 setup completed.')
    })
  })

  function uploadFile(file, _id, { filename, contentType } = {}, options = {}) {
    return new Promise((res, rej) => {
      const bucket = new GridFSBucket(db, options)
      const uploadStream = bucket.openUploadStreamWithId(_id, filename, { contentType })
      createReadStream(file)
        .on('error', rej)
        .pipe(uploadStream)
        .on('finish', res)
    })
  }
})


const app = express()
app.use((req, res, next) => {
  next()
})
app.use(express.static('./test/build'))
app.use('/gridfs', serveGridfs(mongoConnection)) // this is the serveGridfs middleware for end users
app.use('/gridfs-no-fallthrough', serveGridfs(mongoConnection, { fallthrough: false }))
app.use('/gridfs-maxAge10', serveGridfs(mongoConnection, { maxAge: 10 }))
app.use('/gridfs-maxAge0', serveGridfs(mongoConnection, { maxAge: 0 }))
app.use('/gridfs-no-cacheControl', serveGridfs(mongoConnection, { cacheControl: false }))
app.use('/gridfs-set-cacheControl', serveGridfs(mongoConnection, { cacheControl: 'blah blah' }))
app.use('/gridfs-no-etag', serveGridfs(mongoConnection, { etag: false }))
app.use('/gridfs-no-lastModified', serveGridfs(mongoConnection, { lastModified: false }))
app.use('/gridfs-byname', serveGridfs(mongoConnection, { byId: false }))
app.use('/gridfs-setHeaders', serveGridfs(mongoConnection, { setHeader }))
function setHeader(res, _id, doc) {
  res.setHeader('tada', 'peanut')
  res.setHeader('content-type', 'picture')
  res.setHeader('_id', _id)
  res.setHeader('doclength', doc.length)
}
app.use('/gridfs2', serveGridfs(mongoConnection, { bucketName: 'fs2' }))

app.use((req, res) => {
  res.status(404).end('Nothing found')
})

app.use((error, req, res, next) => {
  console.log('the error', error)
  res.end('Some error')
})

app.listen(3000, function () {
  console.log('\n\n\n\n\nExpress listening... and start testing now\n\n\n\n\n')
})


test('Fetching a file known to be present in the server', t => {
  t.plan(13)

  fetch('http://localhost:3000/gridfs/001')
    .then(res => {
      t.equal(res.status, 200, 'return with a 200')
      t.equal(res.headers.get('cache-control'), 'public, max-age=0', 'cachable')
      t.equal(res.headers.get('content-length'), '134437', 'have content-length')
      t.equal(res.headers.get('etag'), 'fc43bf18c7c58fdec94d3caa2108a25b', 'have etag')
      t.equal(res.headers.get('accept-ranges'), 'bytes', 'have accept-ranges')
      t.equal(res.headers.get('content-type'), null, 'cat has no content-type')
      t.ok(new Date(res.headers.get('last-modified')) < new Date(), 'have last-modified')
      return res.buffer()
    })
    .then(buffer => {
      readFile('./test/cat.png', (err, result) => {
        t.equal(buffer.toString(), result.toString(), 'get the same cat pic')
      })
    })

  fetch('http://localhost:3000/gridfs/002')
    .then(res => {
      t.equal(res.headers.get('content-type'), 'image/jpeg', 'mouse has content-type')
    })

  fetch('http://localhost:3000/gridfs/m/mouse.jpeg')
    .then(res => {
      t.equal(res.status, 200, 'Can fetch file with slash')
      t.equal(res.headers.get('etag'), '349e676ef9e4aff7e9d7bab6b52c44ce', 'with the right etag')
    })

  fetch('http://localhost:3000/gridfs-byname/catcat.png')
    .then(res => {
      t.equal(res.status, 200, 'Can fetch file by name')
      t.equal(res.headers.get('etag'), 'fc43bf18c7c58fdec94d3caa2108a25b', 'with the right etag')
    })
})


test('Fetching a file already cached', t => {
  t.plan(7)

  fetch('http://localhost:3000/gridfs/001', { headers: { 'If-None-Match': 'fc43bf18c7c58fdec94d3caa2108a25b' } })
    .then(res => {
      t.equal(res.status, 304, 'when If-None-Match is correctly set in request header')
      const n = JSON.stringify([
        res.headers.get('cache-control'),
        res.headers.get('content-length'),
        res.headers.get('etag'),
        res.headers.get('accept-ranges'),
        res.headers.get('content-type'),
        res.headers.get('last-modified'),
      ])
      t.equal(n, '[null,null,null,null,null,null]', 'empty headers when 304')
    })
  fetch('http://localhost:3000/gridfs/001', { headers: { 'If-None-Match': '' } })
    .then(res => {
      t.equal(res.status, 200, 'when If-None-Match is NOT correctly set in request header')
    })
  fetch('http://localhost:3000/gridfs-no-etag/001', { headers: { 'If-None-Match': 'fc43bf18c7c58fdec94d3caa2108a25b' } })
    .then(res => {
      t.equal(res.status, 200, 'etag is disabled in server')
    })

  fetch('http://localhost:3000/gridfs/001', { headers: { 'If-Modified-Since': new Date().toString() } })
    .then(res => {
      t.equal(res.status, 304, 'when If-Modified-Since is correctly set in request header')
    })
  fetch('http://localhost:3000/gridfs/001', { headers: { 'If-Modified-Since': new Date('1/1/1111').toString() } }) // ancient time
    .then(res => {
      t.equal(res.status, 200, 'when If-Modified-Since is NOT correctly set in request header')
    })
  fetch('http://localhost:3000/gridfs-no-lastModified/001', { headers: { 'If-Modified-Since': new Date().toString() } })
    .then(res => {
      t.equal(res.status, 200, 'lastModified is disabled in server')
    })
})

test('Setting cacheControl and maxAge', t => {
  t.plan(4)
  fetch('http://localhost:3000/gridfs-maxAge10/001')
    .then(res => {
      t.equal(res.headers.get('cache-control'), 'public, max-age=10', 'can change maxAge')
    })

  fetch('http://localhost:3000/gridfs-maxAge0/001')
    .then(res => {
      t.equal(res.headers.get('cache-control'), 'public, max-age=0', 'can change maxAge')
    })

  fetch('http://localhost:3000/gridfs-no-cacheControl/001')
    .then(res => {
      t.equal(res.headers.get('cache-control'), null, 'no cache control')
    })

  fetch('http://localhost:3000/gridfs-set-cacheControl/001')
    .then(res => {
      t.equal(res.headers.get('cache-control'), 'blah blah', 'setting cache control to arbitrary blah blah')
    })
})

test('Fetching a non-existent file', t => {
  t.plan(6)

  fetch('http://localhost:3000/gridfs/004')
    .then(res => {
      t.equal(res.status, 404, 'when no such file is present')
      return res.buffer()
    })
    .then(buffer => {
      t.equal(buffer.toString(), 'Nothing found', 'The req has passed thru to a downstream middleware')
    })
  fetch('http://localhost:3000/gridfs-no-fallthrough/004')
    .then(res => {
      t.equal(res.status, 404, 'when no such file is present')
      return res.buffer()
    })
    .then(buffer => {
      t.equal(buffer.toString(), 'Some error', 'The req did not pass thru')
    })

  fetch('http://localhost:3000/gridfs-byname/cat')
    .then(res => {
      t.equal(res.status, 404, 'Gridfs-byname no _id')
    })

  fetch('http://localhost:3000/gridfs-byname/001')
    .then(res => {
      t.equal(res.status, 404, 'Gridfs-byname no _id')
    })
})

test('Changing bucketName', t => {
  t.plan(2)

  fetch('http://localhost:3000/gridfs2/001b')
    .then(res => {
      t.equal(res.status, 200, 'able to change bucketName')
    })

  fetch('http://localhost:3000/gridfs2/001')
    .then(res => {
      // console.log(res )
      t.equal(res.status, 404, 'No such file in this bucket fs2')
    })
})

test('Range request', t => {
  t.plan(10)

  fetch('http://localhost:3000/gridfs/003', { headers: { range: 'bytes=0-10' } })
    .then(res => {
      t.equal(res.status, 206, 'status 206 partial content')
      t.equal(res.headers.get('content-range'), 'bytes 0-10/62', 'bytes=0-10')
      t.equal(res.headers.get('content-length'), '11', 'content-length 11')
      t.equal(res.headers.get('etag'), 'b9b3cc3f3a30d8ef2bb1e2e267ed97de', 'txt file has a right etag')
      return res.buffer()
    })
    .then(buffer => {
      t.equal(buffer.toString(), '0123456789a', 'txt has the right content')
    })

  fetch('http://localhost:3000/gridfs/003', { headers: { range: 'bytes=haha a string' } })
    .then(res => {
      t.equal(res.status, 416, 'status 416 when bytes=string ')
      t.equal(res.headers.get('content-range'), 'bytes */62', 'no content')
      t.equal(res.headers.get('content-length'), '0', 'content-length 0')
    })
  fetch('http://localhost:3000/gridfs/003', { headers: { range: 'bytes=62' } })
    .then(res => {
      t.equal(res.status, 416, 'status 416 when bytes exceeding content-length ')
    })
  fetch('http://localhost:3000/gridfs/003', { headers: { range: 'apple' } })
    .then(res => {
      t.equal(res.status, 200, 'respond with 200 when syntactically invalid')
    })
})

test('Setting res.headers in server', t => {
  t.plan(4)

  fetch('http://localhost:3000/gridfs-setHeaders/002')
    .then(res => {
      t.equal(res.headers.get('tada'), 'peanut', 'new peanut header')
      t.equal(res.headers.get('content-type'), 'picture', 'change content-type')
      t.equal(res.headers.get('_id'), '002', 'can set _id')
      t.equal(res.headers.get('doclength'), '18573', 'can read doc')
    })
})

test('HEAD, POST, PUT, DELETE methods', t => {
  t.plan(7)
  fetch('http://localhost:3000/gridfs/001', { method: 'head' })
    .then(res => {
      t.equal(res.status, 200, 'Can do HEAD')
      return res.buffer()
    })
    .then(buffer => {
      t.equal(buffer.toString(), '', 'HEAD should have no body')
    })
  fetch('http://localhost:3000/gridfs/001', { method: 'post' })
    .then(res => {
      t.equal(res.status, 404, 'Cannot do POST')
    })
  fetch('http://localhost:3000/gridfs/001', { method: 'put' })
    .then(res => {
      t.equal(res.status, 404, 'Cannot do PUT')
    })
  fetch('http://localhost:3000/gridfs/001', { method: 'put' })
    .then(res => {
      t.equal(res.status, 404, 'Cannot do DELETE')
    })
  fetch('http://localhost:3000/gridfs-no-fallthrough/001', { method: 'post' })
    .then(res => {
      t.equal(res.status, 405, 'no fallthrough with post')
    })
  fetch('http://localhost:3000/gridfs-no-fallthrough/001', { method: 'put' })
    .then(res => {
      t.equal(res.status, 405, 'no fallthrough with put')
    })
})
