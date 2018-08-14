const normals = require('polyline-normals')
const extract = require('svg-path-contours')
const norm = require('normalize-svg-path')
const parse = require('parse-svg-path')
const abs = require('abs-svg-path')
const uniq = require('uniq')

module.exports = svgToGpu

const palette = [
  [239, 66, 35],
  [255, 243, 42],
  [238, 61, 138],
  [250, 191, 183],
  [153, 202, 70],
  [57, 163, 215],
  [91, 154, 69],
  [150, 213, 210],
  [153, 100, 62],
  [244, 146, 0],
  [61, 47, 130]
].map(function (d) {
  return [d[0] / 255, d[1] / 255, d[2] / 255]
})

function svgToGpu (svg) {
  var circles = []
  var paths = []
  var scale = 1.5

  for (var i = 0; i < svg.childNodes.length; i++) {
    var node = svg.childNodes[i]

    switch (node.nodeName.toLowerCase()) {
      case 'path':
        var path = norm(abs(parse(node.getAttribute('d'))))

        paths.push(uniq(extract(path, scale)[0], compareVertex, true))
        circles.push(getEnds(path[0]), getEnds(path[path.length - 1]))
        break
      case 'line':
        var x1 = parseFloat(node.getAttribute('x1'))
        var x2 = parseFloat(node.getAttribute('x2'))
        var y1 = parseFloat(node.getAttribute('y1'))
        var y2 = parseFloat(node.getAttribute('y2'))
        circles.push([x1, y1], [x2, y2])
        paths.push([[x1, y1], [x2, y2]])
        break
    }
  }

  paths.sort(function (a, b) {
    return a[0][0] - b[0][0]
  })

  circles.sort(function (a, b) {
    return a[0] - b[0]
  })

  uniq(circles, compareVertex, false)

  return {
    paths: packPaths(paths),
    nodes: packNodes(circles)
  }

  function getEnds (path) {
    if (path[0] === 'M') {
      return path.slice(1)
    } else {
      return path.slice(-2)
    }
  }

  function compareVertex (a, b) {
    return threshold(a[0] - b[0], 2) || threshold(a[1] - b[1], 2)
  }

  function threshold (value, limit) {
    return Math.abs(value) < limit ? 0 : value
  }

  function packPaths (paths) {
    var aggregate = []
    var cells = []
    var pids = []
    var colors = []

    for (var i = 0, k = 0; i < paths.length; i++) {
      var path = paths[i]
      var norm = normals(path)
      var node = []
      var color = palette[Math.floor(Math.random() * palette.length)]

      for (var j = 0; j < norm.length; j++) {
        var nx = norm[j][0][0] * norm[j][1]
        var ny = norm[j][0][1] * norm[j][1]
        var px = path[j][0]
        var py = path[j][1]
        pids.push(i, i)
        node.push(px, py, +nx, +ny)
        node.push(px, py, -nx, -ny)
        colors.push(color[0], color[1], color[2])
        colors.push(color[0], color[1], color[2])
        if (j > 0) {
          cells.push([k, k + 1, k + 3], [k + 3, k + 2, k])
          k += 2
        }
      }

      aggregate.push(node)
      k += 2
    }

    if (k > 65536) {
      throw new Error('Too many elements in the paths')
    }

    var positionsLength = 0
    for (var i = 0; i < aggregate.length; i++) {
      positionsLength += aggregate[i].length
    }

    var data = new Float32Array(positionsLength)
    for (var i = 0, j = 0; i < aggregate.length; i++) {
      var node = aggregate[i]
      for (var k = 0; k < node.length; k++) {
        data[j++] = node[k]
      }
    }

    var elements = new Uint16Array(cells.length * 3)
    for (var i = 0, j = 0; i < cells.length; i++) {
      elements[j++] = cells[i][0]
      elements[j++] = cells[i][1]
      elements[j++] = cells[i][2]
    }

    return {
      ids: new Float32Array(pids),
      colors: new Float32Array(colors),
      positions: data,
      elements: elements
    }
  }

  function packNodes (nodes) {
    var data = new Float32Array(nodes.length * 16)
    var nids = new Float32Array(nodes.length * 4)
    var colors = []
    var cells = []

    for (var i = 0, j = 0, k = 0, n = 0; i < nodes.length; i++, k += 4) {
      var color = palette[Math.floor(Math.random() * palette.length)]

      colors.push(color[0], color[1], color[2])
      nids[n++] = i
      data[j++] = -1
      data[j++] = -1
      data[j++] = nodes[i][0]
      data[j++] = nodes[i][1]

      colors.push(color[0], color[1], color[2])
      nids[n++] = i
      data[j++] = +1
      data[j++] = -1
      data[j++] = nodes[i][0]
      data[j++] = nodes[i][1]

      colors.push(color[0], color[1], color[2])
      nids[n++] = i
      data[j++] = +1
      data[j++] = +1
      data[j++] = nodes[i][0]
      data[j++] = nodes[i][1]

      colors.push(color[0], color[1], color[2])
      nids[n++] = i
      data[j++] = -1
      data[j++] = +1
      data[j++] = nodes[i][0]
      data[j++] = nodes[i][1]

      cells.push(
        [k, k + 1, k + 2],
        [k + 2, k + 3, k]
      )
    }

    var elements = new Uint16Array(cells.length * 3)
    for (var i = 0, j = 0; i < cells.length; i++) {
      elements[j++] = cells[i][0]
      elements[j++] = cells[i][1]
      elements[j++] = cells[i][2]
    }

    return {
      ids: nids,
      colors: new Float32Array(colors),
      positions: data,
      elements: elements
    }
  }
}
