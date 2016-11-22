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
      uploadFile('./test/mouse.jpeg', '002'),
      uploadFile('./test/bunny.mp4', '003'),
    ]).then(() => {
      console.log('DB setup completed.')
    })
  })

  function uploadFile(file, _id) {
    return new Promise((res, rej) => {
      const bucket = new GridFSBucket(db)
      const uploadStream = bucket.openUploadStreamWithId(_id)
      createReadStream(file)
        .on('error', rej)
        .pipe(uploadStream)
        .on('finish', res)
    })
  }
})


const app = express()
app.use(express.static('./test/build'))
app.use('/gridfs', serveGridfs(mongoConnection)) // this is the serveGridfs middleware for end users
app.use('/gridfs-no-etag', serveGridfs(mongoConnection, { etag: false }))
app.use('/gridfs-no-lastModified', serveGridfs(mongoConnection, { lastModified: false }))
app.use((req, res, next) => {
  res.end(404)
})

app.listen(3000, function () {
  console.log('\n\n\n\n\nExpress listening... and start testing now\n\n\n\n\n')
})


test('Fetching a file known to be present in the server', t => {
  t.plan(6)

  fetch('http://localhost:3000/gridfs/001')
    .then(res => {
      t.equal(res.status, 200, 'return with a 200')
      t.equal(res.headers.get('cache-control'), 'public, max-age=31536000', 'cachable')
      t.equal(res.headers.get('content-length'), '134437', 'have the content-length')
      t.equal(res.headers.get('etag'), 'fc43bf18c7c58fdec94d3caa2108a25b', 'have etag')
      t.ok(new Date(res.headers.get('last-modified')) < new Date(), 'have last-modified')
      return res.buffer()
    })
    .then(buffer => {
      readFile('./test/cat.png', (err, result) => {
        t.equal(buffer.toString(), result.toString(), 'get the same cat pic')
        // t.end()
      })
    })
})


test('Fetching a file already cached', t => {
  t.plan(6)

  fetch('http://localhost:3000/gridfs/001', { headers: { 'If-None-Match': 'fc43bf18c7c58fdec94d3caa2108a25b' } })
    .then(res => {
      t.equal(res.status, 304, 'when If-None-Match is correctly set in request header')
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

test('Fetching a non-existent file', t => {
  t.plan(1)

  fetch('http://localhost:3000/gridfs/004')
    .then(res => {
      t.equal(res.status, 404, 'when no such file is present')
    })
})
