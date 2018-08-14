(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
setTimeout(function () {
  create(document.getElementById('logo'))
}, 500)

function create (container, hoverParent) {
  var canvas = container.appendChild(document.createElement('canvas'))
  var svgToGpu = require('./lib/svg-to-gpu')
  var ortho = require('gl-mat4/ortho')
  var fit = require('canvas-fit')
  var glsl = require('glslify')
  var xhr = require('xhr')
  var regl = require('regl')({
    canvas: canvas,
    extensions: [
      'OES_standard_derivatives'
    ]
  })

  window.addEventListener('resize',
    fit(canvas, container, window.devicePixelRatio || 1),
    false
  )

  var hover = 0
  var hovering = false

  hoverParent = hoverParent || container
  hoverParent.addEventListener('mouseenter', function (e) {
    if (e.target === hoverParent) hovering = true
  }, false)
  hoverParent.addEventListener('mouseleave', function (e) {
    if (e.target === hoverParent) hovering = false
  }, false)

  xhr({
    uri: 'logo-test.svg',
    responseType: 'document'
  }, function (err, res, body) {
    if (err) throw err

    var proj = new Float32Array(16)

    var meshData = svgToGpu(body.documentElement)
    var pathCommand = PathCommand(meshData.paths)
    var nodeCommand = NodeCommand(meshData.nodes)
    var setup = regl({
      uniforms: {
        hover: function () { return hover; },
        time: regl.context('time'),
        proj: function (context) {
          var margin = 100
          var size = 512
          var dx = size / 2 + margin
          var dy = size / 2 + margin
          var cx = size / 2
          var cy = size / 2
          var vw = context.viewportWidth
          var vh = context.viewportHeight
          dy *= vh / vw
          dx *= 0.8
          dy *= 0.8
          return ortho(proj, cx - dx, cx + dx, cy + dy, cy - dy, +1, -1)
        }
      }
    })

    regl.frame(function () {
      hover += (hovering - hover) * 0.1
      setup(function () {
        regl.clear({ color: [0.137254902, 0.1215686275, 0.1254901961, 1] })
        pathCommand()
        nodeCommand()
      })
    })
  })

  function PathCommand (mesh) {
    return regl({
      vert: glsl(["\n        precision mediump float;\n#define GLSLIFY 1\n\n\n        attribute vec4 position;\n        attribute vec3 color;\n        attribute float id;\n\n        uniform mat4 proj;\n        uniform float time;\n\n        varying vec3 vColor;\n\n        float exponentialOut(float t) {\n  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);\n}\n\n        #ifndef PI\n#define PI 3.141592653589793\n#endif\n\nfloat bounceOut(float t) {\n  const float a = 4.0 / 11.0;\n  const float b = 8.0 / 11.0;\n  const float c = 9.0 / 10.0;\n\n  const float ca = 4356.0 / 361.0;\n  const float cb = 35442.0 / 1805.0;\n  const float cc = 16061.0 / 1805.0;\n\n  float t2 = t * t;\n\n  return t < a\n    ? 7.5625 * t2\n    : t < b\n      ? 9.075 * t2 - 9.9 * t + 3.4\n      : t < c\n        ? ca * t2 - cb * t + cc\n        : 10.8 * t * t - 20.52 * t + 10.72;\n}\n\n        void main () {\n          vColor = color;\n\n          vec2 P = position.xy;\n          vec2 N = position.zw;\n\n          float speed = 1.0;\n          float delay = 1.0 + speed * id * 0.04125 + 0.5 * abs((P.y / 512.0) * 2.0 - 1.0);\n          float thick = clamp(time * speed - delay, 0.0, 1.0);\n\n          thick = exponentialOut(thick);\n\n          gl_Position = proj * vec4(P + N * thick * 5.0, 0, 1);\n        }\n        ",""]),
        frag: glsl(["\n        precision mediump float;\n#define GLSLIFY 1\n\n\n        varying vec3 vColor;\n\n        void main() {\n          gl_FragColor = vec4(vColor, 0.85);\n        }\n      ",""]),
      cull: {
        enable: false
      },
      depth: {
        enable: false
      },
      elements: regl.elements(mesh.elements),
      attributes: {
        position: regl.buffer(mesh.positions),
        color: regl.buffer(mesh.colors),
        id: regl.buffer(mesh.ids),
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        },
        equation: {
          rgb: 'add',
          alpha: 'add'
        }
      }
    })
  }

  function NodeCommand (mesh) {
    return regl({
      vert: glsl(["\n        precision mediump float;\n#define GLSLIFY 1\n\n\n        attribute vec4 position;\n        attribute vec3 color;\n        attribute float id;\n\n        uniform mat4 proj;\n        uniform float time;\n        uniform float hover;\n\n        varying vec2 coord;\n        varying vec3 vColor;\n\n        float exponentialInOut(float t) {\n  return t == 0.0 || t == 1.0\n    ? t\n    : t < 0.5\n      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)\n      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;\n}\n\n        #ifndef PI\n#define PI 3.141592653589793\n#endif\n\nfloat bounceOut(float t) {\n  const float a = 4.0 / 11.0;\n  const float b = 8.0 / 11.0;\n  const float c = 9.0 / 10.0;\n\n  const float ca = 4356.0 / 361.0;\n  const float cb = 35442.0 / 1805.0;\n  const float cc = 16061.0 / 1805.0;\n\n  float t2 = t * t;\n\n  return t < a\n    ? 7.5625 * t2\n    : t < b\n      ? 9.075 * t2 - 9.9 * t + 3.4\n      : t < c\n        ? ca * t2 - cb * t + cc\n        : 10.8 * t * t - 20.52 * t + 10.72;\n}\n\n        \n\nfloat bounceIn(float t) {\n  return 1.0 - bounceOut(1.0 - t);\n}\n\n        void main () {\n          vColor = color;\n\n          vec2 P = position.zw;\n          vec2 N = coord = position.xy;\n\n          float speed = 0.8;\n          float delay = id * 0.03125 * speed;\n\n          float scale = clamp(time * speed - delay, 0.0, 1.0);\n\n          if (time < 15.0) {\n            P += vec2(sin(id), cos(id)) * 30.0 * exponentialInOut(max(0.0, 1.0 - scale * 1.2));\n          }\n\n          scale = bounceOut(scale);\n          scale += hover * scale * exponentialInOut(max(0.0, sin(time * 2.5 + (P.y - P.x + id) * 0.1)));\n          // scale *= 1.0 + bounce(max(0.0, sin(time * 4.0 + (P.y - P.x) * 0.1)));\n\n          gl_Position = proj * vec4(P + N * 5.0 * scale, 0.5, 1);\n        }\n        ",""]),
        frag: glsl(["\n        precision mediump float;\n\n        #ifdef GL_OES_standard_derivatives\n        #extension GL_OES_standard_derivatives : enable\n#define GLSLIFY 1\n\n        #endif\n\n        varying vec2 coord;\n        varying vec3 vColor;\n\n        float aastep(float threshold, float value) {\n  #ifdef GL_OES_standard_derivatives\n    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;\n    return smoothstep(threshold-afwidth, threshold+afwidth, value);\n  #else\n    return step(threshold, value);\n  #endif  \n}\n\n        void main () {\n          gl_FragColor = vec4(vColor, 1.0 - aastep(1.0, length(coord)));\n        }\n      ",""]),
      cull: {
        enable: false
      },
      depth: {
        enable: false
      },
      elements: regl.elements(mesh.elements),
      attributes: {
        position: regl.buffer(mesh.positions),
        color: regl.buffer(mesh.colors),
        id: regl.buffer(mesh.ids),
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        },
        equation: {
          rgb: 'add',
          alpha: 'add'
        }
      }
    })
  }
}

},{"./lib/svg-to-gpu":2,"canvas-fit":6,"gl-mat4/ortho":10,"glslify":17,"regl":22,"xhr":29}],2:[function(require,module,exports){
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

},{"abs-svg-path":3,"normalize-svg-path":18,"parse-svg-path":19,"polyline-normals":21,"svg-path-contours":24,"uniq":27}],3:[function(require,module,exports){

module.exports = absolutize

/**
 * redefine `path` with absolute coordinates
 *
 * @param {Array} path
 * @return {Array}
 */

function absolutize(path){
	var startX = 0
	var startY = 0
	var x = 0
	var y = 0

	return path.map(function(seg){
		seg = seg.slice()
		var type = seg[0]
		var command = type.toUpperCase()

		// is relative
		if (type != command) {
			seg[0] = command
			switch (type) {
				case 'a':
					seg[6] += x
					seg[7] += y
					break
				case 'v':
					seg[1] += y
					break
				case 'h':
					seg[1] += x
					break
				default:
					for (var i = 1; i < seg.length;) {
						seg[i++] += x
						seg[i++] += y
					}
			}
		}

		// update cursor state
		switch (command) {
			case 'Z':
				x = startX
				y = startY
				break
			case 'H':
				x = seg[1]
				break
			case 'V':
				y = seg[1]
				break
			case 'M':
				x = startX = seg[1]
				y = startY = seg[2]
				break
			default:
				x = seg[seg.length - 2]
				y = seg[seg.length - 1]
		}

		return seg
	})
}

},{}],4:[function(require,module,exports){
function clone(point) { //TODO: use gl-vec2 for this
    return [point[0], point[1]]
}

function vec2(x, y) {
    return [x, y]
}

module.exports = function createBezierBuilder(opt) {
    opt = opt||{}

    var RECURSION_LIMIT = typeof opt.recursion === 'number' ? opt.recursion : 8
    var FLT_EPSILON = typeof opt.epsilon === 'number' ? opt.epsilon : 1.19209290e-7
    var PATH_DISTANCE_EPSILON = typeof opt.pathEpsilon === 'number' ? opt.pathEpsilon : 1.0

    var curve_angle_tolerance_epsilon = typeof opt.angleEpsilon === 'number' ? opt.angleEpsilon : 0.01
    var m_angle_tolerance = opt.angleTolerance || 0
    var m_cusp_limit = opt.cuspLimit || 0

    return function bezierCurve(start, c1, c2, end, scale, points) {
        if (!points)
            points = []

        scale = typeof scale === 'number' ? scale : 1.0
        var distanceTolerance = PATH_DISTANCE_EPSILON / scale
        distanceTolerance *= distanceTolerance
        begin(start, c1, c2, end, points, distanceTolerance)
        return points
    }


    ////// Based on:
    ////// https://github.com/pelson/antigrain/blob/master/agg-2.4/src/agg_curves.cpp

    function begin(start, c1, c2, end, points, distanceTolerance) {
        points.push(clone(start))
        var x1 = start[0],
            y1 = start[1],
            x2 = c1[0],
            y2 = c1[1],
            x3 = c2[0],
            y3 = c2[1],
            x4 = end[0],
            y4 = end[1]
        recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, 0)
        points.push(clone(end))
    }

    function recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, level) {
        if(level > RECURSION_LIMIT) 
            return

        var pi = Math.PI

        // Calculate all the mid-points of the line segments
        //----------------------
        var x12   = (x1 + x2) / 2
        var y12   = (y1 + y2) / 2
        var x23   = (x2 + x3) / 2
        var y23   = (y2 + y3) / 2
        var x34   = (x3 + x4) / 2
        var y34   = (y3 + y4) / 2
        var x123  = (x12 + x23) / 2
        var y123  = (y12 + y23) / 2
        var x234  = (x23 + x34) / 2
        var y234  = (y23 + y34) / 2
        var x1234 = (x123 + x234) / 2
        var y1234 = (y123 + y234) / 2

        if(level > 0) { // Enforce subdivision first time
            // Try to approximate the full cubic curve by a single straight line
            //------------------
            var dx = x4-x1
            var dy = y4-y1

            var d2 = Math.abs((x2 - x4) * dy - (y2 - y4) * dx)
            var d3 = Math.abs((x3 - x4) * dy - (y3 - y4) * dx)

            var da1, da2

            if(d2 > FLT_EPSILON && d3 > FLT_EPSILON) {
                // Regular care
                //-----------------
                if((d2 + d3)*(d2 + d3) <= distanceTolerance * (dx*dx + dy*dy)) {
                    // If the curvature doesn't exceed the distanceTolerance value
                    // we tend to finish subdivisions.
                    //----------------------
                    if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                        points.push(vec2(x1234, y1234))
                        return
                    }

                    // Angle & Cusp Condition
                    //----------------------
                    var a23 = Math.atan2(y3 - y2, x3 - x2)
                    da1 = Math.abs(a23 - Math.atan2(y2 - y1, x2 - x1))
                    da2 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - a23)
                    if(da1 >= pi) da1 = 2*pi - da1
                    if(da2 >= pi) da2 = 2*pi - da2

                    if(da1 + da2 < m_angle_tolerance) {
                        // Finally we can stop the recursion
                        //----------------------
                        points.push(vec2(x1234, y1234))
                        return
                    }

                    if(m_cusp_limit !== 0.0) {
                        if(da1 > m_cusp_limit) {
                            points.push(vec2(x2, y2))
                            return
                        }

                        if(da2 > m_cusp_limit) {
                            points.push(vec2(x3, y3))
                            return
                        }
                    }
                }
            }
            else {
                if(d2 > FLT_EPSILON) {
                    // p1,p3,p4 are collinear, p2 is considerable
                    //----------------------
                    if(d2 * d2 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234))
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1))
                        if(da1 >= pi) da1 = 2*pi - da1

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2))
                            points.push(vec2(x3, y3))
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit) {
                                points.push(vec2(x2, y2))
                                return
                            }
                        }
                    }
                }
                else if(d3 > FLT_EPSILON) {
                    // p1,p2,p4 are collinear, p3 is considerable
                    //----------------------
                    if(d3 * d3 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234))
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - Math.atan2(y3 - y2, x3 - x2))
                        if(da1 >= pi) da1 = 2*pi - da1

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2))
                            points.push(vec2(x3, y3))
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit)
                            {
                                points.push(vec2(x3, y3))
                                return
                            }
                        }
                    }
                }
                else {
                    // Collinear case
                    //-----------------
                    dx = x1234 - (x1 + x4) / 2
                    dy = y1234 - (y1 + y4) / 2
                    if(dx*dx + dy*dy <= distanceTolerance) {
                        points.push(vec2(x1234, y1234))
                        return
                    }
                }
            }
        }

        // Continue subdivision
        //----------------------
        recursive(x1, y1, x12, y12, x123, y123, x1234, y1234, points, distanceTolerance, level + 1) 
        recursive(x1234, y1234, x234, y234, x34, y34, x4, y4, points, distanceTolerance, level + 1) 
    }
}

},{}],5:[function(require,module,exports){
module.exports = require('./function')()
},{"./function":4}],6:[function(require,module,exports){
var size = require('element-size')

module.exports = fit

var scratch = new Float32Array(2)

function fit(canvas, parent, scale) {
  var isSVG = canvas.nodeName.toUpperCase() === 'SVG'

  canvas.style.position = canvas.style.position || 'absolute'
  canvas.style.top = 0
  canvas.style.left = 0

  resize.scale  = parseFloat(scale || 1)
  resize.parent = parent

  return resize()

  function resize() {
    var p = resize.parent || canvas.parentNode
    if (typeof p === 'function') {
      var dims   = p(scratch) || scratch
      var width  = dims[0]
      var height = dims[1]
    } else
    if (p && p !== document.body) {
      var psize  = size(p)
      var width  = psize[0]|0
      var height = psize[1]|0
    } else {
      var width  = window.innerWidth
      var height = window.innerHeight
    }

    if (isSVG) {
      canvas.setAttribute('width', width * resize.scale + 'px')
      canvas.setAttribute('height', height * resize.scale + 'px')
    } else {
      canvas.width = width * resize.scale
      canvas.height = height * resize.scale
    }

    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    return resize
  }
}

},{"element-size":7}],7:[function(require,module,exports){
module.exports = getSize

function getSize(element) {
  // Handle cases where the element is not already
  // attached to the DOM by briefly appending it
  // to document.body, and removing it again later.
  if (element === window || element === document.body) {
    return [window.innerWidth, window.innerHeight]
  }

  if (!element.parentNode) {
    var temporary = true
    document.body.appendChild(element)
  }

  var bounds = element.getBoundingClientRect()
  var styles = getComputedStyle(element)
  var height = (bounds.height|0)
    + parse(styles.getPropertyValue('margin-top'))
    + parse(styles.getPropertyValue('margin-bottom'))
  var width  = (bounds.width|0)
    + parse(styles.getPropertyValue('margin-left'))
    + parse(styles.getPropertyValue('margin-right'))

  if (temporary) {
    document.body.removeChild(element)
  }

  return [width, height]
}

function parse(prop) {
  return parseFloat(prop) || 0
}

},{}],8:[function(require,module,exports){
'use strict';

var isCallable = require('is-callable');

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

module.exports = forEach;

},{"is-callable":9}],9:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isCallable(value) {
	if (!value) { return false; }
	if (typeof value !== 'function' && typeof value !== 'object') { return false; }
	if (typeof value === 'function' && !value.prototype) { return true; }
	if (hasToStringTag) { return tryFunctionObject(value); }
	if (isES6ClassFn(value)) { return false; }
	var strClass = toStr.call(value);
	return strClass === fnClass || strClass === genClass;
};

},{}],10:[function(require,module,exports){
module.exports = ortho;

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function ortho(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};
},{}],11:[function(require,module,exports){
module.exports = add

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    return out
}
},{}],12:[function(require,module,exports){
module.exports = dot

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1]
}
},{}],13:[function(require,module,exports){
module.exports = normalize

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
function normalize(out, a) {
    var x = a[0],
        y = a[1]
    var len = x*x + y*y
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
    }
    return out
}
},{}],14:[function(require,module,exports){
module.exports = set

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
function set(out, x, y) {
    out[0] = x
    out[1] = y
    return out
}
},{}],15:[function(require,module,exports){
module.exports = subtract

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    return out
}
},{}],16:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],17:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}],18:[function(require,module,exports){
'use strict'

module.exports = normalize

var arcToCurve = require('svg-arc-to-cubic-bezier')

function normalize(path){
  // init state
  var prev
  var result = []
  var bezierX = 0
  var bezierY = 0
  var startX = 0
  var startY = 0
  var quadX = null
  var quadY = null
  var x = 0
  var y = 0

  for (var i = 0, len = path.length; i < len; i++) {
    var seg = path[i]
    var command = seg[0]

    switch (command) {
      case 'M':
        startX = seg[1]
        startY = seg[2]
        break
      case 'A':
        var curves = arcToCurve({
          px: x,
          py: y,
          cx: seg[6],
          cy:  seg[7],
          rx: seg[1],
          ry: seg[2],
          xAxisRotation: seg[3],
          largeArcFlag: seg[4],
          sweepFlag: seg[5]
        })

        // null-curves
        if (!curves.length) continue

        for (var j = 0, c; j < curves.length; j++) {
          c = curves[j]
          seg = ['C', c.x1, c.y1, c.x2, c.y2, c.x, c.y]
          if (j < curves.length - 1) result.push(seg)
        }

        break
      case 'S':
        // default control point
        var cx = x
        var cy = y
        if (prev == 'C' || prev == 'S') {
          cx += cx - bezierX // reflect the previous command's control
          cy += cy - bezierY // point relative to the current point
        }
        seg = ['C', cx, cy, seg[1], seg[2], seg[3], seg[4]]
        break
      case 'T':
        if (prev == 'Q' || prev == 'T') {
          quadX = x * 2 - quadX // as with 'S' reflect previous control point
          quadY = y * 2 - quadY
        } else {
          quadX = x
          quadY = y
        }
        seg = quadratic(x, y, quadX, quadY, seg[1], seg[2])
        break
      case 'Q':
        quadX = seg[1]
        quadY = seg[2]
        seg = quadratic(x, y, seg[1], seg[2], seg[3], seg[4])
        break
      case 'L':
        seg = line(x, y, seg[1], seg[2])
        break
      case 'H':
        seg = line(x, y, seg[1], y)
        break
      case 'V':
        seg = line(x, y, x, seg[1])
        break
      case 'Z':
        seg = line(x, y, startX, startY)
        break
    }

    // update state
    prev = command
    x = seg[seg.length - 2]
    y = seg[seg.length - 1]
    if (seg.length > 4) {
      bezierX = seg[seg.length - 4]
      bezierY = seg[seg.length - 3]
    } else {
      bezierX = x
      bezierY = y
    }
    result.push(seg)
  }

  return result
}

function line(x1, y1, x2, y2){
  return ['C', x1, y1, x2, y2, x2, y2]
}

function quadratic(x1, y1, cx, cy, x2, y2){
  return [
    'C',
    x1/3 + (2/3) * cx,
    y1/3 + (2/3) * cy,
    x2/3 + (2/3) * cx,
    y2/3 + (2/3) * cy,
    x2,
    y2
  ]
}

},{"svg-arc-to-cubic-bezier":23}],19:[function(require,module,exports){

module.exports = parse

/**
 * expected argument lengths
 * @type {Object}
 */

var length = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0}

/**
 * segment pattern
 * @type {RegExp}
 */

var segment = /([astvzqmhlc])([^astvzqmhlc]*)/ig

/**
 * parse an svg path data string. Generates an Array
 * of commands where each command is an Array of the
 * form `[command, arg1, arg2, ...]`
 *
 * @param {String} path
 * @return {Array}
 */

function parse(path) {
	var data = []
	path.replace(segment, function(_, command, args){
		var type = command.toLowerCase()
		args = parseValues(args)

		// overloaded moveTo
		if (type == 'm' && args.length > 2) {
			data.push([command].concat(args.splice(0, 2)))
			type = 'l'
			command = command == 'm' ? 'l' : 'L'
		}

		while (true) {
			if (args.length == length[type]) {
				args.unshift(command)
				return data.push(args)
			}
			if (args.length < length[type]) throw new Error('malformed path data')
			data.push([command].concat(args.splice(0, length[type])))
		}
	})
	return data
}

var number = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig

function parseValues(args) {
	var numbers = args.match(number)
	return numbers ? numbers.map(Number) : []
}

},{}],20:[function(require,module,exports){
var add = require('gl-vec2/add')
var set = require('gl-vec2/set')
var normalize = require('gl-vec2/normalize')
var subtract = require('gl-vec2/subtract')
var dot = require('gl-vec2/dot')

var tmp = [0, 0]

module.exports.computeMiter = function computeMiter(tangent, miter, lineA, lineB, halfThick) {
    //get tangent line
    add(tangent, lineA, lineB)
    normalize(tangent, tangent)

    //get miter as a unit vector
    set(miter, -tangent[1], tangent[0])
    set(tmp, -lineA[1], lineA[0])

    //get the necessary length of our miter
    return halfThick / dot(miter, tmp)
}

module.exports.normal = function normal(out, dir) {
    //get perpendicular
    set(out, -dir[1], dir[0])
    return out
}

module.exports.direction = function direction(out, a, b) {
    //get unit dir of two lines
    subtract(out, a, b)
    normalize(out, out)
    return out
}
},{"gl-vec2/add":11,"gl-vec2/dot":12,"gl-vec2/normalize":13,"gl-vec2/set":14,"gl-vec2/subtract":15}],21:[function(require,module,exports){
var util = require('polyline-miter-util')

var lineA = [0, 0]
var lineB = [0, 0]
var tangent = [0, 0]
var miter = [0, 0]

module.exports = function(points, closed) {
    var curNormal = null
    var out = []
    if (closed) {
        points = points.slice()
        points.push(points[0])
    }

    var total = points.length
    for (var i=1; i<total; i++) {
        var last = points[i-1]
        var cur = points[i]
        var next = i<points.length-1 ? points[i+1] : null

        util.direction(lineA, cur, last)
        if (!curNormal)  {
            curNormal = [0, 0]
            util.normal(curNormal, lineA)
        }

        if (i === 1) //add initial normals
            addNext(out, curNormal, 1)

        if (!next) { //no miter, simple segment
            util.normal(curNormal, lineA) //reset normal
            addNext(out, curNormal, 1)
        } else { //miter with last
            //get unit dir of next line
            util.direction(lineB, next, cur)

            //stores tangent & miter
            var miterLen = util.computeMiter(tangent, miter, lineA, lineB, 1)
            addNext(out, miter, miterLen)
        }
    }

    //if the polyline is a closed loop, clean up the last normal
    if (points.length > 2 && closed) {
        var last2 = points[total-2]
        var cur2 = points[0]
        var next2 = points[1]

        util.direction(lineA, cur2, last2)
        util.direction(lineB, next2, cur2)
        util.normal(curNormal, lineA)
        
        var miterLen2 = util.computeMiter(tangent, miter, lineA, lineB, 1)
        out[0][0] = miter.slice()
        out[total-1][0] = miter.slice()
        out[0][1] = miterLen2
        out[total-1][1] = miterLen2
        out.pop()
    }

    return out
}

function addNext(out, normal, length) {
    out.push([[normal[0], normal[1]], length])
}
},{"polyline-miter-util":20}],22:[function(require,module,exports){
(function(pa,W){"object"===typeof exports&&"undefined"!==typeof module?module.exports=W():"function"===typeof define&&define.amd?define(W):pa.createREGL=W()})(this,function(){function pa(a,b){this.id=Ab++;this.type=a;this.data=b}function W(a){if(0===a.length)return[];var b=a.charAt(0),c=a.charAt(a.length-1);if(1<a.length&&b===c&&('"'===b||"'"===b))return['"'+a.substr(1,a.length-2).replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"'];if(b=/\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(a))return W(a.substr(0,
b.index)).concat(W(b[1])).concat(W(a.substr(b.index+b[0].length)));b=a.split(".");if(1===b.length)return['"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"'];a=[];for(c=0;c<b.length;++c)a=a.concat(W(b[c]));return a}function Za(a){return"["+W(a).join("][")+"]"}function Bb(){var a={"":0},b=[""];return{id:function(c){var e=a[c];if(e)return e;e=a[c]=b.length;b.push(c);return e},str:function(a){return b[a]}}}function Cb(a,b,c){function e(){var b=window.innerWidth,e=window.innerHeight;a!==document.body&&
(e=a.getBoundingClientRect(),b=e.right-e.left,e=e.bottom-e.top);f.width=c*b;f.height=c*e;D(f.style,{width:b+"px",height:e+"px"})}var f=document.createElement("canvas");D(f.style,{border:0,margin:0,padding:0,top:0,left:0});a.appendChild(f);a===document.body&&(f.style.position="absolute",D(a.style,{margin:0,padding:0}));window.addEventListener("resize",e,!1);e();return{canvas:f,onDestroy:function(){window.removeEventListener("resize",e);a.removeChild(f)}}}function Db(a,b){function c(c){try{return a.getContext(c,
b)}catch(f){return null}}return c("webgl")||c("experimental-webgl")||c("webgl-experimental")}function $a(a){return"string"===typeof a?a.split():a}function ab(a){return"string"===typeof a?document.querySelector(a):a}function Eb(a){var b=a||{},c,e,f,d;a={};var n=[],k=[],r="undefined"===typeof window?1:window.devicePixelRatio,p=!1,u=function(a){},m=function(){};"string"===typeof b?c=document.querySelector(b):"object"===typeof b&&("string"===typeof b.nodeName&&"function"===typeof b.appendChild&&"function"===
typeof b.getBoundingClientRect?c=b:"function"===typeof b.drawArrays||"function"===typeof b.drawElements?(d=b,f=d.canvas):("gl"in b?d=b.gl:"canvas"in b?f=ab(b.canvas):"container"in b&&(e=ab(b.container)),"attributes"in b&&(a=b.attributes),"extensions"in b&&(n=$a(b.extensions)),"optionalExtensions"in b&&(k=$a(b.optionalExtensions)),"onDone"in b&&(u=b.onDone),"profile"in b&&(p=!!b.profile),"pixelRatio"in b&&(r=+b.pixelRatio)));c&&("canvas"===c.nodeName.toLowerCase()?f=c:e=c);if(!d){if(!f){c=Cb(e||document.body,
u,r);if(!c)return null;f=c.canvas;m=c.onDestroy}d=Db(f,a)}return d?{gl:d,canvas:f,container:e,extensions:n,optionalExtensions:k,pixelRatio:r,profile:p,onDone:u,onDestroy:m}:(m(),u("webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org"),null)}function Fb(a,b){function c(b){b=b.toLowerCase();var c;try{c=e[b]=a.getExtension(b)}catch(f){}return!!c}for(var e={},f=0;f<b.extensions.length;++f){var d=b.extensions[f];if(!c(d))return b.onDestroy(),b.onDone('"'+d+'" extension is not supported by the current WebGL context, try upgrading your system or a different browser'),
null}b.optionalExtensions.forEach(c);return{extensions:e,restore:function(){Object.keys(e).forEach(function(a){if(!c(a))throw Error("(regl): error restoring extension "+a);})}}}function O(a,b){for(var c=Array(a),e=0;e<a;++e)c[e]=b(e);return c}function bb(a){var b,c;b=(65535<a)<<4;a>>>=b;c=(255<a)<<3;a>>>=c;b|=c;c=(15<a)<<2;a>>>=c;b|=c;c=(3<a)<<1;return b|c|a>>>c>>1}function cb(){function a(a){a:{for(var b=16;268435456>=b;b*=16)if(a<=b){a=b;break a}a=0}b=c[bb(a)>>2];return 0<b.length?b.pop():new ArrayBuffer(a)}
function b(a){c[bb(a.byteLength)>>2].push(a)}var c=O(8,function(){return[]});return{alloc:a,free:b,allocType:function(b,c){var d=null;switch(b){case 5120:d=new Int8Array(a(c),0,c);break;case 5121:d=new Uint8Array(a(c),0,c);break;case 5122:d=new Int16Array(a(2*c),0,c);break;case 5123:d=new Uint16Array(a(2*c),0,c);break;case 5124:d=new Int32Array(a(4*c),0,c);break;case 5125:d=new Uint32Array(a(4*c),0,c);break;case 5126:d=new Float32Array(a(4*c),0,c);break;default:return null}return d.length!==c?d.subarray(0,
c):d},freeType:function(a){b(a.buffer)}}}function ka(a){return!!a&&"object"===typeof a&&Array.isArray(a.shape)&&Array.isArray(a.stride)&&"number"===typeof a.offset&&a.shape.length===a.stride.length&&(Array.isArray(a.data)||P(a.data))}function db(a,b,c,e,f,d){for(var n=0;n<b;++n)for(var k=a[n],r=0;r<c;++r)for(var p=k[r],u=0;u<e;++u)f[d++]=p[u]}function eb(a,b,c,e,f){for(var d=1,n=c+1;n<b.length;++n)d*=b[n];var k=b[c];if(4===b.length-c){var r=b[c+1],p=b[c+2];b=b[c+3];for(n=0;n<k;++n)db(a[n],r,p,b,e,
f),f+=d}else for(n=0;n<k;++n)eb(a[n],b,c+1,e,f),f+=d}function Ha(a){return Ia[Object.prototype.toString.call(a)]|0}function fb(a,b){for(var c=0;c<b.length;++c)a[c]=b[c]}function gb(a,b,c,e,f,d,n){for(var k=0,r=0;r<c;++r)for(var p=0;p<e;++p)a[k++]=b[f*r+d*p+n]}function Gb(a,b,c,e){function f(b){this.id=r++;this.buffer=a.createBuffer();this.type=b;this.usage=35044;this.byteLength=0;this.dimension=1;this.dtype=5121;this.persistentData=null;c.profile&&(this.stats={size:0})}function d(b,c,l){b.byteLength=
c.byteLength;a.bufferData(b.type,c,l)}function n(a,b,c,g,h,e){a.usage=c;if(Array.isArray(b)){if(a.dtype=g||5126,0<b.length)if(Array.isArray(b[0])){h=hb(b);for(var t=g=1;t<h.length;++t)g*=h[t];a.dimension=g;b=Qa(b,h,a.dtype);d(a,b,c);e?a.persistentData=b:z.freeType(b)}else"number"===typeof b[0]?(a.dimension=h,h=z.allocType(a.dtype,b.length),fb(h,b),d(a,h,c),e?a.persistentData=h:z.freeType(h)):P(b[0])&&(a.dimension=b[0].length,a.dtype=g||Ha(b[0])||5126,b=Qa(b,[b.length,b[0].length],a.dtype),d(a,b,c),
e?a.persistentData=b:z.freeType(b))}else if(P(b))a.dtype=g||Ha(b),a.dimension=h,d(a,b,c),e&&(a.persistentData=new Uint8Array(new Uint8Array(b.buffer)));else if(ka(b)){h=b.shape;var f=b.stride,t=b.offset,p=0,k=0,r=0,n=0;1===h.length?(p=h[0],k=1,r=f[0],n=0):2===h.length&&(p=h[0],k=h[1],r=f[0],n=f[1]);a.dtype=g||Ha(b.data)||5126;a.dimension=k;h=z.allocType(a.dtype,p*k);gb(h,b.data,p,k,r,n,t);d(a,h,c);e?a.persistentData=h:z.freeType(h)}}function k(c){b.bufferCount--;for(var d=0;d<e.state.length;++d){var l=
e.state[d];l.buffer===c&&(a.disableVertexAttribArray(d),l.buffer=null)}a.deleteBuffer(c.buffer);c.buffer=null;delete p[c.id]}var r=0,p={};f.prototype.bind=function(){a.bindBuffer(this.type,this.buffer)};f.prototype.destroy=function(){k(this)};var u=[];c.profile&&(b.getTotalBufferSize=function(){var a=0;Object.keys(p).forEach(function(b){a+=p[b].stats.size});return a});return{create:function(m,e,l,g){function h(b){var m=35044,e=null,l=0,f=0,p=1;Array.isArray(b)||P(b)||ka(b)?e=b:"number"===typeof b?
l=b|0:b&&("data"in b&&(e=b.data),"usage"in b&&(m=jb[b.usage]),"type"in b&&(f=Ra[b.type]),"dimension"in b&&(p=b.dimension|0),"length"in b&&(l=b.length|0));d.bind();e?n(d,e,m,f,p,g):(l&&a.bufferData(d.type,l,m),d.dtype=f||5121,d.usage=m,d.dimension=p,d.byteLength=l);c.profile&&(d.stats.size=d.byteLength*la[d.dtype]);return h}b.bufferCount++;var d=new f(e);p[d.id]=d;l||h(m);h._reglType="buffer";h._buffer=d;h.subdata=function(b,c){var g=(c||0)|0,m;d.bind();if(P(b))a.bufferSubData(d.type,g,b);else if(Array.isArray(b)){if(0<
b.length)if("number"===typeof b[0]){var e=z.allocType(d.dtype,b.length);fb(e,b);a.bufferSubData(d.type,g,e);z.freeType(e)}else if(Array.isArray(b[0])||P(b[0]))m=hb(b),e=Qa(b,m,d.dtype),a.bufferSubData(d.type,g,e),z.freeType(e)}else if(ka(b)){m=b.shape;var l=b.stride,f=e=0,p=0,E=0;1===m.length?(e=m[0],f=1,p=l[0],E=0):2===m.length&&(e=m[0],f=m[1],p=l[0],E=l[1]);m=Array.isArray(b.data)?d.dtype:Ha(b.data);m=z.allocType(m,e*f);gb(m,b.data,e,f,p,E,b.offset);a.bufferSubData(d.type,g,m);z.freeType(m)}return h};
c.profile&&(h.stats=d.stats);h.destroy=function(){k(d)};return h},createStream:function(a,b){var c=u.pop();c||(c=new f(a));c.bind();n(c,b,35040,0,1,!1);return c},destroyStream:function(a){u.push(a)},clear:function(){R(p).forEach(k);u.forEach(k)},getBuffer:function(a){return a&&a._buffer instanceof f?a._buffer:null},restore:function(){R(p).forEach(function(b){b.buffer=a.createBuffer();a.bindBuffer(b.type,b.buffer);a.bufferData(b.type,b.persistentData||b.byteLength,b.usage)})},_initBuffer:n}}function Hb(a,
b,c,e){function f(a){this.id=r++;k[this.id]=this;this.buffer=a;this.primType=4;this.type=this.vertCount=0}function d(d,e,l,g,h,f,p){d.buffer.bind();if(e){var k=p;p||P(e)&&(!ka(e)||P(e.data))||(k=b.oes_element_index_uint?5125:5123);c._initBuffer(d.buffer,e,l,k,3)}else a.bufferData(34963,f,l),d.buffer.dtype=k||5121,d.buffer.usage=l,d.buffer.dimension=3,d.buffer.byteLength=f;k=p;if(!p){switch(d.buffer.dtype){case 5121:case 5120:k=5121;break;case 5123:case 5122:k=5123;break;case 5125:case 5124:k=5125}d.buffer.dtype=
k}d.type=k;e=h;0>e&&(e=d.buffer.byteLength,5123===k?e>>=1:5125===k&&(e>>=2));d.vertCount=e;e=g;0>g&&(e=4,g=d.buffer.dimension,1===g&&(e=0),2===g&&(e=1),3===g&&(e=4));d.primType=e}function n(a){e.elementsCount--;delete k[a.id];a.buffer.destroy();a.buffer=null}var k={},r=0,p={uint8:5121,uint16:5123};b.oes_element_index_uint&&(p.uint32=5125);f.prototype.bind=function(){this.buffer.bind()};var u=[];return{create:function(a,b){function l(a){if(a)if("number"===typeof a)g(a),h.primType=4,h.vertCount=a|0,
h.type=5121;else{var b=null,c=35044,e=-1,f=-1,m=0,k=0;if(Array.isArray(a)||P(a)||ka(a))b=a;else if("data"in a&&(b=a.data),"usage"in a&&(c=jb[a.usage]),"primitive"in a&&(e=Sa[a.primitive]),"count"in a&&(f=a.count|0),"type"in a&&(k=p[a.type]),"length"in a)m=a.length|0;else if(m=f,5123===k||5122===k)m*=2;else if(5125===k||5124===k)m*=4;d(h,b,c,e,f,m,k)}else g(),h.primType=4,h.vertCount=0,h.type=5121;return l}var g=c.create(null,34963,!0),h=new f(g._buffer);e.elementsCount++;l(a);l._reglType="elements";
l._elements=h;l.subdata=function(a,b){g.subdata(a,b);return l};l.destroy=function(){n(h)};return l},createStream:function(a){var b=u.pop();b||(b=new f(c.create(null,34963,!0,!1)._buffer));d(b,a,35040,-1,-1,0,0);return b},destroyStream:function(a){u.push(a)},getElements:function(a){return"function"===typeof a&&a._elements instanceof f?a._elements:null},clear:function(){R(k).forEach(n)}}}function kb(a){for(var b=z.allocType(5123,a.length),c=0;c<a.length;++c)if(isNaN(a[c]))b[c]=65535;else if(Infinity===
a[c])b[c]=31744;else if(-Infinity===a[c])b[c]=64512;else{lb[0]=a[c];var e=Ib[0],f=e>>>31<<15,d=(e<<1>>>24)-127,e=e>>13&1023;b[c]=-24>d?f:-14>d?f+(e+1024>>-14-d):15<d?f+31744:f+(d+15<<10)+e}return b}function ra(a){return Array.isArray(a)||P(a)}function Ea(a){return"[object "+a+"]"}function mb(a){return Array.isArray(a)&&(0===a.length||"number"===typeof a[0])}function nb(a){return Array.isArray(a)&&0!==a.length&&ra(a[0])?!0:!1}function ma(a){return Object.prototype.toString.call(a)}function Ta(a){if(!a)return!1;
var b=ma(a);return 0<=Jb.indexOf(b)?!0:mb(a)||nb(a)||ka(a)}function ob(a,b){36193===a.type?(a.data=kb(b),z.freeType(b)):a.data=b}function Ja(a,b,c,e,f,d){a="undefined"!==typeof v[a]?v[a]:S[a]*ha[b];d&&(a*=6);if(f){for(e=0;1<=c;)e+=a*c*c,c/=2;return e}return a*c*e}function Kb(a,b,c,e,f,d,n){function k(){this.format=this.internalformat=6408;this.type=5121;this.flipY=this.premultiplyAlpha=this.compressed=!1;this.unpackAlignment=1;this.colorSpace=37444;this.channels=this.height=this.width=0}function r(a,
b){a.internalformat=b.internalformat;a.format=b.format;a.type=b.type;a.compressed=b.compressed;a.premultiplyAlpha=b.premultiplyAlpha;a.flipY=b.flipY;a.unpackAlignment=b.unpackAlignment;a.colorSpace=b.colorSpace;a.width=b.width;a.height=b.height;a.channels=b.channels}function p(a,b){if("object"===typeof b&&b){"premultiplyAlpha"in b&&(a.premultiplyAlpha=b.premultiplyAlpha);"flipY"in b&&(a.flipY=b.flipY);"alignment"in b&&(a.unpackAlignment=b.alignment);"colorSpace"in b&&(a.colorSpace=ya[b.colorSpace]);
"type"in b&&(a.type=F[b.type]);var c=a.width,e=a.height,d=a.channels,g=!1;"shape"in b?(c=b.shape[0],e=b.shape[1],3===b.shape.length&&(d=b.shape[2],g=!0)):("radius"in b&&(c=e=b.radius),"width"in b&&(c=b.width),"height"in b&&(e=b.height),"channels"in b&&(d=b.channels,g=!0));a.width=c|0;a.height=e|0;a.channels=d|0;c=!1;"format"in b&&(c=b.format,e=a.internalformat=U[c],a.format=Lb[e],c in F&&!("type"in b)&&(a.type=F[c]),c in Y&&(a.compressed=!0),c=!0);!g&&c?a.channels=S[a.format]:g&&!c&&a.channels!==
La[a.format]&&(a.format=a.internalformat=La[a.channels])}}function u(b){a.pixelStorei(37440,b.flipY);a.pixelStorei(37441,b.premultiplyAlpha);a.pixelStorei(37443,b.colorSpace);a.pixelStorei(3317,b.unpackAlignment)}function m(){k.call(this);this.yOffset=this.xOffset=0;this.data=null;this.needsFree=!1;this.element=null;this.needsCopy=!1}function C(a,b){var c=null;Ta(b)?c=b:b&&(p(a,b),"x"in b&&(a.xOffset=b.x|0),"y"in b&&(a.yOffset=b.y|0),Ta(b.data)&&(c=b.data));if(b.copy){var e=f.viewportWidth,d=f.viewportHeight;
a.width=a.width||e-a.xOffset;a.height=a.height||d-a.yOffset;a.needsCopy=!0}else if(!c)a.width=a.width||1,a.height=a.height||1,a.channels=a.channels||4;else if(P(c))a.channels=a.channels||4,a.data=c,"type"in b||5121!==a.type||(a.type=Ia[Object.prototype.toString.call(c)]|0);else if(mb(c)){a.channels=a.channels||4;e=c;d=e.length;switch(a.type){case 5121:case 5123:case 5125:case 5126:d=z.allocType(a.type,d);d.set(e);a.data=d;break;case 36193:a.data=kb(e)}a.alignment=1;a.needsFree=!0}else if(ka(c)){e=
c.data;Array.isArray(e)||5121!==a.type||(a.type=Ia[Object.prototype.toString.call(e)]|0);var d=c.shape,g=c.stride,h,l,q,y;3===d.length?(q=d[2],y=g[2]):y=q=1;h=d[0];l=d[1];d=g[0];g=g[1];a.alignment=1;a.width=h;a.height=l;a.channels=q;a.format=a.internalformat=La[q];a.needsFree=!0;h=y;c=c.offset;q=a.width;y=a.height;l=a.channels;for(var G=z.allocType(36193===a.type?5126:a.type,q*y*l),H=0,ea=0;ea<y;++ea)for(var fa=0;fa<q;++fa)for(var J=0;J<l;++J)G[H++]=e[d*fa+g*ea+h*J+c];ob(a,G)}else if(ma(c)===Ua||
ma(c)===pb)ma(c)===Ua?a.element=c:a.element=c.canvas,a.width=a.element.width,a.height=a.element.height,a.channels=4;else if(ma(c)===qb)a.element=c,a.width=c.width,a.height=c.height,a.channels=4;else if(ma(c)===rb)a.element=c,a.width=c.naturalWidth,a.height=c.naturalHeight,a.channels=4;else if(ma(c)===sb)a.element=c,a.width=c.videoWidth,a.height=c.videoHeight,a.channels=4;else if(nb(c)){e=a.width||c[0].length;d=a.height||c.length;g=a.channels;g=ra(c[0][0])?g||c[0][0].length:g||1;h=Ma.shape(c);q=1;
for(y=0;y<h.length;++y)q*=h[y];q=z.allocType(36193===a.type?5126:a.type,q);Ma.flatten(c,h,"",q);ob(a,q);a.alignment=1;a.width=e;a.height=d;a.channels=g;a.format=a.internalformat=La[g];a.needsFree=!0}}function l(b,c,d,g,h){var l=b.element,f=b.data,k=b.internalformat,q=b.format,y=b.type,G=b.width,H=b.height;u(b);l?a.texSubImage2D(c,h,d,g,q,y,l):b.compressed?a.compressedTexSubImage2D(c,h,d,g,k,G,H,f):b.needsCopy?(e(),a.copyTexSubImage2D(c,h,d,g,b.xOffset,b.yOffset,G,H)):a.texSubImage2D(c,h,d,g,G,H,q,
y,f)}function g(){return K.pop()||new m}function h(a){a.needsFree&&z.freeType(a.data);m.call(a);K.push(a)}function qa(){k.call(this);this.genMipmaps=!1;this.mipmapHint=4352;this.mipmask=0;this.images=Array(16)}function t(a,b,c){var e=a.images[0]=g();a.mipmask=1;e.width=a.width=b;e.height=a.height=c;e.channels=a.channels=4}function B(a,b){var c=null;if(Ta(b))c=a.images[0]=g(),r(c,a),C(c,b),a.mipmask=1;else if(p(a,b),Array.isArray(b.mipmap))for(var e=b.mipmap,d=0;d<e.length;++d)c=a.images[d]=g(),r(c,
a),c.width>>=d,c.height>>=d,C(c,e[d]),a.mipmask|=1<<d;else c=a.images[0]=g(),r(c,a),C(c,b),a.mipmask=1;r(a,a.images[0])}function X(b,c){for(var d=b.images,g=0;g<d.length&&d[g];++g){var h=d[g],l=c,f=g,k=h.element,q=h.data,y=h.internalformat,G=h.format,H=h.type,ea=h.width,fa=h.height,J=h.channels;u(h);k?a.texImage2D(l,f,G,G,H,k):h.compressed?a.compressedTexImage2D(l,f,y,ea,fa,0,q):h.needsCopy?(e(),a.copyTexImage2D(l,f,G,h.xOffset,h.yOffset,ea,fa,0)):((h=!q)&&(q=z.zero.allocType(H,ea*fa*J)),a.texImage2D(l,
f,G,ea,fa,0,G,H,q),h&&q&&z.zero.freeType(q))}}function x(){var a=tb.pop()||new qa;k.call(a);for(var b=a.mipmask=0;16>b;++b)a.images[b]=null;return a}function ib(a){for(var b=a.images,c=0;c<b.length;++c)b[c]&&h(b[c]),b[c]=null;tb.push(a)}function v(){this.magFilter=this.minFilter=9728;this.wrapT=this.wrapS=33071;this.anisotropic=1;this.genMipmaps=!1;this.mipmapHint=4352}function N(a,b){"min"in b&&(a.minFilter=Va[b.min],0<=Mb.indexOf(a.minFilter)&&!("faces"in b)&&(a.genMipmaps=!0));"mag"in b&&(a.magFilter=
V[b.mag]);var c=a.wrapS,d=a.wrapT;if("wrap"in b){var e=b.wrap;"string"===typeof e?c=d=L[e]:Array.isArray(e)&&(c=L[e[0]],d=L[e[1]])}else"wrapS"in b&&(c=L[b.wrapS]),"wrapT"in b&&(d=L[b.wrapT]);a.wrapS=c;a.wrapT=d;"anisotropic"in b&&(a.anisotropic=b.anisotropic);if("mipmap"in b){c=!1;switch(typeof b.mipmap){case "string":a.mipmapHint=A[b.mipmap];c=a.genMipmaps=!0;break;case "boolean":c=a.genMipmaps=b.mipmap;break;case "object":a.genMipmaps=!1,c=!0}!c||"min"in b||(a.minFilter=9984)}}function Q(c,d){a.texParameteri(d,
10241,c.minFilter);a.texParameteri(d,10240,c.magFilter);a.texParameteri(d,10242,c.wrapS);a.texParameteri(d,10243,c.wrapT);b.ext_texture_filter_anisotropic&&a.texParameteri(d,34046,c.anisotropic);c.genMipmaps&&(a.hint(33170,c.mipmapHint),a.generateMipmap(d))}function E(b){k.call(this);this.mipmask=0;this.internalformat=6408;this.id=za++;this.refCount=1;this.target=b;this.texture=a.createTexture();this.unit=-1;this.bindCount=0;this.texInfo=new v;n.profile&&(this.stats={size:0})}function T(b){a.activeTexture(33984);
a.bindTexture(b.target,b.texture)}function Ba(){var b=na[0];b?a.bindTexture(b.target,b.texture):a.bindTexture(3553,null)}function w(b){var c=b.texture,e=b.unit,g=b.target;0<=e&&(a.activeTexture(33984+e),a.bindTexture(g,null),na[e]=null);a.deleteTexture(c);b.texture=null;b.params=null;b.pixels=null;b.refCount=0;delete Z[b.id];d.textureCount--}var A={"don't care":4352,"dont care":4352,nice:4354,fast:4353},L={repeat:10497,clamp:33071,mirror:33648},V={nearest:9728,linear:9729},Va=D({mipmap:9987,"nearest mipmap nearest":9984,
"linear mipmap nearest":9985,"nearest mipmap linear":9986,"linear mipmap linear":9987},V),ya={none:0,browser:37444},F={uint8:5121,rgba4:32819,rgb565:33635,"rgb5 a1":32820},U={alpha:6406,luminance:6409,"luminance alpha":6410,rgb:6407,rgba:6408,rgba4:32854,"rgb5 a1":32855,rgb565:36194},Y={};b.ext_srgb&&(U.srgb=35904,U.srgba=35906);b.oes_texture_float&&(F.float32=F["float"]=5126);b.oes_texture_half_float&&(F.float16=F["half float"]=36193);b.webgl_depth_texture&&(D(U,{depth:6402,"depth stencil":34041}),
D(F,{uint16:5123,uint32:5125,"depth stencil":34042}));b.webgl_compressed_texture_s3tc&&D(Y,{"rgb s3tc dxt1":33776,"rgba s3tc dxt1":33777,"rgba s3tc dxt3":33778,"rgba s3tc dxt5":33779});b.webgl_compressed_texture_atc&&D(Y,{"rgb atc":35986,"rgba atc explicit alpha":35987,"rgba atc interpolated alpha":34798});b.webgl_compressed_texture_pvrtc&&D(Y,{"rgb pvrtc 4bppv1":35840,"rgb pvrtc 2bppv1":35841,"rgba pvrtc 4bppv1":35842,"rgba pvrtc 2bppv1":35843});b.webgl_compressed_texture_etc1&&(Y["rgb etc1"]=36196);
var Nb=Array.prototype.slice.call(a.getParameter(34467));Object.keys(Y).forEach(function(a){var b=Y[a];0<=Nb.indexOf(b)&&(U[a]=b)});var ca=Object.keys(U);c.textureFormats=ca;var O=[];Object.keys(U).forEach(function(a){O[U[a]]=a});var ba=[];Object.keys(F).forEach(function(a){ba[F[a]]=a});var oa=[];Object.keys(V).forEach(function(a){oa[V[a]]=a});var Aa=[];Object.keys(Va).forEach(function(a){Aa[Va[a]]=a});var ia=[];Object.keys(L).forEach(function(a){ia[L[a]]=a});var Lb=ca.reduce(function(a,b){var c=
U[b];6409===c||6406===c||6409===c||6410===c||6402===c||34041===c?a[c]=c:32855===c||0<=b.indexOf("rgba")?a[c]=6408:a[c]=6407;return a},{}),K=[],tb=[],za=0,Z={},ga=c.maxTextureUnits,na=Array(ga).map(function(){return null});D(E.prototype,{bind:function(){this.bindCount+=1;var b=this.unit;if(0>b){for(var c=0;c<ga;++c){var e=na[c];if(e){if(0<e.bindCount)continue;e.unit=-1}na[c]=this;b=c;break}n.profile&&d.maxTextureUnits<b+1&&(d.maxTextureUnits=b+1);this.unit=b;a.activeTexture(33984+b);a.bindTexture(this.target,
this.texture)}return b},unbind:function(){--this.bindCount},decRef:function(){0>=--this.refCount&&w(this)}});n.profile&&(d.getTotalTextureSize=function(){var a=0;Object.keys(Z).forEach(function(b){a+=Z[b].stats.size});return a});return{create2D:function(b,c){function e(a,b){var c=f.texInfo;v.call(c);var d=x();"number"===typeof a?"number"===typeof b?t(d,a|0,b|0):t(d,a|0,a|0):a?(N(c,a),B(d,a)):t(d,1,1);c.genMipmaps&&(d.mipmask=(d.width<<1)-1);f.mipmask=d.mipmask;r(f,d);f.internalformat=d.internalformat;
e.width=d.width;e.height=d.height;T(f);X(d,3553);Q(c,3553);Ba();ib(d);n.profile&&(f.stats.size=Ja(f.internalformat,f.type,d.width,d.height,c.genMipmaps,!1));e.format=O[f.internalformat];e.type=ba[f.type];e.mag=oa[c.magFilter];e.min=Aa[c.minFilter];e.wrapS=ia[c.wrapS];e.wrapT=ia[c.wrapT];return e}var f=new E(3553);Z[f.id]=f;d.textureCount++;e(b,c);e.subimage=function(a,b,c,d){b|=0;c|=0;d|=0;var q=g();r(q,f);q.width=0;q.height=0;C(q,a);q.width=q.width||(f.width>>d)-b;q.height=q.height||(f.height>>d)-
c;T(f);l(q,3553,b,c,d);Ba();h(q);return e};e.resize=function(b,c){var d=b|0,g=c|0||d;if(d===f.width&&g===f.height)return e;e.width=f.width=d;e.height=f.height=g;T(f);for(var q,y=f.channels,G=f.type,H=0;f.mipmask>>H;++H){var ea=d>>H,fa=g>>H;if(!ea||!fa)break;q=z.zero.allocType(G,ea*fa*y);a.texImage2D(3553,H,f.format,ea,fa,0,f.format,f.type,q);q&&z.zero.freeType(q)}Ba();n.profile&&(f.stats.size=Ja(f.internalformat,f.type,d,g,!1,!1));return e};e._reglType="texture2d";e._texture=f;n.profile&&(e.stats=
f.stats);e.destroy=function(){f.decRef()};return e},createCube:function(b,c,e,f,k,m){function A(a,b,c,d,e,J){var I,da=w.texInfo;v.call(da);for(I=0;6>I;++I)q[I]=x();if("number"===typeof a||!a)for(a=a|0||1,I=0;6>I;++I)t(q[I],a,a);else if("object"===typeof a)if(b)B(q[0],a),B(q[1],b),B(q[2],c),B(q[3],d),B(q[4],e),B(q[5],J);else if(N(da,a),p(w,a),"faces"in a)for(a=a.faces,I=0;6>I;++I)r(q[I],w),B(q[I],a[I]);else for(I=0;6>I;++I)B(q[I],a);r(w,q[0]);w.mipmask=da.genMipmaps?(q[0].width<<1)-1:q[0].mipmask;
w.internalformat=q[0].internalformat;A.width=q[0].width;A.height=q[0].height;T(w);for(I=0;6>I;++I)X(q[I],34069+I);Q(da,34067);Ba();n.profile&&(w.stats.size=Ja(w.internalformat,w.type,A.width,A.height,da.genMipmaps,!0));A.format=O[w.internalformat];A.type=ba[w.type];A.mag=oa[da.magFilter];A.min=Aa[da.minFilter];A.wrapS=ia[da.wrapS];A.wrapT=ia[da.wrapT];for(I=0;6>I;++I)ib(q[I]);return A}var w=new E(34067);Z[w.id]=w;d.cubeCount++;var q=Array(6);A(b,c,e,f,k,m);A.subimage=function(a,b,c,q,d){c|=0;q|=0;
d|=0;var e=g();r(e,w);e.width=0;e.height=0;C(e,b);e.width=e.width||(w.width>>d)-c;e.height=e.height||(w.height>>d)-q;T(w);l(e,34069+a,c,q,d);Ba();h(e);return A};A.resize=function(b){b|=0;if(b!==w.width){A.width=w.width=b;A.height=w.height=b;T(w);for(var c=0;6>c;++c)for(var q=0;w.mipmask>>q;++q)a.texImage2D(34069+c,q,w.format,b>>q,b>>q,0,w.format,w.type,null);Ba();n.profile&&(w.stats.size=Ja(w.internalformat,w.type,A.width,A.height,!1,!0));return A}};A._reglType="textureCube";A._texture=w;n.profile&&
(A.stats=w.stats);A.destroy=function(){w.decRef()};return A},clear:function(){for(var b=0;b<ga;++b)a.activeTexture(33984+b),a.bindTexture(3553,null),na[b]=null;R(Z).forEach(w);d.cubeCount=0;d.textureCount=0},getTexture:function(a){return null},restore:function(){R(Z).forEach(function(b){b.texture=a.createTexture();a.bindTexture(b.target,b.texture);for(var c=0;32>c;++c)if(0!==(b.mipmask&1<<c))if(3553===b.target)a.texImage2D(3553,c,b.internalformat,b.width>>c,b.height>>c,0,b.internalformat,b.type,null);
else for(var e=0;6>e;++e)a.texImage2D(34069+e,c,b.internalformat,b.width>>c,b.height>>c,0,b.internalformat,b.type,null);Q(b.texInfo,b.target)})}}}function Ob(a,b,c,e,f,d){function n(a,b,c){this.target=a;this.texture=b;this.renderbuffer=c;var e=a=0;b?(a=b.width,e=b.height):c&&(a=c.width,e=c.height);this.width=a;this.height=e}function k(a){a&&(a.texture&&a.texture._texture.decRef(),a.renderbuffer&&a.renderbuffer._renderbuffer.decRef())}function r(a,b,c){a&&(a.texture?a.texture._texture.refCount+=1:
a.renderbuffer._renderbuffer.refCount+=1)}function p(b,c){c&&(c.texture?a.framebufferTexture2D(36160,b,c.target,c.texture._texture.texture,0):a.framebufferRenderbuffer(36160,b,36161,c.renderbuffer._renderbuffer.renderbuffer))}function u(a){var b=3553,c=null,e=null,d=a;"object"===typeof a&&(d=a.data,"target"in a&&(b=a.target|0));a=d._reglType;"texture2d"===a?c=d:"textureCube"===a?c=d:"renderbuffer"===a&&(e=d,b=36161);return new n(b,c,e)}function m(a,b,c,d,g){if(c)return a=e.create2D({width:a,height:b,
format:d,type:g}),a._texture.refCount=0,new n(3553,a,null);a=f.create({width:a,height:b,format:d});a._renderbuffer.refCount=0;return new n(36161,null,a)}function C(a){return a&&(a.texture||a.renderbuffer)}function l(a,b,c){a&&(a.texture?a.texture.resize(b,c):a.renderbuffer&&a.renderbuffer.resize(b,c))}function g(){this.id=N++;Q[this.id]=this;this.framebuffer=a.createFramebuffer();this.height=this.width=0;this.colorAttachments=[];this.depthStencilAttachment=this.stencilAttachment=this.depthAttachment=
null}function h(a){a.colorAttachments.forEach(k);k(a.depthAttachment);k(a.stencilAttachment);k(a.depthStencilAttachment)}function qa(b){a.deleteFramebuffer(b.framebuffer);b.framebuffer=null;d.framebufferCount--;delete Q[b.id]}function t(b){var e;a.bindFramebuffer(36160,b.framebuffer);var d=b.colorAttachments;for(e=0;e<d.length;++e)p(36064+e,d[e]);for(e=d.length;e<c.maxColorAttachments;++e)a.framebufferTexture2D(36160,36064+e,3553,null,0);a.framebufferTexture2D(36160,33306,3553,null,0);a.framebufferTexture2D(36160,
36096,3553,null,0);a.framebufferTexture2D(36160,36128,3553,null,0);p(36096,b.depthAttachment);p(36128,b.stencilAttachment);p(33306,b.depthStencilAttachment);a.checkFramebufferStatus(36160);a.bindFramebuffer(36160,X.next?X.next.framebuffer:null);X.cur=X.next;a.getError()}function B(a,b){function c(a,b){var d,g=0,f=0,l=!0,k=!0;d=null;var p=!0,n="rgba",B="uint8",qa=1,ba=null,oa=null,X=null,ia=!1;if("number"===typeof a)g=a|0,f=b|0||g;else if(a){"shape"in a?(f=a.shape,g=f[0],f=f[1]):("radius"in a&&(g=
f=a.radius),"width"in a&&(g=a.width),"height"in a&&(f=a.height));if("color"in a||"colors"in a)d=a.color||a.colors,Array.isArray(d);if(!d){"colorCount"in a&&(qa=a.colorCount|0);"colorTexture"in a&&(p=!!a.colorTexture,n="rgba4");if("colorType"in a&&(B=a.colorType,!p))if("half float"===B||"float16"===B)n="rgba16f";else if("float"===B||"float32"===B)n="rgba32f";"colorFormat"in a&&(n=a.colorFormat,0<=z.indexOf(n)?p=!0:0<=x.indexOf(n)&&(p=!1))}if("depthTexture"in a||"depthStencilTexture"in a)ia=!(!a.depthTexture&&
!a.depthStencilTexture);"depth"in a&&("boolean"===typeof a.depth?l=a.depth:(ba=a.depth,k=!1));"stencil"in a&&("boolean"===typeof a.stencil?k=a.stencil:(oa=a.stencil,l=!1));"depthStencil"in a&&("boolean"===typeof a.depthStencil?l=k=a.depthStencil:(X=a.depthStencil,k=l=!1))}else g=f=1;var E=null,v=null,D=null,T=null;if(Array.isArray(d))E=d.map(u);else if(d)E=[u(d)];else for(E=Array(qa),d=0;d<qa;++d)E[d]=m(g,f,p,n,B);g=g||E[0].width;f=f||E[0].height;ba?v=u(ba):l&&!k&&(v=m(g,f,ia,"depth","uint32"));oa?
D=u(oa):k&&!l&&(D=m(g,f,!1,"stencil","uint8"));X?T=u(X):!ba&&!oa&&k&&l&&(T=m(g,f,ia,"depth stencil","depth stencil"));l=null;for(d=0;d<E.length;++d)r(E[d],g,f),E[d]&&E[d].texture&&(k=Wa[E[d].texture._texture.format]*Na[E[d].texture._texture.type],null===l&&(l=k));r(v,g,f);r(D,g,f);r(T,g,f);h(e);e.width=g;e.height=f;e.colorAttachments=E;e.depthAttachment=v;e.stencilAttachment=D;e.depthStencilAttachment=T;c.color=E.map(C);c.depth=C(v);c.stencil=C(D);c.depthStencil=C(T);c.width=e.width;c.height=e.height;
t(e);return c}var e=new g;d.framebufferCount++;c(a,b);return D(c,{resize:function(a,b){var d=a|0,g=b|0||d;if(d===e.width&&g===e.height)return c;for(var f=e.colorAttachments,h=0;h<f.length;++h)l(f[h],d,g);l(e.depthAttachment,d,g);l(e.stencilAttachment,d,g);l(e.depthStencilAttachment,d,g);e.width=c.width=d;e.height=c.height=g;t(e);return c},_reglType:"framebuffer",_framebuffer:e,destroy:function(){qa(e);h(e)},use:function(a){X.setFBO({framebuffer:c},a)}})}var X={cur:null,next:null,dirty:!1,setFBO:null},
z=["rgba"],x=["rgba4","rgb565","rgb5 a1"];b.ext_srgb&&x.push("srgba");b.ext_color_buffer_half_float&&x.push("rgba16f","rgb16f");b.webgl_color_buffer_float&&x.push("rgba32f");var v=["uint8"];b.oes_texture_half_float&&v.push("half float","float16");b.oes_texture_float&&v.push("float","float32");var N=0,Q={};return D(X,{getFramebuffer:function(a){return"function"===typeof a&&"framebuffer"===a._reglType&&(a=a._framebuffer,a instanceof g)?a:null},create:B,createCube:function(a){function b(a){var d,g={color:null},
f=0,h=null;d="rgba";var l="uint8",k=1;if("number"===typeof a)f=a|0;else if(a){"shape"in a?f=a.shape[0]:("radius"in a&&(f=a.radius|0),"width"in a?f=a.width|0:"height"in a&&(f=a.height|0));if("color"in a||"colors"in a)h=a.color||a.colors,Array.isArray(h);h||("colorCount"in a&&(k=a.colorCount|0),"colorType"in a&&(l=a.colorType),"colorFormat"in a&&(d=a.colorFormat));"depth"in a&&(g.depth=a.depth);"stencil"in a&&(g.stencil=a.stencil);"depthStencil"in a&&(g.depthStencil=a.depthStencil)}else f=1;if(h)if(Array.isArray(h))for(a=
[],d=0;d<h.length;++d)a[d]=h[d];else a=[h];else for(a=Array(k),h={radius:f,format:d,type:l},d=0;d<k;++d)a[d]=e.createCube(h);g.color=Array(a.length);for(d=0;d<a.length;++d)k=a[d],f=f||k.width,g.color[d]={target:34069,data:a[d]};for(d=0;6>d;++d){for(k=0;k<a.length;++k)g.color[k].target=34069+d;0<d&&(g.depth=c[0].depth,g.stencil=c[0].stencil,g.depthStencil=c[0].depthStencil);if(c[d])c[d](g);else c[d]=B(g)}return D(b,{width:f,height:f,color:a})}var c=Array(6);b(a);return D(b,{faces:c,resize:function(a){var d=
a|0;if(d===b.width)return b;var e=b.color;for(a=0;a<e.length;++a)e[a].resize(d);for(a=0;6>a;++a)c[a].resize(d);b.width=b.height=d;return b},_reglType:"framebufferCube",destroy:function(){c.forEach(function(a){a.destroy()})}})},clear:function(){R(Q).forEach(qa)},restore:function(){R(Q).forEach(function(b){b.framebuffer=a.createFramebuffer();t(b)})}})}function ub(){this.w=this.z=this.y=this.x=this.state=0;this.buffer=null;this.size=0;this.normalized=!1;this.type=5126;this.divisor=this.stride=this.offset=
0}function Pb(a,b,c,e){a=c.maxAttributes;b=Array(a);for(c=0;c<a;++c)b[c]=new ub;return{Record:ub,scope:{},state:b}}function Qb(a,b,c,e){function f(a,b,c,d){this.name=a;this.id=b;this.location=c;this.info=d}function d(a,b){for(var c=0;c<a.length;++c)if(a[c].id===b.id){a[c].location=b.location;return}a.push(b)}function n(c,d,e){e=35632===c?p:u;var f=e[d];if(!f){var l=b.str(d),f=a.createShader(c);a.shaderSource(f,l);a.compileShader(f);e[d]=f}return f}function k(a,b){this.id=l++;this.fragId=a;this.vertId=
b;this.program=null;this.uniforms=[];this.attributes=[];e.profile&&(this.stats={uniformsCount:0,attributesCount:0})}function r(c,h){var l,k;l=n(35632,c.fragId);k=n(35633,c.vertId);var p=c.program=a.createProgram();a.attachShader(p,l);a.attachShader(p,k);a.linkProgram(p);var m=a.getProgramParameter(p,35718);e.profile&&(c.stats.uniformsCount=m);var r=c.uniforms;for(l=0;l<m;++l)if(k=a.getActiveUniform(p,l))if(1<k.size)for(var u=0;u<k.size;++u){var C=k.name.replace("[0]","["+u+"]");d(r,new f(C,b.id(C),
a.getUniformLocation(p,C),k))}else d(r,new f(k.name,b.id(k.name),a.getUniformLocation(p,k.name),k));m=a.getProgramParameter(p,35721);e.profile&&(c.stats.attributesCount=m);r=c.attributes;for(l=0;l<m;++l)(k=a.getActiveAttrib(p,l))&&d(r,new f(k.name,b.id(k.name),a.getAttribLocation(p,k.name),k))}var p={},u={},m={},C=[],l=0;e.profile&&(c.getMaxUniformsCount=function(){var a=0;C.forEach(function(b){b.stats.uniformsCount>a&&(a=b.stats.uniformsCount)});return a},c.getMaxAttributesCount=function(){var a=
0;C.forEach(function(b){b.stats.attributesCount>a&&(a=b.stats.attributesCount)});return a});return{clear:function(){var b=a.deleteShader.bind(a);R(p).forEach(b);p={};R(u).forEach(b);u={};C.forEach(function(b){a.deleteProgram(b.program)});C.length=0;m={};c.shaderCount=0},program:function(a,b,d){var e=m[b];e||(e=m[b]={});var f=e[a];f||(f=new k(b,a),c.shaderCount++,r(f,d),e[a]=f,C.push(f));return f},restore:function(){p={};u={};for(var a=0;a<C.length;++a)r(C[a])},shader:n,frag:-1,vert:-1}}function Rb(a,
b,c,e,f,d,n){function k(d){var f;f=null===b.next?5121:b.next.colorAttachments[0].texture._texture.type;var k=0,r=0,l=e.framebufferWidth,g=e.framebufferHeight,h=null;P(d)?h=d:d&&(k=d.x|0,r=d.y|0,l=(d.width||e.framebufferWidth-k)|0,g=(d.height||e.framebufferHeight-r)|0,h=d.data||null);c();d=l*g*4;h||(5121===f?h=new Uint8Array(d):5126===f&&(h=h||new Float32Array(d)));a.pixelStorei(3333,4);a.readPixels(k,r,l,g,6408,f,h);return h}function r(a){var c;b.setFBO({framebuffer:a.framebuffer},function(){c=k(a)});
return c}return function(a){return a&&"framebuffer"in a?r(a):k(a)}}function va(a){return Array.prototype.slice.call(a)}function Ca(a){return va(a).join("")}function Sb(){function a(){var a=[],b=[];return D(function(){a.push.apply(a,va(arguments))},{def:function(){var d="v"+c++;b.push(d);0<arguments.length&&(a.push(d,"="),a.push.apply(a,va(arguments)),a.push(";"));return d},toString:function(){return Ca([0<b.length?"var "+b+";":"",Ca(a)])}})}function b(){function b(a,e){d(a,e,"=",c.def(a,e),";")}var c=
a(),d=a(),e=c.toString,f=d.toString;return D(function(){c.apply(c,va(arguments))},{def:c.def,entry:c,exit:d,save:b,set:function(a,d,e){b(a,d);c(a,d,"=",e,";")},toString:function(){return e()+f()}})}var c=0,e=[],f=[],d=a(),n={};return{global:d,link:function(a){for(var b=0;b<f.length;++b)if(f[b]===a)return e[b];b="g"+c++;e.push(b);f.push(a);return b},block:a,proc:function(a,c){function d(){var a="a"+e.length;e.push(a);return a}var e=[];c=c||0;for(var f=0;f<c;++f)d();var f=b(),C=f.toString;return n[a]=
D(f,{arg:d,toString:function(){return Ca(["function(",e.join(),"){",C(),"}"])}})},scope:b,cond:function(){var a=Ca(arguments),c=b(),d=b(),e=c.toString,f=d.toString;return D(c,{then:function(){c.apply(c,va(arguments));return this},"else":function(){d.apply(d,va(arguments));return this},toString:function(){var b=f();b&&(b="else{"+b+"}");return Ca(["if(",a,"){",e(),"}",b])}})},compile:function(){var a=['"use strict";',d,"return {"];Object.keys(n).forEach(function(b){a.push('"',b,'":',n[b].toString(),
",")});a.push("}");var b=Ca(a).replace(/;/g,";\n").replace(/}/g,"}\n").replace(/{/g,"{\n");return Function.apply(null,e.concat(b)).apply(null,f)}}}function Oa(a){return Array.isArray(a)||P(a)||ka(a)}function vb(a){return a.sort(function(a,c){return"viewport"===a?-1:"viewport"===c?1:a<c?-1:1})}function aa(a,b,c,e){this.thisDep=a;this.contextDep=b;this.propDep=c;this.append=e}function wa(a){return a&&!(a.thisDep||a.contextDep||a.propDep)}function x(a){return new aa(!1,!1,!1,a)}function K(a,b){var c=
a.type;return 0===c?(c=a.data.length,new aa(!0,1<=c,2<=c,b)):4===c?(c=a.data,new aa(c.thisDep,c.contextDep,c.propDep,b)):new aa(3===c,2===c,1===c,b)}function Tb(a,b,c,e,f,d,n,k,r,p,u,m,C,l,g){function h(a){return a.replace(".","_")}function v(a,b,c){var d=h(a);Ka.push(a);Fa[d]=sa[d]=!!c;ta[d]=b}function t(a,b,c){var d=h(a);Ka.push(a);Array.isArray(c)?(sa[d]=c.slice(),Fa[d]=c.slice()):sa[d]=Fa[d]=c;ua[d]=b}function B(){var a=Sb(),c=a.link,d=a.global;a.id=va++;a.batchId="0";var e=c(pa),f=a.shared={props:"a0"};
Object.keys(pa).forEach(function(a){f[a]=d.def(e,".",a)});var g=a.next={},J=a.current={};Object.keys(ua).forEach(function(a){Array.isArray(sa[a])&&(g[a]=d.def(f.next,".",a),J[a]=d.def(f.current,".",a))});var I=a.constants={};Object.keys(ha).forEach(function(a){I[a]=d.def(JSON.stringify(ha[a]))});a.invoke=function(b,d){switch(d.type){case 0:var e=["this",f.context,f.props,a.batchId];return b.def(c(d.data),".call(",e.slice(0,Math.max(d.data.length+1,4)),")");case 1:return b.def(f.props,d.data);case 2:return b.def(f.context,
d.data);case 3:return b.def("this",d.data);case 4:return d.data.append(a,b),d.data.ref}};a.attribCache={};var da={};a.scopeAttrib=function(a){a=b.id(a);if(a in da)return da[a];var d=p.scope[a];d||(d=p.scope[a]=new za);return da[a]=c(d)};return a}function X(a){var b=a["static"];a=a.dynamic;var c;if("profile"in b){var d=!!b.profile;c=x(function(a,b){return d});c.enable=d}else if("profile"in a){var e=a.profile;c=K(e,function(a,b){return a.invoke(b,e)})}return c}function z(a,b){var c=a["static"],d=a.dynamic;
if("framebuffer"in c){var e=c.framebuffer;return e?(e=k.getFramebuffer(e),x(function(a,b){var c=a.link(e),d=a.shared;b.set(d.framebuffer,".next",c);d=d.context;b.set(d,".framebufferWidth",c+".width");b.set(d,".framebufferHeight",c+".height");return c})):x(function(a,b){var c=a.shared;b.set(c.framebuffer,".next","null");c=c.context;b.set(c,".framebufferWidth",c+".drawingBufferWidth");b.set(c,".framebufferHeight",c+".drawingBufferHeight");return"null"})}if("framebuffer"in d){var f=d.framebuffer;return K(f,
function(a,b){var c=a.invoke(b,f),d=a.shared,e=d.framebuffer,c=b.def(e,".getFramebuffer(",c,")");b.set(e,".next",c);d=d.context;b.set(d,".framebufferWidth",c+"?"+c+".width:"+d+".drawingBufferWidth");b.set(d,".framebufferHeight",c+"?"+c+".height:"+d+".drawingBufferHeight");return c})}return null}function D(a,b,c){function d(a){if(a in e){var c=e[a];a=!0;var q=c.x|0,xa=c.y|0,g,J;"width"in c?g=c.width|0:a=!1;"height"in c?J=c.height|0:a=!1;return new aa(!a&&b&&b.thisDep,!a&&b&&b.contextDep,!a&&b&&b.propDep,
function(a,b){var d=a.shared.context,e=g;"width"in c||(e=b.def(d,".","framebufferWidth","-",q));var f=J;"height"in c||(f=b.def(d,".","framebufferHeight","-",xa));return[q,xa,e,f]})}if(a in f){var G=f[a];a=K(G,function(a,b){var c=a.invoke(b,G),d=a.shared.context,e=b.def(c,".x|0"),q=b.def(c,".y|0"),f=b.def('"width" in ',c,"?",c,".width|0:","(",d,".","framebufferWidth","-",e,")"),c=b.def('"height" in ',c,"?",c,".height|0:","(",d,".","framebufferHeight","-",q,")");return[e,q,f,c]});b&&(a.thisDep=a.thisDep||
b.thisDep,a.contextDep=a.contextDep||b.contextDep,a.propDep=a.propDep||b.propDep);return a}return b?new aa(b.thisDep,b.contextDep,b.propDep,function(a,b){var c=a.shared.context;return[0,0,b.def(c,".","framebufferWidth"),b.def(c,".","framebufferHeight")]}):null}var e=a["static"],f=a.dynamic;if(a=d("viewport")){var g=a;a=new aa(a.thisDep,a.contextDep,a.propDep,function(a,b){var c=g.append(a,b),d=a.shared.context;b.set(d,".viewportWidth",c[2]);b.set(d,".viewportHeight",c[3]);return c})}return{viewport:a,
scissor_box:d("scissor.box")}}function P(a){function c(a){if(a in d){var q=b.id(d[a]);a=x(function(){return q});a.id=q;return a}if(a in e){var f=e[a];return K(f,function(a,b){var c=a.invoke(b,f);return b.def(a.shared.strings,".id(",c,")")})}return null}var d=a["static"],e=a.dynamic,f=c("frag"),g=c("vert"),J=null;wa(f)&&wa(g)?(J=u.program(g.id,f.id),a=x(function(a,b){return a.link(J)})):a=new aa(f&&f.thisDep||g&&g.thisDep,f&&f.contextDep||g&&g.contextDep,f&&f.propDep||g&&g.propDep,function(a,b){var c=
a.shared.shader,d;d=f?f.append(a,b):b.def(c,".","frag");var e;e=g?g.append(a,b):b.def(c,".","vert");return b.def(c+".program("+e+","+d+")")});return{frag:f,vert:g,progVar:a,program:J}}function N(a,b){function c(a,b){if(a in e){var d=e[a]|0;return x(function(a,c){b&&(a.OFFSET=d);return d})}if(a in f){var q=f[a];return K(q,function(a,c){var d=a.invoke(c,q);b&&(a.OFFSET=d);return d})}return b&&g?x(function(a,b){a.OFFSET="0";return 0}):null}var e=a["static"],f=a.dynamic,g=function(){if("elements"in e){var a=
e.elements;Oa(a)?a=d.getElements(d.create(a,!0)):a&&(a=d.getElements(a));var b=x(function(b,c){if(a){var d=b.link(a);return b.ELEMENTS=d}return b.ELEMENTS=null});b.value=a;return b}if("elements"in f){var c=f.elements;return K(c,function(a,b){var d=a.shared,e=d.isBufferArgs,d=d.elements,q=a.invoke(b,c),f=b.def("null"),e=b.def(e,"(",q,")"),q=a.cond(e).then(f,"=",d,".createStream(",q,");")["else"](f,"=",d,".getElements(",q,");");b.entry(q);b.exit(a.cond(e).then(d,".destroyStream(",f,");"));return a.ELEMENTS=
f})}return null}(),J=c("offset",!0);return{elements:g,primitive:function(){if("primitive"in e){var a=e.primitive;return x(function(b,c){return Sa[a]})}if("primitive"in f){var b=f.primitive;return K(b,function(a,c){var d=a.constants.primTypes,e=a.invoke(c,b);return c.def(d,"[",e,"]")})}return g?wa(g)?g.value?x(function(a,b){return b.def(a.ELEMENTS,".primType")}):x(function(){return 4}):new aa(g.thisDep,g.contextDep,g.propDep,function(a,b){var c=a.ELEMENTS;return b.def(c,"?",c,".primType:",4)}):null}(),
count:function(){if("count"in e){var a=e.count|0;return x(function(){return a})}if("count"in f){var b=f.count;return K(b,function(a,c){return a.invoke(c,b)})}return g?wa(g)?g?J?new aa(J.thisDep,J.contextDep,J.propDep,function(a,b){return b.def(a.ELEMENTS,".vertCount-",a.OFFSET)}):x(function(a,b){return b.def(a.ELEMENTS,".vertCount")}):x(function(){return-1}):new aa(g.thisDep||J.thisDep,g.contextDep||J.contextDep,g.propDep||J.propDep,function(a,b){var c=a.ELEMENTS;return a.OFFSET?b.def(c,"?",c,".vertCount-",
a.OFFSET,":-1"):b.def(c,"?",c,".vertCount:-1")}):null}(),instances:c("instances",!1),offset:J}}function Q(a,b){var c=a["static"],d=a.dynamic,e={};Ka.forEach(function(a){function b(q,g){if(a in c){var y=q(c[a]);e[f]=x(function(){return y})}else if(a in d){var l=d[a];e[f]=K(l,function(a,b){return g(a,b,a.invoke(b,l))})}}var f=h(a);switch(a){case "cull.enable":case "blend.enable":case "dither":case "stencil.enable":case "depth.enable":case "scissor.enable":case "polygonOffset.enable":case "sample.alpha":case "sample.enable":case "depth.mask":return b(function(a){return a},
function(a,b,c){return c});case "depth.func":return b(function(a){return Xa[a]},function(a,b,c){return b.def(a.constants.compareFuncs,"[",c,"]")});case "depth.range":return b(function(a){return a},function(a,b,c){a=b.def("+",c,"[0]");b=b.def("+",c,"[1]");return[a,b]});case "blend.func":return b(function(a){return[Ga["srcRGB"in a?a.srcRGB:a.src],Ga["dstRGB"in a?a.dstRGB:a.dst],Ga["srcAlpha"in a?a.srcAlpha:a.src],Ga["dstAlpha"in a?a.dstAlpha:a.dst]]},function(a,b,c){function d(a,e){return b.def('"',
a,e,'" in ',c,"?",c,".",a,e,":",c,".",a)}a=a.constants.blendFuncs;var e=d("src","RGB"),f=d("dst","RGB"),e=b.def(a,"[",e,"]"),q=b.def(a,"[",d("src","Alpha"),"]"),f=b.def(a,"[",f,"]");a=b.def(a,"[",d("dst","Alpha"),"]");return[e,f,q,a]});case "blend.equation":return b(function(a){if("string"===typeof a)return[Z[a],Z[a]];if("object"===typeof a)return[Z[a.rgb],Z[a.alpha]]},function(a,b,c){var d=a.constants.blendEquations,e=b.def(),f=b.def();a=a.cond("typeof ",c,'==="string"');a.then(e,"=",f,"=",d,"[",
c,"];");a["else"](e,"=",d,"[",c,".rgb];",f,"=",d,"[",c,".alpha];");b(a);return[e,f]});case "blend.color":return b(function(a){return O(4,function(b){return+a[b]})},function(a,b,c){return O(4,function(a){return b.def("+",c,"[",a,"]")})});case "stencil.mask":return b(function(a){return a|0},function(a,b,c){return b.def(c,"|0")});case "stencil.func":return b(function(a){return[Xa[a.cmp||"keep"],a.ref||0,"mask"in a?a.mask:-1]},function(a,b,c){a=b.def('"cmp" in ',c,"?",a.constants.compareFuncs,"[",c,".cmp]",
":",7680);var d=b.def(c,".ref|0");b=b.def('"mask" in ',c,"?",c,".mask|0:-1");return[a,d,b]});case "stencil.opFront":case "stencil.opBack":return b(function(b){return["stencil.opBack"===a?1029:1028,Pa[b.fail||"keep"],Pa[b.zfail||"keep"],Pa[b.zpass||"keep"]]},function(b,c,d){function e(a){return c.def('"',a,'" in ',d,"?",f,"[",d,".",a,"]:",7680)}var f=b.constants.stencilOps;return["stencil.opBack"===a?1029:1028,e("fail"),e("zfail"),e("zpass")]});case "polygonOffset.offset":return b(function(a){return[a.factor|
0,a.units|0]},function(a,b,c){a=b.def(c,".factor|0");b=b.def(c,".units|0");return[a,b]});case "cull.face":return b(function(a){var b=0;"front"===a?b=1028:"back"===a&&(b=1029);return b},function(a,b,c){return b.def(c,'==="front"?',1028,":",1029)});case "lineWidth":return b(function(a){return a},function(a,b,c){return c});case "frontFace":return b(function(a){return wb[a]},function(a,b,c){return b.def(c+'==="cw"?2304:2305')});case "colorMask":return b(function(a){return a.map(function(a){return!!a})},
function(a,b,c){return O(4,function(a){return"!!"+c+"["+a+"]"})});case "sample.coverage":return b(function(a){return["value"in a?a.value:1,!!a.invert]},function(a,b,c){a=b.def('"value" in ',c,"?+",c,".value:1");b=b.def("!!",c,".invert");return[a,b]})}});return e}function E(a,b){var c=a["static"],d=a.dynamic,e={};Object.keys(c).forEach(function(a){var b=c[a],d;if("number"===typeof b||"boolean"===typeof b)d=x(function(){return b});else if("function"===typeof b){var f=b._reglType;if("texture2d"===f||
"textureCube"===f)d=x(function(a){return a.link(b)});else if("framebuffer"===f||"framebufferCube"===f)d=x(function(a){return a.link(b.color[0])})}else ra(b)&&(d=x(function(a){return a.global.def("[",O(b.length,function(a){return b[a]}),"]")}));d.value=b;e[a]=d});Object.keys(d).forEach(function(a){var b=d[a];e[a]=K(b,function(a,c){return a.invoke(c,b)})});return e}function T(a,c){var d=a["static"],e=a.dynamic,g={};Object.keys(d).forEach(function(a){var c=d[a],e=b.id(a),q=new za;if(Oa(c))q.state=1,
q.buffer=f.getBuffer(f.create(c,34962,!1,!0)),q.type=0;else{var y=f.getBuffer(c);if(y)q.state=1,q.buffer=y,q.type=0;else if("constant"in c){var l=c.constant;q.buffer="null";q.state=2;"number"===typeof l?q.x=l:Da.forEach(function(a,b){b<l.length&&(q[a]=l[b])})}else{var y=Oa(c.buffer)?f.getBuffer(f.create(c.buffer,34962,!1,!0)):f.getBuffer(c.buffer),h=c.offset|0,k=c.stride|0,H=c.size|0,m=!!c.normalized,n=0;"type"in c&&(n=Ra[c.type]);c=c.divisor|0;q.buffer=y;q.state=1;q.size=H;q.normalized=m;q.type=
n||y.dtype;q.offset=h;q.stride=k;q.divisor=c}}g[a]=x(function(a,b){var c=a.attribCache;if(e in c)return c[e];var d={isStream:!1};Object.keys(q).forEach(function(a){d[a]=q[a]});q.buffer&&(d.buffer=a.link(q.buffer),d.type=d.type||d.buffer+".dtype");return c[e]=d})});Object.keys(e).forEach(function(a){var b=e[a];g[a]=K(b,function(a,c){function d(a){c(y[a],"=",e,".",a,"|0;")}var e=a.invoke(c,b),q=a.shared,f=q.isBufferArgs,g=q.buffer,y={isStream:c.def(!1)},l=new za;l.state=1;Object.keys(l).forEach(function(a){y[a]=
c.def(""+l[a])});var h=y.buffer,k=y.type;c("if(",f,"(",e,")){",y.isStream,"=true;",h,"=",g,".createStream(",34962,",",e,");",k,"=",h,".dtype;","}else{",h,"=",g,".getBuffer(",e,");","if(",h,"){",k,"=",h,".dtype;",'}else if("constant" in ',e,"){",y.state,"=",2,";","if(typeof "+e+'.constant === "number"){',y[Da[0]],"=",e,".constant;",Da.slice(1).map(function(a){return y[a]}).join("="),"=0;","}else{",Da.map(function(a,b){return y[a]+"="+e+".constant.length>"+b+"?"+e+".constant["+b+"]:0;"}).join(""),"}}else{",
"if(",f,"(",e,".buffer)){",h,"=",g,".createStream(",34962,",",e,".buffer);","}else{",h,"=",g,".getBuffer(",e,".buffer);","}",k,'="type" in ',e,"?",q.glTypes,"[",e,".type]:",h,".dtype;",y.normalized,"=!!",e,".normalized;");d("size");d("offset");d("stride");d("divisor");c("}}");c.exit("if(",y.isStream,"){",g,".destroyStream(",h,");","}");return y})});return g}function M(a){var b=a["static"],c=a.dynamic,d={};Object.keys(b).forEach(function(a){var c=b[a];d[a]=x(function(a,b){return"number"===typeof c||
"boolean"===typeof c?""+c:a.link(c)})});Object.keys(c).forEach(function(a){var b=c[a];d[a]=K(b,function(a,c){return a.invoke(c,b)})});return d}function w(a,b,c,d,e){var f=z(a,e),g=D(a,f,e),l=N(a,e),k=Q(a,e),m=P(a,e),xa=g.viewport;xa&&(k.viewport=xa);xa=h("scissor.box");(g=g[xa])&&(k[xa]=g);g=0<Object.keys(k).length;f={framebuffer:f,draw:l,shader:m,state:k,dirty:g};f.profile=X(a,e);f.uniforms=E(c,e);f.attributes=T(b,e);f.context=M(d,e);return f}function A(a,b,c){var d=a.shared.context,e=a.scope();
Object.keys(c).forEach(function(f){b.save(d,"."+f);e(d,".",f,"=",c[f].append(a,b),";")});b(e)}function L(a,b,c,d){var e=a.shared,f=e.gl,g=e.framebuffer,l;na&&(l=b.def(e.extensions,".webgl_draw_buffers"));var h=a.constants,e=h.drawBuffer,h=h.backBuffer;a=c?c.append(a,b):b.def(g,".next");d||b("if(",a,"!==",g,".cur){");b("if(",a,"){",f,".bindFramebuffer(",36160,",",a,".framebuffer);");na&&b(l,".drawBuffersWEBGL(",e,"[",a,".colorAttachments.length]);");b("}else{",f,".bindFramebuffer(",36160,",null);");
na&&b(l,".drawBuffersWEBGL(",h,");");b("}",g,".cur=",a,";");d||b("}")}function V(a,b,c){var d=a.shared,e=d.gl,f=a.current,g=a.next,l=d.current,k=d.next,m=a.cond(l,".dirty");Ka.forEach(function(b){b=h(b);if(!(b in c.state)){var d,y;if(b in g){d=g[b];y=f[b];var H=O(sa[b].length,function(a){return m.def(d,"[",a,"]")});m(a.cond(H.map(function(a,b){return a+"!=="+y+"["+b+"]"}).join("||")).then(e,".",ua[b],"(",H,");",H.map(function(a,b){return y+"["+b+"]="+a}).join(";"),";"))}else d=m.def(k,".",b),H=a.cond(d,
"!==",l,".",b),m(H),b in ta?H(a.cond(d).then(e,".enable(",ta[b],");")["else"](e,".disable(",ta[b],");"),l,".",b,"=",d,";"):H(e,".",ua[b],"(",d,");",l,".",b,"=",d,";")}});0===Object.keys(c.state).length&&m(l,".dirty=false;");b(m)}function R(a,b,c,d){var e=a.shared,f=a.current,g=e.current,l=e.gl;vb(Object.keys(c)).forEach(function(e){var h=c[e];if(!d||d(h)){var k=h.append(a,b);if(ta[e]){var m=ta[e];wa(h)?k?b(l,".enable(",m,");"):b(l,".disable(",m,");"):b(a.cond(k).then(l,".enable(",m,");")["else"](l,
".disable(",m,");"));b(g,".",e,"=",k,";")}else if(ra(k)){var n=f[e];b(l,".",ua[e],"(",k,");",k.map(function(a,b){return n+"["+b+"]="+a}).join(";"),";")}else b(l,".",ua[e],"(",k,");",g,".",e,"=",k,";")}})}function ya(a,b){ga&&(a.instancing=b.def(a.shared.extensions,".angle_instanced_arrays"))}function F(a,b,c,d,e){function f(){return"undefined"===typeof performance?"Date.now()":"performance.now()"}function g(a){t=b.def();a(t,"=",f(),";");"string"===typeof e?a(n,".count+=",e,";"):a(n,".count++;");l&&
(d?(u=b.def(),a(u,"=",r,".getNumPendingQueries();")):a(r,".beginQuery(",n,");"))}function h(a){a(n,".cpuTime+=",f(),"-",t,";");l&&(d?a(r,".pushScopeStats(",u,",",r,".getNumPendingQueries(),",n,");"):a(r,".endQuery();"))}function k(a){var c=b.def(p,".profile");b(p,".profile=",a,";");b.exit(p,".profile=",c,";")}var m=a.shared,n=a.stats,p=m.current,r=m.timer;c=c.profile;var t,u;if(c){if(wa(c)){c.enable?(g(b),h(b.exit),k("true")):k("false");return}c=c.append(a,b);k(c)}else c=b.def(p,".profile");m=a.block();
g(m);b("if(",c,"){",m,"}");a=a.block();h(a);b.exit("if(",c,"){",a,"}")}function U(a,b,c,d,e){function f(a){switch(a){case 35664:case 35667:case 35671:return 2;case 35665:case 35668:case 35672:return 3;case 35666:case 35669:case 35673:return 4;default:return 1}}function g(c,d,e){function f(){b("if(!",G,".buffer){",h,".enableVertexAttribArray(",m,");}");var c=e.type,g;g=e.size?b.def(e.size,"||",d):d;b("if(",G,".type!==",c,"||",G,".size!==",g,"||",p.map(function(a){return G+"."+a+"!=="+e[a]}).join("||"),
"){",h,".bindBuffer(",34962,",",n,".buffer);",h,".vertexAttribPointer(",[m,g,c,e.normalized,e.stride,e.offset],");",G,".type=",c,";",G,".size=",g,";",p.map(function(a){return G+"."+a+"="+e[a]+";"}).join(""),"}");ga&&(c=e.divisor,b("if(",G,".divisor!==",c,"){",a.instancing,".vertexAttribDivisorANGLE(",[m,c],");",G,".divisor=",c,";}"))}function k(){b("if(",G,".buffer){",h,".disableVertexAttribArray(",m,");","}if(",Da.map(function(a,b){return G+"."+a+"!=="+H[b]}).join("||"),"){",h,".vertexAttrib4f(",
m,",",H,");",Da.map(function(a,b){return G+"."+a+"="+H[b]+";"}).join(""),"}")}var h=l.gl,m=b.def(c,".location"),G=b.def(l.attributes,"[",m,"]");c=e.state;var n=e.buffer,H=[e.x,e.y,e.z,e.w],p=["buffer","normalized","offset","stride"];1===c?f():2===c?k():(b("if(",c,"===",1,"){"),f(),b("}else{"),k(),b("}"))}var l=a.shared;d.forEach(function(d){var l=d.name,h=c.attributes[l],k;if(h){if(!e(h))return;k=h.append(a,b)}else{if(!e(xb))return;var m=a.scopeAttrib(l);k={};Object.keys(new za).forEach(function(a){k[a]=
b.def(m,".",a)})}g(a.link(d),f(d.info.type),k)})}function Y(a,c,d,e,f){for(var g=a.shared,l=g.gl,h,k=0;k<e.length;++k){var m=e[k],n=m.name,p=m.info.type,r=d.uniforms[n],m=a.link(m)+".location",t;if(r){if(!f(r))continue;if(wa(r)){n=r.value;if(35678===p||35680===p)p=a.link(n._texture||n.color[0]._texture),c(l,".uniform1i(",m,",",p+".bind());"),c.exit(p,".unbind();");else if(35674===p||35675===p||35676===p)n=a.global.def("new Float32Array(["+Array.prototype.slice.call(n)+"])"),r=2,35675===p?r=3:35676===
p&&(r=4),c(l,".uniformMatrix",r,"fv(",m,",false,",n,");");else{switch(p){case 5126:h="1f";break;case 35664:h="2f";break;case 35665:h="3f";break;case 35666:h="4f";break;case 35670:h="1i";break;case 5124:h="1i";break;case 35671:h="2i";break;case 35667:h="2i";break;case 35672:h="3i";break;case 35668:h="3i";break;case 35673:h="4i";break;case 35669:h="4i"}c(l,".uniform",h,"(",m,",",ra(n)?Array.prototype.slice.call(n):n,");")}continue}else t=r.append(a,c)}else{if(!f(xb))continue;t=c.def(g.uniforms,"[",
b.id(n),"]")}35678===p?c("if(",t,"&&",t,'._reglType==="framebuffer"){',t,"=",t,".color[0];","}"):35680===p&&c("if(",t,"&&",t,'._reglType==="framebufferCube"){',t,"=",t,".color[0];","}");n=1;switch(p){case 35678:case 35680:p=c.def(t,"._texture");c(l,".uniform1i(",m,",",p,".bind());");c.exit(p,".unbind();");continue;case 5124:case 35670:h="1i";break;case 35667:case 35671:h="2i";n=2;break;case 35668:case 35672:h="3i";n=3;break;case 35669:case 35673:h="4i";n=4;break;case 5126:h="1f";break;case 35664:h=
"2f";n=2;break;case 35665:h="3f";n=3;break;case 35666:h="4f";n=4;break;case 35674:h="Matrix2fv";break;case 35675:h="Matrix3fv";break;case 35676:h="Matrix4fv"}c(l,".uniform",h,"(",m,",");if("M"===h.charAt(0)){var m=Math.pow(p-35674+2,2),u=a.global.def("new Float32Array(",m,")");c("false,(Array.isArray(",t,")||",t," instanceof Float32Array)?",t,":(",O(m,function(a){return u+"["+a+"]="+t+"["+a+"]"}),",",u,")")}else 1<n?c(O(n,function(a){return t+"["+a+"]"})):c(t);c(");")}}function S(a,b,c,d){function e(f){var g=
m[f];return g?g.contextDep&&d.contextDynamic||g.propDep?g.append(a,c):g.append(a,b):b.def(k,".",f)}function f(){function a(){c(ba,".drawElementsInstancedANGLE(",[p,t,C,r+"<<(("+C+"-5121)>>1)",u],");")}function b(){c(ba,".drawArraysInstancedANGLE(",[p,r,t,u],");")}n?B?a():(c("if(",n,"){"),a(),c("}else{"),b(),c("}")):b()}function g(){function a(){c(l+".drawElements("+[p,t,C,r+"<<(("+C+"-5121)>>1)"]+");")}function b(){c(l+".drawArrays("+[p,r,t]+");")}n?B?a():(c("if(",n,"){"),a(),c("}else{"),b(),c("}")):
b()}var h=a.shared,l=h.gl,k=h.draw,m=d.draw,n=function(){var e=m.elements,f=b;if(e){if(e.contextDep&&d.contextDynamic||e.propDep)f=c;e=e.append(a,f)}else e=f.def(k,".","elements");e&&f("if("+e+")"+l+".bindBuffer(34963,"+e+".buffer.buffer);");return e}(),p=e("primitive"),r=e("offset"),t=function(){var e=m.count,f=b;if(e){if(e.contextDep&&d.contextDynamic||e.propDep)f=c;e=e.append(a,f)}else e=f.def(k,".","count");return e}();if("number"===typeof t){if(0===t)return}else c("if(",t,"){"),c.exit("}");var u,
ba;ga&&(u=e("instances"),ba=a.instancing);var C=n+".type",B=m.elements&&wa(m.elements);ga&&("number"!==typeof u||0<=u)?"string"===typeof u?(c("if(",u,">0){"),f(),c("}else if(",u,"<0){"),g(),c("}")):f():g()}function ca(a,b,c,d,e){b=B();e=b.proc("body",e);ga&&(b.instancing=e.def(b.shared.extensions,".angle_instanced_arrays"));a(b,e,c,d);return b.compile().body}function W(a,b,c,d){ya(a,b);U(a,b,c,d.attributes,function(){return!0});Y(a,b,c,d.uniforms,function(){return!0});S(a,b,b,c)}function ba(a,b){var c=
a.proc("draw",1);ya(a,c);A(a,c,b.context);L(a,c,b.framebuffer);V(a,c,b);R(a,c,b.state);F(a,c,b,!1,!0);var d=b.shader.progVar.append(a,c);c(a.shared.gl,".useProgram(",d,".program);");if(b.shader.program)W(a,c,b,b.shader.program);else{var e=a.global.def("{}"),f=c.def(d,".id"),g=c.def(e,"[",f,"]");c(a.cond(g).then(g,".call(this,a0);")["else"](g,"=",e,"[",f,"]=",a.link(function(c){return ca(W,a,b,c,1)}),"(",d,");",g,".call(this,a0);"))}0<Object.keys(b.state).length&&c(a.shared.current,".dirty=true;")}
function oa(a,b,c,d){function e(){return!0}a.batchId="a1";ya(a,b);U(a,b,c,d.attributes,e);Y(a,b,c,d.uniforms,e);S(a,b,b,c)}function Aa(a,b,c,d){function e(a){return a.contextDep&&g||a.propDep}function f(a){return!e(a)}ya(a,b);var g=c.contextDep,h=b.def(),l=b.def();a.shared.props=l;a.batchId=h;var k=a.scope(),m=a.scope();b(k.entry,"for(",h,"=0;",h,"<","a1",";++",h,"){",l,"=","a0","[",h,"];",m,"}",k.exit);c.needsContext&&A(a,m,c.context);c.needsFramebuffer&&L(a,m,c.framebuffer);R(a,m,c.state,e);c.profile&&
e(c.profile)&&F(a,m,c,!1,!0);d?(U(a,k,c,d.attributes,f),U(a,m,c,d.attributes,e),Y(a,k,c,d.uniforms,f),Y(a,m,c,d.uniforms,e),S(a,k,m,c)):(b=a.global.def("{}"),d=c.shader.progVar.append(a,m),l=m.def(d,".id"),k=m.def(b,"[",l,"]"),m(a.shared.gl,".useProgram(",d,".program);","if(!",k,"){",k,"=",b,"[",l,"]=",a.link(function(b){return ca(oa,a,c,b,2)}),"(",d,");}",k,".call(this,a0[",h,"],",h,");"))}function ia(a,b){function c(a){return a.contextDep&&e||a.propDep}var d=a.proc("batch",2);a.batchId="0";ya(a,
d);var e=!1,f=!0;Object.keys(b.context).forEach(function(a){e=e||b.context[a].propDep});e||(A(a,d,b.context),f=!1);var g=b.framebuffer,h=!1;g?(g.propDep?e=h=!0:g.contextDep&&e&&(h=!0),h||L(a,d,g)):L(a,d,null);b.state.viewport&&b.state.viewport.propDep&&(e=!0);V(a,d,b);R(a,d,b.state,function(a){return!c(a)});b.profile&&c(b.profile)||F(a,d,b,!1,"a1");b.contextDep=e;b.needsContext=f;b.needsFramebuffer=h;f=b.shader.progVar;if(f.contextDep&&e||f.propDep)Aa(a,d,b,null);else if(f=f.append(a,d),d(a.shared.gl,
".useProgram(",f,".program);"),b.shader.program)Aa(a,d,b,b.shader.program);else{var g=a.global.def("{}"),h=d.def(f,".id"),l=d.def(g,"[",h,"]");d(a.cond(l).then(l,".call(this,a0,a1);")["else"](l,"=",g,"[",h,"]=",a.link(function(c){return ca(Aa,a,b,c,2)}),"(",f,");",l,".call(this,a0,a1);"))}0<Object.keys(b.state).length&&d(a.shared.current,".dirty=true;")}function ka(a,c){function d(b){var g=c.shader[b];g&&e.set(f.shader,"."+b,g.append(a,e))}var e=a.proc("scope",3);a.batchId="a2";var f=a.shared,g=f.current;
A(a,e,c.context);c.framebuffer&&c.framebuffer.append(a,e);vb(Object.keys(c.state)).forEach(function(b){var d=c.state[b].append(a,e);ra(d)?d.forEach(function(c,d){e.set(a.next[b],"["+d+"]",c)}):e.set(f.next,"."+b,d)});F(a,e,c,!0,!0);["elements","offset","count","instances","primitive"].forEach(function(b){var d=c.draw[b];d&&e.set(f.draw,"."+b,""+d.append(a,e))});Object.keys(c.uniforms).forEach(function(d){e.set(f.uniforms,"["+b.id(d)+"]",c.uniforms[d].append(a,e))});Object.keys(c.attributes).forEach(function(b){var d=
c.attributes[b].append(a,e),f=a.scopeAttrib(b);Object.keys(new za).forEach(function(a){e.set(f,"."+a,d[a])})});d("vert");d("frag");0<Object.keys(c.state).length&&(e(g,".dirty=true;"),e.exit(g,".dirty=true;"));e("a1(",a.shared.context,",a0,",a.batchId,");")}function la(a){if("object"===typeof a&&!ra(a)){for(var b=Object.keys(a),c=0;c<b.length;++c)if(ja.isDynamic(a[b[c]]))return!0;return!1}}function ma(a,b,c){function d(a,b){g.forEach(function(c){var d=e[c];ja.isDynamic(d)&&(d=a.invoke(b,d),b(m,".",
c,"=",d,";"))})}var e=b["static"][c];if(e&&la(e)){var f=a.global,g=Object.keys(e),h=!1,l=!1,k=!1,m=a.global.def("{}");g.forEach(function(b){var c=e[b];if(ja.isDynamic(c))"function"===typeof c&&(c=e[b]=ja.unbox(c)),b=K(c,null),h=h||b.thisDep,k=k||b.propDep,l=l||b.contextDep;else{f(m,".",b,"=");switch(typeof c){case "number":f(c);break;case "string":f('"',c,'"');break;case "object":Array.isArray(c)&&f("[",c.join(),"]");break;default:f(a.link(c))}f(";")}});b.dynamic[c]=new ja.DynamicVariable(4,{thisDep:h,
contextDep:l,propDep:k,ref:m,append:d});delete b["static"][c]}}var za=p.Record,Z={add:32774,subtract:32778,"reverse subtract":32779};c.ext_blend_minmax&&(Z.min=32775,Z.max=32776);var ga=c.angle_instanced_arrays,na=c.webgl_draw_buffers,sa={dirty:!0,profile:g.profile},Fa={},Ka=[],ta={},ua={};v("dither",3024);v("blend.enable",3042);t("blend.color","blendColor",[0,0,0,0]);t("blend.equation","blendEquationSeparate",[32774,32774]);t("blend.func","blendFuncSeparate",[1,0,1,0]);v("depth.enable",2929,!0);
t("depth.func","depthFunc",513);t("depth.range","depthRange",[0,1]);t("depth.mask","depthMask",!0);t("colorMask","colorMask",[!0,!0,!0,!0]);v("cull.enable",2884);t("cull.face","cullFace",1029);t("frontFace","frontFace",2305);t("lineWidth","lineWidth",1);v("polygonOffset.enable",32823);t("polygonOffset.offset","polygonOffset",[0,0]);v("sample.alpha",32926);v("sample.enable",32928);t("sample.coverage","sampleCoverage",[1,!1]);v("stencil.enable",2960);t("stencil.mask","stencilMask",-1);t("stencil.func",
"stencilFunc",[519,0,-1]);t("stencil.opFront","stencilOpSeparate",[1028,7680,7680,7680]);t("stencil.opBack","stencilOpSeparate",[1029,7680,7680,7680]);v("scissor.enable",3089);t("scissor.box","scissor",[0,0,a.drawingBufferWidth,a.drawingBufferHeight]);t("viewport","viewport",[0,0,a.drawingBufferWidth,a.drawingBufferHeight]);var pa={gl:a,context:C,strings:b,next:Fa,current:sa,draw:m,elements:d,buffer:f,shader:u,attributes:p.state,uniforms:r,framebuffer:k,extensions:c,timer:l,isBufferArgs:Oa},ha={primTypes:Sa,
compareFuncs:Xa,blendFuncs:Ga,blendEquations:Z,stencilOps:Pa,glTypes:Ra,orientationType:wb};na&&(ha.backBuffer=[1029],ha.drawBuffer=O(e.maxDrawbuffers,function(a){return 0===a?[0]:O(a,function(a){return 36064+a})}));var va=0;return{next:Fa,current:sa,procs:function(){var a=B(),b=a.proc("poll"),c=a.proc("refresh"),d=a.block();b(d);c(d);var f=a.shared,g=f.gl,h=f.next,l=f.current;d(l,".dirty=false;");L(a,b);L(a,c,null,!0);var k;ga&&(k=a.link(ga));for(var m=0;m<e.maxAttributes;++m){var n=c.def(f.attributes,
"[",m,"]"),p=a.cond(n,".buffer");p.then(g,".enableVertexAttribArray(",m,");",g,".bindBuffer(",34962,",",n,".buffer.buffer);",g,".vertexAttribPointer(",m,",",n,".size,",n,".type,",n,".normalized,",n,".stride,",n,".offset);")["else"](g,".disableVertexAttribArray(",m,");",g,".vertexAttrib4f(",m,",",n,".x,",n,".y,",n,".z,",n,".w);",n,".buffer=null;");c(p);ga&&c(k,".vertexAttribDivisorANGLE(",m,",",n,".divisor);")}Object.keys(ta).forEach(function(e){var f=ta[e],k=d.def(h,".",e),m=a.block();m("if(",k,"){",
g,".enable(",f,")}else{",g,".disable(",f,")}",l,".",e,"=",k,";");c(m);b("if(",k,"!==",l,".",e,"){",m,"}")});Object.keys(ua).forEach(function(e){var f=ua[e],k=sa[e],m,n,p=a.block();p(g,".",f,"(");ra(k)?(f=k.length,m=a.global.def(h,".",e),n=a.global.def(l,".",e),p(O(f,function(a){return m+"["+a+"]"}),");",O(f,function(a){return n+"["+a+"]="+m+"["+a+"];"}).join("")),b("if(",O(f,function(a){return m+"["+a+"]!=="+n+"["+a+"]"}).join("||"),"){",p,"}")):(m=d.def(h,".",e),n=d.def(l,".",e),p(m,");",l,".",e,
"=",m,";"),b("if(",m,"!==",n,"){",p,"}"));c(p)});return a.compile()}(),compile:function(a,b,c,d,e){var f=B();f.stats=f.link(e);Object.keys(b["static"]).forEach(function(a){ma(f,b,a)});Ub.forEach(function(b){ma(f,a,b)});c=w(a,b,c,d,f);ba(f,c);ka(f,c);ia(f,c);return f.compile()}}}function yb(a,b){for(var c=0;c<a.length;++c)if(a[c]===b)return c;return-1}var D=function(a,b){for(var c=Object.keys(b),e=0;e<c.length;++e)a[c[e]]=b[c[e]];return a},Ab=0,ja={DynamicVariable:pa,define:function(a,b){return new pa(a,
Za(b+""))},isDynamic:function(a){return"function"===typeof a&&!a._reglType||a instanceof pa},unbox:function(a,b){return"function"===typeof a?new pa(0,a):a},accessor:Za},Ya={next:"function"===typeof requestAnimationFrame?function(a){return requestAnimationFrame(a)}:function(a){return setTimeout(a,16)},cancel:"function"===typeof cancelAnimationFrame?function(a){return cancelAnimationFrame(a)}:clearTimeout},zb="undefined"!==typeof performance&&performance.now?function(){return performance.now()}:function(){return+new Date},
z=cb();z.zero=cb();var Vb=function(a,b){var c=1;b.ext_texture_filter_anisotropic&&(c=a.getParameter(34047));var e=1,f=1;b.webgl_draw_buffers&&(e=a.getParameter(34852),f=a.getParameter(36063));var d=!!b.oes_texture_float;if(d){d=a.createTexture();a.bindTexture(3553,d);a.texImage2D(3553,0,6408,1,1,0,6408,5126,null);var n=a.createFramebuffer();a.bindFramebuffer(36160,n);a.framebufferTexture2D(36160,36064,3553,d,0);a.bindTexture(3553,null);if(36053!==a.checkFramebufferStatus(36160))d=!1;else{a.viewport(0,
0,1,1);a.clearColor(1,0,0,1);a.clear(16384);var k=z.allocType(5126,4);a.readPixels(0,0,1,1,6408,5126,k);a.getError()?d=!1:(a.deleteFramebuffer(n),a.deleteTexture(d),d=1===k[0]);z.freeType(k)}}k=!0;k=a.createTexture();n=z.allocType(5121,36);a.activeTexture(33984);a.bindTexture(34067,k);a.texImage2D(34069,0,6408,3,3,0,6408,5121,n);z.freeType(n);a.bindTexture(34067,null);a.deleteTexture(k);k=!a.getError();return{colorBits:[a.getParameter(3410),a.getParameter(3411),a.getParameter(3412),a.getParameter(3413)],
depthBits:a.getParameter(3414),stencilBits:a.getParameter(3415),subpixelBits:a.getParameter(3408),extensions:Object.keys(b).filter(function(a){return!!b[a]}),maxAnisotropic:c,maxDrawbuffers:e,maxColorAttachments:f,pointSizeDims:a.getParameter(33901),lineWidthDims:a.getParameter(33902),maxViewportDims:a.getParameter(3386),maxCombinedTextureUnits:a.getParameter(35661),maxCubeMapSize:a.getParameter(34076),maxRenderbufferSize:a.getParameter(34024),maxTextureUnits:a.getParameter(34930),maxTextureSize:a.getParameter(3379),
maxAttributes:a.getParameter(34921),maxVertexUniforms:a.getParameter(36347),maxVertexTextureUnits:a.getParameter(35660),maxVaryingVectors:a.getParameter(36348),maxFragmentUniforms:a.getParameter(36349),glsl:a.getParameter(35724),renderer:a.getParameter(7937),vendor:a.getParameter(7936),version:a.getParameter(7938),readFloat:d,npotTextureCube:k}},P=function(a){return a instanceof Uint8Array||a instanceof Uint16Array||a instanceof Uint32Array||a instanceof Int8Array||a instanceof Int16Array||a instanceof
Int32Array||a instanceof Float32Array||a instanceof Float64Array||a instanceof Uint8ClampedArray},R=function(a){return Object.keys(a).map(function(b){return a[b]})},Ma={shape:function(a){for(var b=[];a.length;a=a[0])b.push(a.length);return b},flatten:function(a,b,c,e){var f=1;if(b.length)for(var d=0;d<b.length;++d)f*=b[d];else f=0;c=e||z.allocType(c,f);switch(b.length){case 0:break;case 1:e=b[0];for(b=0;b<e;++b)c[b]=a[b];break;case 2:e=b[0];b=b[1];for(d=f=0;d<e;++d)for(var n=a[d],k=0;k<b;++k)c[f++]=
n[k];break;case 3:db(a,b[0],b[1],b[2],c,0);break;default:eb(a,b,0,c,0)}return c}},Ia={"[object Int8Array]":5120,"[object Int16Array]":5122,"[object Int32Array]":5124,"[object Uint8Array]":5121,"[object Uint8ClampedArray]":5121,"[object Uint16Array]":5123,"[object Uint32Array]":5125,"[object Float32Array]":5126,"[object Float64Array]":5121,"[object ArrayBuffer]":5121},Ra={int8:5120,int16:5122,int32:5124,uint8:5121,uint16:5123,uint32:5125,"float":5126,float32:5126},jb={dynamic:35048,stream:35040,"static":35044},
Qa=Ma.flatten,hb=Ma.shape,la=[];la[5120]=1;la[5122]=2;la[5124]=4;la[5121]=1;la[5123]=2;la[5125]=4;la[5126]=4;var Sa={points:0,point:0,lines:1,line:1,triangles:4,triangle:4,"line loop":2,"line strip":3,"triangle strip":5,"triangle fan":6},lb=new Float32Array(1),Ib=new Uint32Array(lb.buffer),Mb=[9984,9986,9985,9987],La=[0,6409,6410,6407,6408],S={};S[6409]=S[6406]=S[6402]=1;S[34041]=S[6410]=2;S[6407]=S[35904]=3;S[6408]=S[35906]=4;var Ua=Ea("HTMLCanvasElement"),pb=Ea("CanvasRenderingContext2D"),qb=Ea("ImageBitmap"),
rb=Ea("HTMLImageElement"),sb=Ea("HTMLVideoElement"),Jb=Object.keys(Ia).concat([Ua,pb,qb,rb,sb]),ha=[];ha[5121]=1;ha[5126]=4;ha[36193]=2;ha[5123]=2;ha[5125]=4;var v=[];v[32854]=2;v[32855]=2;v[36194]=2;v[34041]=4;v[33776]=.5;v[33777]=.5;v[33778]=1;v[33779]=1;v[35986]=.5;v[35987]=1;v[34798]=1;v[35840]=.5;v[35841]=.25;v[35842]=.5;v[35843]=.25;v[36196]=.5;var M=[];M[32854]=2;M[32855]=2;M[36194]=2;M[33189]=2;M[36168]=1;M[34041]=4;M[35907]=4;M[34836]=16;M[34842]=8;M[34843]=6;var Wb=function(a,b,c,e,f){function d(a){this.id=
p++;this.refCount=1;this.renderbuffer=a;this.format=32854;this.height=this.width=0;f.profile&&(this.stats={size:0})}function n(b){var c=b.renderbuffer;a.bindRenderbuffer(36161,null);a.deleteRenderbuffer(c);b.renderbuffer=null;b.refCount=0;delete u[b.id];e.renderbufferCount--}var k={rgba4:32854,rgb565:36194,"rgb5 a1":32855,depth:33189,stencil:36168,"depth stencil":34041};b.ext_srgb&&(k.srgba=35907);b.ext_color_buffer_half_float&&(k.rgba16f=34842,k.rgb16f=34843);b.webgl_color_buffer_float&&(k.rgba32f=
34836);var r=[];Object.keys(k).forEach(function(a){r[k[a]]=a});var p=0,u={};d.prototype.decRef=function(){0>=--this.refCount&&n(this)};f.profile&&(e.getTotalRenderbufferSize=function(){var a=0;Object.keys(u).forEach(function(b){a+=u[b].stats.size});return a});return{create:function(b,c){function l(b,c){var d=0,e=0,m=32854;"object"===typeof b&&b?("shape"in b?(e=b.shape,d=e[0]|0,e=e[1]|0):("radius"in b&&(d=e=b.radius|0),"width"in b&&(d=b.width|0),"height"in b&&(e=b.height|0)),"format"in b&&(m=k[b.format])):
"number"===typeof b?(d=b|0,e="number"===typeof c?c|0:d):b||(d=e=1);if(d!==g.width||e!==g.height||m!==g.format)return l.width=g.width=d,l.height=g.height=e,g.format=m,a.bindRenderbuffer(36161,g.renderbuffer),a.renderbufferStorage(36161,m,d,e),f.profile&&(g.stats.size=M[g.format]*g.width*g.height),l.format=r[g.format],l}var g=new d(a.createRenderbuffer());u[g.id]=g;e.renderbufferCount++;l(b,c);l.resize=function(b,c){var d=b|0,e=c|0||d;if(d===g.width&&e===g.height)return l;l.width=g.width=d;l.height=
g.height=e;a.bindRenderbuffer(36161,g.renderbuffer);a.renderbufferStorage(36161,g.format,d,e);f.profile&&(g.stats.size=M[g.format]*g.width*g.height);return l};l._reglType="renderbuffer";l._renderbuffer=g;f.profile&&(l.stats=g.stats);l.destroy=function(){g.decRef()};return l},clear:function(){R(u).forEach(n)},restore:function(){R(u).forEach(function(b){b.renderbuffer=a.createRenderbuffer();a.bindRenderbuffer(36161,b.renderbuffer);a.renderbufferStorage(36161,b.format,b.width,b.height)});a.bindRenderbuffer(36161,
null)}}},Wa=[];Wa[6408]=4;Wa[6407]=3;var Na=[];Na[5121]=1;Na[5126]=4;Na[36193]=2;var Da=["x","y","z","w"],Ub="blend.func blend.equation stencil.func stencil.opFront stencil.opBack sample.coverage viewport scissor.box polygonOffset.offset".split(" "),Ga={0:0,1:1,zero:0,one:1,"src color":768,"one minus src color":769,"src alpha":770,"one minus src alpha":771,"dst color":774,"one minus dst color":775,"dst alpha":772,"one minus dst alpha":773,"constant color":32769,"one minus constant color":32770,"constant alpha":32771,
"one minus constant alpha":32772,"src alpha saturate":776},Xa={never:512,less:513,"<":513,equal:514,"=":514,"==":514,"===":514,lequal:515,"<=":515,greater:516,">":516,notequal:517,"!=":517,"!==":517,gequal:518,">=":518,always:519},Pa={0:0,zero:0,keep:7680,replace:7681,increment:7682,decrement:7683,"increment wrap":34055,"decrement wrap":34056,invert:5386},wb={cw:2304,ccw:2305},xb=new aa(!1,!1,!1,function(){}),Xb=function(a,b){function c(){this.endQueryIndex=this.startQueryIndex=-1;this.sum=0;this.stats=
null}function e(a,b,d){var e=k.pop()||new c;e.startQueryIndex=a;e.endQueryIndex=b;e.sum=0;e.stats=d;r.push(e)}var f=b.ext_disjoint_timer_query;if(!f)return null;var d=[],n=[],k=[],r=[],p=[],u=[];return{beginQuery:function(a){var b=d.pop()||f.createQueryEXT();f.beginQueryEXT(35007,b);n.push(b);e(n.length-1,n.length,a)},endQuery:function(){f.endQueryEXT(35007)},pushScopeStats:e,update:function(){var a,b;a=n.length;if(0!==a){u.length=Math.max(u.length,a+1);p.length=Math.max(p.length,a+1);p[0]=0;var c=
u[0]=0;for(b=a=0;b<n.length;++b){var e=n[b];f.getQueryObjectEXT(e,34919)?(c+=f.getQueryObjectEXT(e,34918),d.push(e)):n[a++]=e;p[b+1]=c;u[b+1]=a}n.length=a;for(b=a=0;b<r.length;++b){var c=r[b],h=c.startQueryIndex,e=c.endQueryIndex;c.sum+=p[e]-p[h];h=u[h];e=u[e];e===h?(c.stats.gpuTime+=c.sum/1E6,k.push(c)):(c.startQueryIndex=h,c.endQueryIndex=e,r[a++]=c)}r.length=a}},getNumPendingQueries:function(){return n.length},clear:function(){d.push.apply(d,n);for(var a=0;a<d.length;a++)f.deleteQueryEXT(d[a]);
n.length=0;d.length=0},restore:function(){n.length=0;d.length=0}}};return function(a){function b(){if(0===F.length)x&&x.update(),ca=null;else{ca=Ya.next(b);u();for(var a=F.length-1;0<=a;--a){var c=F[a];c&&c(N,null,0)}l.flush();x&&x.update()}}function c(){!ca&&0<F.length&&(ca=Ya.next(b))}function e(){ca&&(Ya.cancel(b),ca=null)}function f(a){a.preventDefault();e();U.forEach(function(a){a()})}function d(a){l.getError();h.restore();R.restore();E.restore();w.restore();A.restore();L.restore();x&&x.restore();
V.procs.refresh();c();Y.forEach(function(a){a()})}function n(a){function b(a){var c={},d={};Object.keys(a).forEach(function(b){var e=a[b];ja.isDynamic(e)?d[b]=ja.unbox(e,b):c[b]=e});return{dynamic:d,"static":c}}function c(a){for(;m.length<a;)m.push(null);return m}var d=b(a.context||{}),e=b(a.uniforms||{}),f=b(a.attributes||{}),g=b(function(a){function b(a){if(a in c){var d=c[a];delete c[a];Object.keys(d).forEach(function(b){c[a+"."+b]=d[b]})}}var c=D({},a);delete c.uniforms;delete c.attributes;delete c.context;
"stencil"in c&&c.stencil.op&&(c.stencil.opBack=c.stencil.opFront=c.stencil.op,delete c.stencil.op);b("blend");b("depth");b("cull");b("stencil");b("polygonOffset");b("scissor");b("sample");return c}(a));a={gpuTime:0,cpuTime:0,count:0};var d=V.compile(g,f,e,d,a),h=d.draw,k=d.batch,l=d.scope,m=[];return D(function(a,b){var d;if("function"===typeof a)return l.call(this,null,a,0);if("function"===typeof b)if("number"===typeof a)for(d=0;d<a;++d)l.call(this,null,b,d);else if(Array.isArray(a))for(d=0;d<a.length;++d)l.call(this,
a[d],b,d);else return l.call(this,a,b,0);else if("number"===typeof a){if(0<a)return k.call(this,c(a|0),a|0)}else if(Array.isArray(a)){if(a.length)return k.call(this,a,a.length)}else return h.call(this,a)},{stats:a})}function k(a,b){var c=0;V.procs.poll();var d=b.color;d&&(l.clearColor(+d[0]||0,+d[1]||0,+d[2]||0,+d[3]||0),c|=16384);"depth"in b&&(l.clearDepth(+b.depth),c|=256);"stencil"in b&&(l.clearStencil(b.stencil|0),c|=1024);l.clear(c)}function r(a){F.push(a);c();return{cancel:function(){function b(){var a=
yb(F,b);F[a]=F[F.length-1];--F.length;0>=F.length&&e()}var c=yb(F,a);F[c]=b}}}function p(){var a=S.viewport,b=S.scissor_box;a[0]=a[1]=b[0]=b[1]=0;N.viewportWidth=N.framebufferWidth=N.drawingBufferWidth=a[2]=b[2]=l.drawingBufferWidth;N.viewportHeight=N.framebufferHeight=N.drawingBufferHeight=a[3]=b[3]=l.drawingBufferHeight}function u(){N.tick+=1;N.time=v();p();V.procs.poll()}function m(){p();V.procs.refresh();x&&x.update()}function v(){return(zb()-O)/1E3}a=Eb(a);if(!a)return null;var l=a.gl,g=l.getContextAttributes();
l.isContextLost();var h=Fb(l,a);if(!h)return null;var z=Bb(),t={bufferCount:0,elementsCount:0,framebufferCount:0,shaderCount:0,textureCount:0,cubeCount:0,renderbufferCount:0,maxTextureUnits:0},B=h.extensions,x=Xb(l,B),O=zb(),K=l.drawingBufferWidth,P=l.drawingBufferHeight,N={tick:0,time:0,viewportWidth:K,viewportHeight:P,framebufferWidth:K,framebufferHeight:P,drawingBufferWidth:K,drawingBufferHeight:P,pixelRatio:a.pixelRatio},Q=Vb(l,B),K=Pb(l,B,Q,z),E=Gb(l,t,a,K),T=Hb(l,B,E,t),R=Qb(l,z,t,a),w=Kb(l,
B,Q,function(){V.procs.poll()},N,t,a),A=Wb(l,B,Q,t,a),L=Ob(l,B,Q,w,A,t),V=Tb(l,z,B,Q,E,T,w,L,{},K,R,{elements:null,primitive:4,count:-1,offset:0,instances:-1},N,x,a),z=Rb(l,L,V.procs.poll,N,g,B,Q),S=V.next,M=l.canvas,F=[],U=[],Y=[],W=[a.onDestroy],ca=null;M&&(M.addEventListener("webglcontextlost",f,!1),M.addEventListener("webglcontextrestored",d,!1));var aa=L.setFBO=n({framebuffer:ja.define.call(null,1,"framebuffer")});m();g=D(n,{clear:function(a){if("framebuffer"in a)if(a.framebuffer&&"framebufferCube"===
a.framebuffer_reglType)for(var b=0;6>b;++b)aa(D({framebuffer:a.framebuffer.faces[b]},a),k);else aa(a,k);else k(null,a)},prop:ja.define.bind(null,1),context:ja.define.bind(null,2),"this":ja.define.bind(null,3),draw:n({}),buffer:function(a){return E.create(a,34962,!1,!1)},elements:function(a){return T.create(a,!1)},texture:w.create2D,cube:w.createCube,renderbuffer:A.create,framebuffer:L.create,framebufferCube:L.createCube,attributes:g,frame:r,on:function(a,b){var c;switch(a){case "frame":return r(b);
case "lost":c=U;break;case "restore":c=Y;break;case "destroy":c=W}c.push(b);return{cancel:function(){for(var a=0;a<c.length;++a)if(c[a]===b){c[a]=c[c.length-1];c.pop();break}}}},limits:Q,hasExtension:function(a){return 0<=Q.extensions.indexOf(a.toLowerCase())},read:z,destroy:function(){F.length=0;e();M&&(M.removeEventListener("webglcontextlost",f),M.removeEventListener("webglcontextrestored",d));R.clear();L.clear();A.clear();w.clear();T.clear();E.clear();x&&x.clear();W.forEach(function(a){a()})},
_gl:l,_refresh:m,poll:function(){u();x&&x.update()},now:v,stats:t});a.onDone(null,g);return g}});

},{}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var TAU = Math.PI * 2;

