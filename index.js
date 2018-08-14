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
      vert: glsl`
        precision mediump float;

        attribute vec4 position;
        attribute vec3 color;
        attribute float id;

        uniform mat4 proj;
        uniform float time;

        varying vec3 vColor;

        #pragma glslify: expo = require('glsl-easings/exponential-out')
        #pragma glslify: bounce = require('glsl-easings/bounce-out')

        void main () {
          vColor = color;

          vec2 P = position.xy;
          vec2 N = position.zw;

          float speed = 1.0;
          float delay = 1.0 + speed * id * 0.04125 + 0.5 * abs((P.y / 512.0) * 2.0 - 1.0);
          float thick = clamp(time * speed - delay, 0.0, 1.0);

          thick = expo(thick);

          gl_Position = proj * vec4(P + N * thick * 5.0, 0, 1);
        }
        `,
        frag: glsl`
        precision mediump float;

        varying vec3 vColor;

        void main() {
          gl_FragColor = vec4(vColor, 0.85);
        }
      `,
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
      vert: glsl`
        precision mediump float;

        attribute vec4 position;
        attribute vec3 color;
        attribute float id;

        uniform mat4 proj;
        uniform float time;
        uniform float hover;

        varying vec2 coord;
        varying vec3 vColor;

        #pragma glslify: expo = require('glsl-easings/exponential-in-out')
        #pragma glslify: bounce = require('glsl-easings/bounce-out')
        #pragma glslify: bounceIn = require('glsl-easings/bounce-in')

        void main () {
          vColor = color;

          vec2 P = position.zw;
          vec2 N = coord = position.xy;


          float speed = 0.8;
          float delay = id * 0.03125 * speed;

          float scale = clamp(time * speed - delay, 0.0, 1.0);

          if (time < 15.0) {
            P += vec2(sin(id), cos(id)) * 30.0 * expo(max(0.0, 1.0 - scale * 1.2));
          }

          scale = bounce(scale);
          scale += hover * scale * expo(max(0.0, sin(time * 2.5 + (P.y - P.x + id) * 0.1)));
          // scale *= 1.0 + bounce(max(0.0, sin(time * 4.0 + (P.y - P.x) * 0.1)));

          gl_Position = proj * vec4(P + N * 5.0 * scale, 0.5, 1);
        }
        `,
        frag: glsl`
        precision mediump float;

        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        #endif

        varying vec2 coord;
        varying vec3 vColor;

        #pragma glslify: aastep = require('glsl-aastep')

        void main () {
          gl_FragColor = vec4(vColor, 1.0 - aastep(1.0, length(coord)));
        }
      `,
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
