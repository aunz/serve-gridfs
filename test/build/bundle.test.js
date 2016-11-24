module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 9);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

module.exports = require("mongodb");

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
'use strict';

var _fs = __webpack_require__(5);

var _express = __webpack_require__(3);

var _express2 = _interopRequireDefault(_express);

var _mongodb = __webpack_require__(0);

var _nodeFetch = __webpack_require__(6);

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _tape = __webpack_require__(8);

var _src = __webpack_require__(2);

var _src2 = _interopRequireDefault(_src);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mongoConnection = _mongodb.MongoClient.connect('mongodb://localhost:27017/serve_grid_test');
mongoConnection.then(function (db) {
  db.collection('fs.files').count().then(function (r) {
    if (r) return;
    Promise.all([uploadFile('./test/cat.png', '001'), uploadFile('./test/mouse.jpeg', '002', 'image/jpeg'), uploadFile('./test/bunnyBig.mp4', 'bunnyBig.mp4', 'video/mp4'), uploadFile('./test/cat.png', 'cat.png'), uploadFile('./test/mouse.jpeg', 'mouse.jpeg'), uploadFile('./test/number.txt', '003')]).then(function () {
      console.log('DB setup completed.');
    });
  });

  function uploadFile(file, _id, contentType) {
    return new Promise(function (res, rej) {
      var bucket = new _mongodb.GridFSBucket(db);
      var uploadStream = bucket.openUploadStreamWithId(_id, '', { contentType: contentType });
      (0, _fs.createReadStream)(file).on('error', rej).pipe(uploadStream).on('finish', res);
    });
  }
});

var app = (0, _express2.default)();
app.use(function (req, res, next) {
  next();
});
app.use(_express2.default.static('./test/build'));
app.use('/gridfs', (0, _src2.default)(mongoConnection)); // this is the serveGridfs middleware for end users
app.use('/gridfs-maxAge10', (0, _src2.default)(mongoConnection, { maxAge: 10 }));
app.use('/gridfs-maxAge0', (0, _src2.default)(mongoConnection, { maxAge: 0 }));
app.use('/gridfs-no-cacheControl', (0, _src2.default)(mongoConnection, { cacheControl: false }));
app.use('/gridfs-set-cacheControl', (0, _src2.default)(mongoConnection, { cacheControl: 'blah blah' }));
app.use('/gridfs-no-etag', (0, _src2.default)(mongoConnection, { etag: false }));
app.use('/gridfs-no-lastModified', (0, _src2.default)(mongoConnection, { lastModified: false }));
app.use('/gridfs-setHeaders', (0, _src2.default)(mongoConnection, { setHeader: setHeader }));
function setHeader(res, _id, doc) {
  res.setHeader('tada', 'peanut');
  res.setHeader('content-type', 'picture');
  res.setHeader('_id', _id);
  res.setHeader('doclength', doc.length);
}

app.use(function (req, res, next) {
  res.end(404);
});

app.listen(3000, function () {
  console.log('\n\n\n\n\nExpress listening... and start testing now\n\n\n\n\n');
});

(0, _tape.test)('Fetching a file known to be present in the server', function (t) {
  t.plan(9);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/001').then(function (res) {
    t.equal(res.status, 200, 'return with a 200');
    t.equal(res.headers.get('cache-control'), 'public, max-age=0', 'cachable');
    t.equal(res.headers.get('content-length'), '134437', 'have content-length');
    t.equal(res.headers.get('etag'), 'fc43bf18c7c58fdec94d3caa2108a25b', 'have etag');
    t.equal(res.headers.get('accept-ranges'), 'bytes', 'have accept-ranges');
    t.equal(res.headers.get('content-type'), null, 'cat has no content-type');
    t.ok(new Date(res.headers.get('last-modified')) < new Date(), 'have last-modified');
    return res.buffer();
  }).then(function (buffer) {
    (0, _fs.readFile)('./test/cat.png', function (err, result) {
      t.equal(buffer.toString(), result.toString(), 'get the same cat pic');
      // t.end()
    });
  });

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/002').then(function (res) {
    t.equal(res.headers.get('content-type'), 'image/jpeg', 'mouse has content-type');
  });
});