var mapToEllipse = function mapToEllipse(_ref, rx, ry, cosphi, sinphi, centerx, centery) {
  var x = _ref.x,
      y = _ref.y;

  x *= rx;
  y *= ry;

  var xp = cosphi * x - sinphi * y;
  var yp = sinphi * x + cosphi * y;

  return {
    x: xp + centerx,
    y: yp + centery
  };
};

var approxUnitArc = function approxUnitArc(ang1, ang2) {
  // See http://spencermortensen.com/articles/bezier-circle/ for the derivation
  // of this constant.
  var c = 0.551915024494;

  var x1 = Math.cos(ang1);
  var y1 = Math.sin(ang1);
  var x2 = Math.cos(ang1 + ang2);
  var y2 = Math.sin(ang1 + ang2);

  return [{
    x: x1 - y1 * c,
    y: y1 + x1 * c
  }, {
    x: x2 + y2 * c,
    y: y2 - x2 * c
  }, {
    x: x2,
    y: y2
  }];
};

var vectorAngle = function vectorAngle(ux, uy, vx, vy) {
  var sign = ux * vy - uy * vx < 0 ? -1 : 1;
  var umag = Math.sqrt(ux * ux + uy * uy);
  var vmag = Math.sqrt(ux * ux + uy * uy);
  var dot = ux * vx + uy * vy;

  var div = dot / (umag * vmag);

  if (div > 1) {
    div = 1;
  }

  if (div < -1) {
    div = -1;
  }

  return sign * Math.acos(div);
};

