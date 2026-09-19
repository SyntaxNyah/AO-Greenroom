import{w as t}from"./mmdStage-B116ZMi5.js";import"./index-D2MxVOoB.js";const e="textureAlphaCheckerVertexShader",r=`
precision highp float;attribute vec2 uv;varying vec2 vUv;void main() {vUv=uv;gl_Position=vec4(mod(uv,1.0)*2.0-1.0,0.0,1.0);}
`;t.ShadersStore[e]=r;const h={name:e,shader:r};export{h as TextureAlphaCheckerVertexShader};
