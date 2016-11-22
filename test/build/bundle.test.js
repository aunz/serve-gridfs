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

var _nodeFetch = __webpack_require__(7);

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _tape = __webpack_require__(8);

var _src = __webpack_require__(2);

var _src2 = _interopRequireDefault(_src);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mongoConnection = _mongodb.MongoClient.connect('mongodb://localhost:27017/serve_grid_test');
mongoConnection.then(function (db) {
  db.collection('fs.files').count().then(function (r) {
    if (r) return;
    Promise.all([uploadFile('./test/cat.png', '001'), uploadFile('./test/mouse.jpeg', '002'), uploadFile('./test/bunny.mp4', '003')]).then(function () {
      console.log('DB setup completed.');
    });
  });

  function uploadFile(file, _id) {
    return new Promise(function (res, rej) {
      var bucket = new _mongodb.GridFSBucket(db);
      var uploadStream = bucket.openUploadStreamWithId(_id);
      (0, _fs.createReadStream)(file).on('error', rej).pipe(uploadStream).on('finish', res);
    });
  }
});

var app = (0, _express2.default)();
app.use(_express2.default.static('./test/build'));
app.use('/gridfs', (0, _src2.default)(mongoConnection)); // this is the serveGridfs middleware for end users
app.use('/gridfs-no-etag', (0, _src2.default)(mongoConnection, { etag: false }));
app.use('/gridfs-no-lastModified', (0, _src2.default)(mongoConnection, { lastModified: false }));
app.use(function (req, res, next) {
  res.end(404);
});

app.listen(3000, function () {
  console.log('\n\n\n\n\nExpress listening... and start testing now\n\n\n\n\n');
});

(0, _tape.test)('Fetching a file known to be present in the server', function (t) {
  t.plan(6);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/001').then(function (res) {
    t.equal(res.status, 200, 'return with a 200');
    t.equal(res.headers.get('cache-control'), 'public, max-age=31536000', 'cachable');
    t.equal(res.headers.get('content-length'), '134437', 'have the content-length');
    t.equal(res.headers.get('etag'), 'fc43bf18c7c58fdec94d3caa2108a25b', 'have etag');
    t.ok(new Date(res.headers.get('last-modified')) < new Date(), 'have last-modified');
    return res.buffer();
  }).then(function (buffer) {
    (0, _fs.readFile)('./test/cat.png', function (err, result) {
      t.equal(buffer.toString(), result.toString(), 'get the same cat pic');
      // t.end()
    });
  });
});

(0, _tape.test)('Fetching a file already cached', function (t) {
  t.plan(6);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/001', { headers: { 'If-None-Match': 'fc43bf18c7c58fdec94d3caa2108a25b' } }).then(function (res) {
    t.equal(res.status, 304, 'when If-None-Match is correctly set in request header');
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

(0, _tape.test)('Fetching a non-existent file', function (t) {
  t.plan(1);

  (0, _nodeFetch2.default)('http://localhost:3000/gridfs/004').then(function (res) {
    t.equal(res.status, 404, 'when no such file is present');
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

// borrowed from https://github.com/expressjs/serve-static/blob/master/index.js
function serveGridfs(mongoConnection) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return function serveGridfsMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (options.fallthrough) {
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
      var _options$bucketName = options.bucketName;
      var bucketName = _options$bucketName === undefined ? 'fs' : _options$bucketName;

      var _id = req.url.substr(1); // removing the first forward slash

      return db.collection(bucketName + '.files').findOne({ _id: _id }).then(function (doc) {
        if (!doc) {
          res.status(404).end();
          return null;
        }

        var headers = { // keys have to be in lowercase for the fresh function to work
          'cache-control': res.getHeader('Cache-Control') || options.cacheControl || 'public, max-age=' + (options.maxAge || '31536000'), // 60 * 60 * 24 * 365
          'content-length': doc.length
        };
        if (options.etag !== false) headers['etag'] = doc.md5;
        if (options.lastModified !== false) headers['last-modified'] = new Date(doc.uploadDate.toString()); // has to use toString() to get rid of the milliseconds which can cause freshness problem

        if (doc.contentType) {
          headers['content-type'] = doc.contentType;
          headers['X-Content-Type-Options'] = 'nosniff';
        }

        if ((0, _fresh2.default)(req.headers, headers)) {
          // the cache is still fresh
          res.status(304).end();
          return null;
        }

        Object.keys(headers).forEach(function (h) {
          return res.setHeader(h, headers[h]);
        });

        return new _mongodb.GridFSBucket(db, options).openDownloadStream(_id).on('error', next).pipe(res);
      });
    }).catch(next);
  };
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
/* 6 */,
/* 7 */
/***/ function(module, exports) {

module.exports = require("node-fetch");

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