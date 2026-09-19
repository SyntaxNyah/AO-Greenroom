import{w as a}from"./mmdStage-CRyRuQDK.js";import"./index-BUDfz2qs.js";const e="textureAlphaCheckerPixelShader",r=`
precision highp float;uniform sampler2D textureSampler;varying vec2 vUv;void main() {gl_FragColor=vec4(vec3(1.0)-vec3(texture2D(textureSampler,vUv).a),1.0);}
`;a.ShadersStore[e]=r;const h={name:e,shader:r};export{h as TextureAlphaCheckerPixelShader};