(0, _tape.test)('Fetching a file already cached', function (t) {
  t.plan(7);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/001', { headers: { 'If-None-Match': 'fc43bf18c7c58fdec94d3caa2108a25b' } }).then(function (res) {
    t.equal(res.status, 304, 'when If-None-Match is correctly set in request header');
    var n = JSON.stringify([res.headers.get('cache-control'), res.headers.get('content-length'), res.headers.get('etag'), res.headers.get('accept-ranges'), res.headers.get('content-type'), res.headers.get('last-modified')]);
    t.equal(n, '[null,null,null,null,null,null]', 'empty headers when 304');
  });
  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/001', { headers: { 'If-None-Match': '' } }).then(function (res) {
    t.equal(res.status, 200, 'when If-None-Match is NOT correctly set in request header');
  });
  (0, _nodeFetch2.default)('http://localhost:3000/gridfs-no-etag/001', { headers: { 'If-None-Match': 'fc43bf18c7c58fdec94d3caa2108a25b' } }).then(function (res) {
    t.equal(res.status, 200, 'etag is disabled in server');
  });

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/001', { headers: { 'If-Modified-Since': new Date().toString() } }).then(function (res) {
    t.equal(res.status, 304, 'when If-Modified-Since is correctly set in request header');
  });
  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/001', { headers: { 'If-Modified-Since': new Date('1/1/1111').toString() } }) // ancient time
  .then(function (res) {
    t.equal(res.status, 200, 'when If-Modified-Since is NOT correctly set in request header');
  });
  (0, _nodeFetch2.default)('http://localhost:3000/gridfs-no-lastModified/001', { headers: { 'If-Modified-Since': new Date().toString() } }).then(function (res) {
    t.equal(res.status, 200, 'lastModified is disabled in server');
  });
});

(0, _tape.test)('Setting cacheControl and maxAge', function (t) {
  t.plan(4);
  (0, _nodeFetch2.default)('http://localhost:3000/gridfs-maxAge10/001').then(function (res) {
    t.equal(res.headers.get('cache-control'), 'public, max-age=10', 'can change maxAge');
  });

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs-maxAge0/001').then(function (res) {
    t.equal(res.headers.get('cache-control'), 'public, max-age=0', 'can change maxAge');
  });

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs-no-cacheControl/001').then(function (res) {
    t.equal(res.headers.get('cache-control'), null, 'no cache control');
  });

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs-set-cacheControl/001').then(function (res) {
    t.equal(res.headers.get('cache-control'), 'blah blah', 'setting cache control to arbitrary blah blah');
  });
});

(0, _tape.test)('Fetching a non-existent file', function (t) {
  t.plan(1);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/004').then(function (res) {
    t.equal(res.status, 404, 'when no such file is present');
  });
});

(0, _tape.test)('Range request', function (t) {
  t.plan(10);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/003', { headers: { range: 'bytes=0-10' } }).then(function (res) {
    t.equal(res.status, 206, 'status 206 partial content');
    t.equal(res.headers.get('content-range'), 'bytes 0-10/62', 'bytes=0-10');
    t.equal(res.headers.get('content-length'), '11', 'content-length 11');
    t.equal(res.headers.get('etag'), 'b9b3cc3f3a30d8ef2bb1e2e267ed97de', 'txt file has a right etag');
    return res.buffer();
  }).then(function (buffer) {
    t.equal(buffer.toString(), '0123456789a', 'txt has the right content');
  });

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/003', { headers: { range: 'bytes=haha a string' } }).then(function (res) {
    t.equal(res.status, 416, 'status 416 when bytes=string ');
    t.equal(res.headers.get('content-range'), 'bytes */62', 'no content');
    t.equal(res.headers.get('content-length'), '0', 'content-length 0');
  });
  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/003', { headers: { range: 'bytes=62' } }).then(function (res) {
    t.equal(res.status, 416, 'status 416 when bytes exceeding content-length ');
  });
  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/003', { headers: { range: 'apple' } }).then(function (res) {
    t.equal(res.status, 200, 'respond with 200 when syntactically invalid');
  });
});

(0, _tape.test)('Setting res.headers in server', function (t) {
  t.plan(4);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs-setHeaders/002').then(function (res) {
    t.equal(res.headers.get('tada'), 'peanut', 'new peanut header');
    t.equal(res.headers.get('content-type'), 'picture', 'change content-type');
    t.equal(res.headers.get('_id'), '002', 'can set _id');
    t.equal(res.headers.get('doclength'), '18573', 'can read doc');
  });
});

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = serveGridfs;

var _mongodb = __webpack_require__(0);

var _fresh = __webpack_require__(4);

var _fresh2 = _interopRequireDefault(_fresh);

var _rangeParser = __webpack_require__(7);