var getArcCenter = function getArcCenter(px, py, cx, cy, rx, ry, largeArcFlag, sweepFlag, sinphi, cosphi, pxp, pyp) {
  var rxsq = Math.pow(rx, 2);
  var rysq = Math.pow(ry, 2);
  var pxpsq = Math.pow(pxp, 2);
  var pypsq = Math.pow(pyp, 2);

  var radicant = rxsq * rysq - rxsq * pypsq - rysq * pxpsq;

  if (radicant < 0) {
    radicant = 0;
  }

  radicant /= rxsq * pypsq + rysq * pxpsq;
  radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);

  var centerxp = radicant * rx / ry * pyp;
  var centeryp = radicant * -ry / rx * pxp;

  var centerx = cosphi * centerxp - sinphi * centeryp + (px + cx) / 2;
  var centery = sinphi * centerxp + cosphi * centeryp + (py + cy) / 2;

  var vx1 = (pxp - centerxp) / rx;
  var vy1 = (pyp - centeryp) / ry;
  var vx2 = (-pxp - centerxp) / rx;
  var vy2 = (-pyp - centeryp) / ry;

  var ang1 = vectorAngle(1, 0, vx1, vy1);
  var ang2 = vectorAngle(vx1, vy1, vx2, vy2);

  if (sweepFlag === 0 && ang2 > 0) {
    ang2 -= TAU;
  }

  if (sweepFlag === 1 && ang2 < 0) {
    ang2 += TAU;
  }

  return [centerx, centery, ang1, ang2];
};

