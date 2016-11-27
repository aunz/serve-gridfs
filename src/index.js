// borrowed from https://github.com/expressjs/serve-static/blob/master/index.js
import { GridFSBucket } from 'mongodb'
import fresh from 'fresh'
import parseRange from 'range-parser'

/**
 *
 * @arg {object} options
 *   {
 *     bucketName: {string}, // mongodb default is 'fs'
 *     chunkSizeBytes: {number}, //mongodb default is 255 * 1024
 *     byId: {bool}, default to true, if set to false, will download by filename
 *     cacheControl: {bool|string}, // default not set (not false)
 *     maxAge: {number}, // default to 0
 *     etag: {bool}, // default not set (not false)
 *     lastModified: {bool}, // default not set (not false)
 *     acceptRanges: {bool}, // default not set (not false)
 *     fallthrough: {bool}, // default none (not false)
 *     setHeaders: {fn}, // default none, signature: function setHeaders(res, path, stat) {
 *       path is the req.url file
 *       stat is the info from mongodb fs.files if the file is present
 *     }
 *   }
 */

export default function serveGridfs(mongoConnection, options = {}) {
  const { bucketName = 'fs' } = options
  return function serveGridfsMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (options.fallthrough !== false) {
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
        const _id = req.url.substr(1) // removing the first forward slash
        const cursor = db.collection(bucketName + '.files')
        const findOne = options.byId !== false ? cursor.findOne({ _id }) : cursor.findOne({ filename: _id })
        return findOne.then(doc => {
          if (!doc) {
            if (options.fallthrough !== false) {
              next()
            } else {
              res.status(404)
              next(new Error('FileNotFound'))
            }
            return
          }

          // create a temp headers
          const headers = makeHeaders(res, doc, options)

          // check cache
          if (isConditionalGET(req.headers) && fresh(req.headers, headers)) {
            res.status(304).end()
            return
          }

          // range support
          const { ranges, start, end } = makeRanges(req, res, headers, doc.length, options)
          if (ranges === -1) {
            res.end()
            return
          }

          // adjust content-length
          headers['content-length'] = end - start

          // assign the temp headers to res.headers
          Object.keys(headers).forEach(h => res.getHeader(h) || res.setHeader(h, headers[h]))
          if (options.setHeader) options.setHeader(res, _id, doc)

          // HEAD support
          if (req.method === 'HEAD') {
            res.end()
            return
          }
          new GridFSBucket(db, { options })[
            options.byId !== false
              ? 'openDownloadStream'
              : 'openDownloadStreamByName'
          ](_id, { start, end })
            .on('error', next)
            .pipe(res)
        })
      })
      .catch(next)
  }
}

function makeHeaders(res, doc, options) {
  const headers = {} // keys have to be in lowercase for the fresh function to work
  const {
    cacheControl,
    maxAge = 0,
    etag,
    lastModified,
    acceptRanges,
  } = options

  if (cacheControl !== false) headers['cache-control'] = cacheControl || 'public, max-age=' + maxAge
  if (etag !== false) headers['etag'] = doc.md5
  if (lastModified !== false) headers['last-modified'] = new Date(doc.uploadDate.toString()) // has to use toString() to get rid of the milliseconds which can cause freshness problem
  if (acceptRanges !== false) headers['accept-ranges'] = 'bytes'
  if (doc.contentType) {
    headers['content-type'] = doc.contentType
    headers['X-Content-Type-Options'] = 'nosniff'
  }

  return headers
}

function makeRanges(req, res, headers, len, options) {
  let ranges = req.headers.range
  let start = 0
  let end = len
  if (options.acceptRanges !== false && /^ *bytes=/.test(ranges)) { // BYTES_RANGE_REGEXP
    ranges = parseRange(len, ranges, { combine: true })

    if (!isRangeFresh(req.headers.range, headers)) ranges = -2

    if (ranges === -1) {
      res.setHeader('Content-Range', contentRange('bytes', end))

      // 416 Requested Range Not Satisfiable
      res.status(416).end()
    }

    // valid (syntactically invalid/multiple ranges are treated as a regular response)
    if (ranges !== -2 && ranges.length === 1) {
      // Content-Range
      res.status(206)
      res.setHeader('content-range', contentRange('bytes', end, ranges[0]))

      // adjust for requested range
      start += ranges[0].start
      end = ranges[0].end + 1
    }
  }
  return { ranges, start, end }
}

function isConditionalGET(reqHeaders) {
  return reqHeaders['if-none-match'] || reqHeaders['if-modified-since']
}

function isRangeFresh(reqHeader, resHeader) { // eslint-disable-line no-inner-declarations
  const ifRange = reqHeader['if-range']
  if (!ifRange) return true
  return ~ifRange.indexOf('"') // eslint-disable-line no-bitwise
    ? ~ifRange.indexOf(resHeader['etag']) // eslint-disable-line no-bitwise
    : Date.parse(resHeader['last-modified']) <= Date.parse(ifRange)
}

function contentRange(type, size, range) { // eslint-disable-line no-inner-declarations
  return type + ' ' + (range ? range.start + '-' + range.end : '*') + '/' + size
}
