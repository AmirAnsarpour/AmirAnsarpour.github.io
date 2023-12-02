/*********
 * made by Matthias Hurrle (@atzedent)
 */

/** @type {HTMLCanvasElement} */
const canvas = window.canvas
const gl = canvas.getContext("webgl2")
const dpr = Math.max(1, window.devicePixelRatio)

const vertexSource = `#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

in vec2 position;

void main(void) {
    gl_Position = vec4(position, 0., 1.);
}
`
const fragmentSource = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*/
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

out vec4 fragColor;

uniform vec2 resolution;
uniform float time;

#define T time

mat2 rot(float a) {
    float s = sin(a), c = cos(a);

    return mat2(c, -s, s, c);
}

float herp(float x) {
  return 3.*x*x - 2.*x*x*x;
}

float circle(vec2 gv, float r, float blur) {
  float d = 2. * dot(gv, gv);
  
  return smoothstep (
    r - blur,
    r + blur,
    d
  );
}

vec3 pattern(vec2 uv) {
    float fa = 1., fb = 1., fc = 1., fd = .0;

    for (int i = 0; i < 10; i++) {
        vec2 p = vec2(
            cos(uv.y * fa - fd + T / fb),
            sin(uv.x * fa - fd + T / fb)
        ) / fc;
        p += vec2(-p.y, p.x) * .3;
        uv.xy += p;

        fa *= 2.;
        fb *= 1.5;
        fc *= 1.75;

        fd += .05 + .1 * T * fb;
    }
    float
    r = sin(uv.x - T) * .5 + .5,
    b = sin(uv.y + T) * .5 + .5,
    g = sin((uv.x + uv.y + sin(T * .5)) * .5) * .5 + .5;

    return vec3(r, g, b);
}

void main(void) {
  vec2 uv = (
    gl_FragCoord.xy - .5 * resolution.xy
  ) / resolution.y;
  
  float f = herp(.5 * (cos(T * .125) + 1.));
  uv *= rot(6.283 * f);

  float zoom = 2. + 6. * f;
  uv *= zoom;

  vec2 gv = fract(uv * zoom) - .5;
  vec2 id = floor(uv * zoom);
  float cos_t = cos(T-id.y*50.);

  float radius = .25 * herp(.5 * cos_t + 1.);
  float d = circle(gv, radius, 2. / max(resolution.x, resolution.y));
  d += circle(gv - .05, radius, radius);

  vec3 col = vec3(1.-d);
    vec3 st = pattern(uv);

  float
  r = min(st.r, .5 * (1. - cos_t) * col.z),
  g = min(st.b, .5 * (- cos_t + 1.) * col.x),
  b = min(st.g * 2.1, .5 * (1. - cos_t) * col.y),
    a = 1.;

  fragColor =
    vec4(vec3(g, b, r) - st, a) * 4.;
}   
`
let time
let buffer
let program
let resolution
let vertices = []

function resize() {
    const { innerWidth: width, innerHeight: height } = window

    canvas.width = width * dpr
    canvas.height = height * dpr

    gl.viewport(0, 0, width * dpr, height * dpr)
}

function compile(shader, source) {
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader))
    }
}

function setup() {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    const fs = gl.createShader(gl.FRAGMENT_SHADER)

    program = gl.createProgram()

    compile(vs, vertexSource)
    compile(fs, fragmentSource)

    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
    }

    vertices = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]

    buffer = gl.createBuffer()

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

    const position = gl.getAttribLocation(program, "position")

    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    time = gl.getUniformLocation(program, "time")
    resolution = gl.getUniformLocation(program, "resolution")
}

function draw(now) {
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    gl.uniform1f(time, now * 0.001)
    gl.uniform2f(resolution, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length * 0.5)
}

function loop(now) {
    draw(now)
    requestAnimationFrame(loop)
}

function init() {
    setup()
    resize()
    loop(0)
}

document.body.onload = init
window.onresize = resize