var arcToBezier = function arcToBezier(_ref2) {
  var px = _ref2.px,
      py = _ref2.py,
      cx = _ref2.cx,
      cy = _ref2.cy,
      rx = _ref2.rx,
      ry = _ref2.ry,
      _ref2$xAxisRotation = _ref2.xAxisRotation,
      xAxisRotation = _ref2$xAxisRotation === undefined ? 0 : _ref2$xAxisRotation,
      _ref2$largeArcFlag = _ref2.largeArcFlag,
      largeArcFlag = _ref2$largeArcFlag === undefined ? 0 : _ref2$largeArcFlag,
      _ref2$sweepFlag = _ref2.sweepFlag,
      sweepFlag = _ref2$sweepFlag === undefined ? 0 : _ref2$sweepFlag;

  var curves = [];

  if (rx === 0 || ry === 0) {
    return [];
  }

  var sinphi = Math.sin(xAxisRotation * TAU / 360);
  var cosphi = Math.cos(xAxisRotation * TAU / 360);

  var pxp = cosphi * (px - cx) / 2 + sinphi * (py - cy) / 2;
  var pyp = -sinphi * (px - cx) / 2 + cosphi * (py - cy) / 2;

  if (pxp === 0 && pyp === 0) {
    return [];
  }

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  var lambda = Math.pow(pxp, 2) / Math.pow(rx, 2) + Math.pow(pyp, 2) / Math.pow(ry, 2);

  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }

  var _getArcCenter = getArcCenter(px, py, cx, cy, rx, ry, largeArcFlag, sweepFlag, sinphi, cosphi, pxp, pyp),
      _getArcCenter2 = _slicedToArray(_getArcCenter, 4),
      centerx = _getArcCenter2[0],
      centery = _getArcCenter2[1],
      ang1 = _getArcCenter2[2],
      ang2 = _getArcCenter2[3];

  var segments = Math.max(Math.ceil(Math.abs(ang2) / (TAU / 4)), 1);

  ang2 /= segments;

  for (var i = 0; i < segments; i++) {
    curves.push(approxUnitArc(ang1, ang2));
    ang1 += ang2;
  }

  return curves.map(function (curve) {
    var _mapToEllipse = mapToEllipse(curve[0], rx, ry, cosphi, sinphi, centerx, centery),
        x1 = _mapToEllipse.x,
        y1 = _mapToEllipse.y;

    var _mapToEllipse2 = mapToEllipse(curve[1], rx, ry, cosphi, sinphi, centerx, centery),
        x2 = _mapToEllipse2.x,
        y2 = _mapToEllipse2.y;

    var _mapToEllipse3 = mapToEllipse(curve[2], rx, ry, cosphi, sinphi, centerx, centery),
        x = _mapToEllipse3.x,
        y = _mapToEllipse3.y;

    return { x1: x1, y1: y1, x2: x2, y2: y2, x: x, y: y };
  });
};

