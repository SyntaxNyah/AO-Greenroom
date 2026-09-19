import{w as r}from"./mmdStage-CzLPsH-_.js";import"./index-C5kJ3GPh.js";const e="passPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);}`;r.ShadersStore[e]||(r.ShadersStore[e]=a);const s={name:e,shader:a};export{s as passPixelShader};