var _rangeParser2 = _interopRequireDefault(_rangeParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 *
 * @arg {object} options
 *   {
 *     bucketName: {string}, // mongodb default is 'fs'
 *     chunkSizeBytes: {number}, //mongodb default is 255 * 1024
 *     cacheControl: {bool|string}, // default not set (not false)
 *     maxAge: {number}, // default to 0
 *     etag: {bool}, // default not set (not false)
 *     lastModified: {bool}, // default not set (not false)
 *     acceptRanges: {bool}, // default not set (not false)
 *     fallthrough: {bool}, // default none (not false)
 *     setHeaders: {fn}, // default none, signature: function setHeaders(res, path, doc) {}
 *   }
 */

function serveGridfs(mongoConnection) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  var _options$bucketName = options.bucketName;
  var bucketName = _options$bucketName === undefined ? 'fs' : _options$bucketName;

  return function serveGridfsMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (options.fallthrough !== false) {
        next();
        return;
      }

      // method not allowed
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Length', '0');
      res.status(405).end();
      return;
    }

    mongoConnection.then(function (db) {
      var _id = req.url.substr(1); // removing the first forward slash

      return db.collection(bucketName + '.files').findOne({ _id: _id }).then(function (doc) {
        if (!doc) {
          res.status(404).end();
          return null;
        }

        // create a temp headers
        var headers = makeHeaders(res, doc, options);

        // check cache
        if (isConditionalGET(req.headers) && (0, _fresh2.default)(req.headers, headers)) {
          res.status(304).end();
          return null;
        }

        // range support

        var _makeRanges = makeRanges(req, res, headers, doc.length, options);

        var ranges = _makeRanges.ranges;
        var start = _makeRanges.start;
        var end = _makeRanges.end;

        if (ranges === -1) {
          res.end();
          return null;
        }

        // adjust content-length
        headers['content-length'] = end - start;

        // assign the temp headers to res.headers
        Object.keys(headers).forEach(function (h) {
          return res.getHeader(h) || res.setHeader(h, headers[h]);
        });
        if (options.setHeader) options.setHeader(res, _id, doc);

        // HEAD support
        if (req.method === 'HEAD') {
          res.end();
          return null;
        }

        return new _mongodb.GridFSBucket(db, { bucketName: bucketName }).openDownloadStream(_id, { start: start, end: end }).on('error', next).pipe(res);
      });
    }).catch(next);
  };
} // borrowed from https://github.com/expressjs/serve-static/blob/master/index.js


function makeHeaders(res, doc, options) {
  var headers = {}; // keys have to be in lowercase for the fresh function to work
  var cacheControl = options.cacheControl;
  var _options$maxAge = options.maxAge;
  var maxAge = _options$maxAge === undefined ? 0 : _options$maxAge;
  var etag = options.etag;
  var lastModified = options.lastModified;
  var acceptRanges = options.acceptRanges;


  if (cacheControl !== false) headers['cache-control'] = cacheControl || 'public, max-age=' + maxAge;
  if (etag !== false) headers['etag'] = doc.md5;
  if (lastModified !== false) headers['last-modified'] = new Date(doc.uploadDate.toString()); // has to use toString() to get rid of the milliseconds which can cause freshness problem
  if (acceptRanges !== false) headers['accept-ranges'] = 'bytes';
  if (doc.contentType) {
    headers['content-type'] = doc.contentType;
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  return headers;
}

function makeRanges(req, res, headers, len, options) {
  var ranges = req.headers.range;
  var start = 0;
  var end = len;
  if (options.acceptRanges !== false && /^ *bytes=/.test(ranges)) {
    // BYTES_RANGE_REGEXP
    ranges = (0, _rangeParser2.default)(len, ranges, { combine: true });

    if (!isRangeFresh(req.headers.range, headers)) ranges = -2;

    if (ranges === -1) {
      res.setHeader('Content-Range', contentRange('bytes', end));

      // 416 Requested Range Not Satisfiable
      res.status(416).end();
    }

    // valid (syntactically invalid/multiple ranges are treated as a regular response)
    if (ranges !== -2 && ranges.length === 1) {
      // Content-Range
      res.status(206);
      res.setHeader('content-range', contentRange('bytes', end, ranges[0]));

      // adjust for requested range
      start += ranges[0].start;
      end = ranges[0].end + 1;
    }
  }
  return { ranges: ranges, start: start, end: end };
}

function isConditionalGET(reqHeaders) {
  return reqHeaders['if-none-match'] || reqHeaders['if-modified-since'];
}

function isRangeFresh(reqHeader, resHeader) {
  // eslint-disable-line no-inner-declarations
  var ifRange = reqHeader['if-range'];
  if (!ifRange) return true;
  return ~ifRange.indexOf('"') // eslint-disable-line no-bitwise
  ? ~ifRange.indexOf(resHeader['etag']) // eslint-disable-line no-bitwise
  : Date.parse(resHeader['last-modified']) <= Date.parse(ifRange);
}

function contentRange(type, size, range) {
  // eslint-disable-line no-inner-declarations
  return type + ' ' + (range ? range.start + '-' + range.end : '*') + '/' + size;
}

/***/ },
/* 3 */
/***/ function(module, exports) {

module.exports = require("express");

/***/ },
/* 4 */
/***/ function(module, exports) {

module.exports = require("fresh");

/***/ },
/* 5 */
/***/ function(module, exports) {

module.exports = require("fs");

/***/ },
/* 6 */
/***/ function(module, exports) {

module.exports = require("node-fetch");

/***/ },
/* 7 */
/***/ function(module, exports) {

module.exports = require("range-parser");

/***/ },
/* 8 */
/***/ function(module, exports) {

module.exports = require("tape");

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(1);


/***/ }
/******/ ]);