exports.default = arcToBezier;
module.exports = exports["default"];
},{}],24:[function(require,module,exports){
var bezier = require('adaptive-bezier-curve')
var abs = require('abs-svg-path')
var norm = require('normalize-svg-path')
var copy = require('vec2-copy')

function set(out, x, y) {
    out[0] = x
    out[1] = y
    return out
}

var tmp1 = [0,0],
    tmp2 = [0,0],
    tmp3 = [0,0]

function bezierTo(points, scale, start, seg) {
    bezier(start, 
        set(tmp1, seg[1], seg[2]), 
        set(tmp2, seg[3], seg[4]),
        set(tmp3, seg[5], seg[6]), scale, points)
}

module.exports = function contours(svg, scale) {
    var paths = []

    var points = []
    var pen = [0, 0]
    norm(abs(svg)).forEach(function(segment, i, self) {
        if (segment[0] === 'M') {
            copy(pen, segment.slice(1))
            if (points.length>0) {
                paths.push(points)
                points = []
            }
        } else if (segment[0] === 'C') {
            bezierTo(points, scale, pen, segment)
            set(pen, segment[5], segment[6])
        } else {
            throw new Error('illegal type in SVG: '+segment[0])
        }
    })
    if (points.length>0)
        paths.push(points)
    return paths
}
},{"abs-svg-path":3,"adaptive-bezier-curve":5,"normalize-svg-path":25,"vec2-copy":28}],25:[function(require,module,exports){

var π = Math.PI
var _120 = radians(120)

module.exports = normalize

/**
 * describe `path` in terms of cubic bézier 
 * curves and move commands
 *
 * @param {Array} path
 * @return {Array}
 */

function normalize(path){
	// init state
	var prev
	var result = []
	var bezierX = 0
	var bezierY = 0
	var startX = 0
	var startY = 0
	var quadX = null
	var quadY = null
	var x = 0
	var y = 0

	for (var i = 0, len = path.length; i < len; i++) {
		var seg = path[i]
		var command = seg[0]
		switch (command) {
			case 'M':
				startX = seg[1]
				startY = seg[2]
				break
			case 'A':
				seg = arc(x, y,seg[1],seg[2],radians(seg[3]),seg[4],seg[5],seg[6],seg[7])
				// split multi part
				seg.unshift('C')
				if (seg.length > 7) {
					result.push(seg.splice(0, 7))
					seg.unshift('C')
				}
				break
			case 'S':
				// default control point
				var cx = x
				var cy = y
				if (prev == 'C' || prev == 'S') {
					cx += cx - bezierX // reflect the previous command's control
					cy += cy - bezierY // point relative to the current point
				}
				seg = ['C', cx, cy, seg[1], seg[2], seg[3], seg[4]]
				break
			case 'T':
				if (prev == 'Q' || prev == 'T') {
					quadX = x * 2 - quadX // as with 'S' reflect previous control point
					quadY = y * 2 - quadY
				} else {
					quadX = x
					quadY = y
				}
				seg = quadratic(x, y, quadX, quadY, seg[1], seg[2])
				break
			case 'Q':
				quadX = seg[1]
				quadY = seg[2]
				seg = quadratic(x, y, seg[1], seg[2], seg[3], seg[4])
				break
			case 'L':
				seg = line(x, y, seg[1], seg[2])
				break
			case 'H':
				seg = line(x, y, seg[1], y)
				break
			case 'V':
				seg = line(x, y, x, seg[1])
				break
			case 'Z':
				seg = line(x, y, startX, startY)
				break
		}

		// update state
		prev = command
		x = seg[seg.length - 2]
		y = seg[seg.length - 1]
		if (seg.length > 4) {
			bezierX = seg[seg.length - 4]
			bezierY = seg[seg.length - 3]
		} else {
			bezierX = x
			bezierY = y
		}
		result.push(seg)
	}

	return result
}

function line(x1, y1, x2, y2){
	return ['C', x1, y1, x2, y2, x2, y2]
}

function quadratic(x1, y1, cx, cy, x2, y2){
	return [
		'C',
		x1/3 + (2/3) * cx,
		y1/3 + (2/3) * cy,
		x2/3 + (2/3) * cx,
		y2/3 + (2/3) * cy,
		x2,
		y2
	]
}

// This function is ripped from 
// github.com/DmitryBaranovskiy/raphael/blob/4d97d4/raphael.js#L2216-L2304 
// which references w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
// TODO: make it human readable

function arc(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
	if (!recursive) {
		var xy = rotate(x1, y1, -angle)
		x1 = xy.x
		y1 = xy.y
		xy = rotate(x2, y2, -angle)
		x2 = xy.x
		y2 = xy.y
		var x = (x1 - x2) / 2
		var y = (y1 - y2) / 2
		var h = (x * x) / (rx * rx) + (y * y) / (ry * ry)
		if (h > 1) {
			h = Math.sqrt(h)
			rx = h * rx
			ry = h * ry
		}
		var rx2 = rx * rx
		var ry2 = ry * ry
		var k = (large_arc_flag == sweep_flag ? -1 : 1)
			* Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x)))
		if (k == Infinity) k = 1 // neutralize
		var cx = k * rx * y / ry + (x1 + x2) / 2
		var cy = k * -ry * x / rx + (y1 + y2) / 2
		var f1 = Math.asin(((y1 - cy) / ry).toFixed(9))
		var f2 = Math.asin(((y2 - cy) / ry).toFixed(9))

		f1 = x1 < cx ? π - f1 : f1
		f2 = x2 < cx ? π - f2 : f2
		if (f1 < 0) f1 = π * 2 + f1
		if (f2 < 0) f2 = π * 2 + f2
		if (sweep_flag && f1 > f2) f1 = f1 - π * 2
		if (!sweep_flag && f2 > f1) f2 = f2 - π * 2
	} else {
		f1 = recursive[0]
		f2 = recursive[1]
		cx = recursive[2]
		cy = recursive[3]
	}
	// greater than 120 degrees requires multiple segments
	if (Math.abs(f2 - f1) > _120) {
		var f2old = f2
		var x2old = x2
		var y2old = y2
		f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1)
		x2 = cx + rx * Math.cos(f2)
		y2 = cy + ry * Math.sin(f2)
		var res = arc(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy])
	}
	var t = Math.tan((f2 - f1) / 4)
	var hx = 4 / 3 * rx * t
	var hy = 4 / 3 * ry * t
	var curve = [
		2 * x1 - (x1 + hx * Math.sin(f1)),
		2 * y1 - (y1 - hy * Math.cos(f1)),
		x2 + hx * Math.sin(f2),
		y2 - hy * Math.cos(f2),
		x2,
		y2
	]
	if (recursive) return curve
	if (res) curve = curve.concat(res)
	for (var i = 0; i < curve.length;) {
		var rot = rotate(curve[i], curve[i+1], angle)
		curve[i++] = rot.x
		curve[i++] = rot.y
	}
	return curve
}

