const normals = require('polyline-normals')
const extract = require('svg-path-contours')
const norm = require('normalize-svg-path')
const parse = require('parse-svg-path')
const abs = require('abs-svg-path')
const cheerio = require('cheerio')
const uniq = require('uniq')
const fs = require('fs')

const contents = fs.readFileSync(process.argv[2], 'utf8')
const $ = cheerio.load(contents)
const svg = $('svg line, svg path')

