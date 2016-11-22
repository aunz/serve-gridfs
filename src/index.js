// borrowed from https://github.com/expressjs/serve-static/blob/master/index.js
import { GridFSBucket } from 'mongodb'
import fresh from 'fresh'

/**
 *
 * @arg {object} options
 *   {
 *     bucketName: 'fs', // mongodb default
 *     chunkSizeBytes: 255 * 1024, //mongodb default
 *     cacheControl: true,
 *     maxAge: 0,
 *     etag: true,
 *     lastModified: true,
 *     
 *   }
 */

export default function serveGridfs(mongoConnection, options = {}) {
  return function serveGridfsMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (options.fallthrough) {
        next()
        return
      }

      // method not allowed
      res.setHeader('Allow', 'GET, HEAD')
      res.setHeader('Content-Length', '0')
      res.status(405).end()
      return
    }


    mongoConnection
      .then(db => {
        const { bucketName = 'fs' } = options
        const _id = req.url.substr(1) // removing the first forward slash

        return db.collection(bucketName + '.files')
          .findOne({ _id })
          .then(doc => {
            if (!doc) {
              res.status(404).end()
              return null
            }

            const headers = { // keys have to be in lowercase for the fresh function to work
              'cache-control': res.getHeader('Cache-Control') || options.cacheControl || 'public, max-age=' + (options.maxAge || '31536000'), // 60 * 60 * 24 * 365
              'content-length': doc.length,
            }
            if (options.etag !== false) headers['etag'] = doc.md5
            if (options.lastModified !== false) headers['last-modified'] = new Date(doc.uploadDate.toString()) // has to use toString() to get rid of the milliseconds which can cause freshness problem

            if (doc.contentType) {
              headers['content-type'] = doc.contentType
              headers['X-Content-Type-Options'] = 'nosniff'
            }

            if (fresh(req.headers, headers)) { // the cache is still fresh
              res.status(304).end()
              return null
            }

            Object.keys(headers).forEach(h => res.setHeader(h, headers[h]))

            return new GridFSBucket(db, options)
              .openDownloadStream(_id)
              .on('error', next)
              .pipe(res)
          })
      })
      .catch(next)
  }
}