function rotate(x, y, rad){
	return {
		x: x * Math.cos(rad) - y * Math.sin(rad),
		y: x * Math.sin(rad) + y * Math.cos(rad)
	}
}

function radians(degress){
	return degress * (π / 180)
}

},{}],26:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],27:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}],28:[function(require,module,exports){
module.exports = function vec2Copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    return out
}
},{}],29:[function(require,module,exports){
"use strict";
var window = require("global/window")
var isFunction = require("is-function")
var parseHeaders = require("parse-headers")
var xtend = require("xtend")

module.exports = createXHR
// Allow use of default import syntax in TypeScript
module.exports.default = createXHR;
createXHR.XMLHttpRequest = window.XMLHttpRequest || noop
createXHR.XDomainRequest = "withCredentials" in (new createXHR.XMLHttpRequest()) ? createXHR.XMLHttpRequest : window.XDomainRequest

forEachArray(["get", "put", "post", "patch", "head", "delete"], function(method) {
    createXHR[method === "delete" ? "del" : method] = function(uri, options, callback) {
        options = initParams(uri, options, callback)
        options.method = method.toUpperCase()
        return _createXHR(options)
    }
})

function forEachArray(array, iterator) {
    for (var i = 0; i < array.length; i++) {
        iterator(array[i])
    }
}

function isEmpty(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)) return false
    }
    return true
}

function initParams(uri, options, callback) {
    var params = uri

    if (isFunction(options)) {
        callback = options
        if (typeof uri === "string") {
            params = {uri:uri}
        }
    } else {
        params = xtend(options, {uri: uri})
    }

    params.callback = callback
    return params
}

function createXHR(uri, options, callback) {
    options = initParams(uri, options, callback)
    return _createXHR(options)
}

function _createXHR(options) {
    if(typeof options.callback === "undefined"){
        throw new Error("callback argument missing")
    }

    var called = false
    var callback = function cbOnce(err, response, body){
        if(!called){
            called = true
            options.callback(err, response, body)
        }
    }

    function readystatechange() {
        if (xhr.readyState === 4) {
            setTimeout(loadFunc, 0)
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else {
            body = xhr.responseText || getXml(xhr)
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "Unknown XMLHttpRequest Error") )
        }
        evt.statusCode = 0
        return callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        if (aborted) return
        var status
        clearTimeout(timeoutTimer)
        if(options.useXDR && xhr.status===undefined) {
            //IE8 CORS GET successful response doesn't have a status field, but body is fine
            status = 200
        } else {
            status = (xhr.status === 1223 ? 204 : xhr.status)
        }
        var response = failureResponse
        var err = null

        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        return callback(err, response, response.body)
    }

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new createXHR.XDomainRequest()
        }else{
            xhr = new createXHR.XMLHttpRequest()
        }
    }

    var key
    var aborted
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer
    var failureResponse = {
        body: undefined,
        headers: {},
        statusCode: 0,
        method: method,
        url: uri,
        rawRequest: xhr
    }

    if ("json" in options && options.json !== false) {
        isJson = true
        headers["accept"] || headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["content-type"] || headers["Content-Type"] || (headers["Content-Type"] = "application/json") //Don't override existing accept header declared by user
            body = JSON.stringify(options.json === true ? body : options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.onabort = function(){
        aborted = true;
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync, options.username, options.password)
    //has to be after open
    if(!sync) {
        xhr.withCredentials = !!options.withCredentials
    }
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            if (aborted) return
            aborted = true//IE9 may still call readystatechange
            xhr.abort("timeout")
            var e = new Error("XMLHttpRequest timeout")
            e.code = "ETIMEDOUT"
            errorFunc(e)
        }, options.timeout )
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers && !isEmpty(options.headers)) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }

    if ("beforeSend" in options &&
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    // Microsoft Edge browser sends "undefined" when send is called with undefined value.
    // XMLHttpRequest spec says to pass null as body to indicate no body
    // See https://github.com/naugtur/xhr/issues/100.
    xhr.send(body || null)

    return xhr


}

function getXml(xhr) {
    // xhr.responseXML will throw Exception "InvalidStateError" or "DOMException"
    // See https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseXML.
    try {
        if (xhr.responseType === "document") {
            return xhr.responseXML
        }
        var firefoxBugTakenEffect = xhr.responseXML && xhr.responseXML.documentElement.nodeName === "parsererror"
        if (xhr.responseType === "" && !firefoxBugTakenEffect) {
            return xhr.responseXML
        }
    } catch (e) {}

    return null
}

function noop() {}

},{"global/window":16,"is-function":30,"parse-headers":31,"xtend":32}],30:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],31:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":8,"trim":26}],32:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[1]);
