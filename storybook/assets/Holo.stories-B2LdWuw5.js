const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./prism-CRBLf5J4.js","./rolldown-runtime-sJBDdmOt.js","./build-CGrXap9d.js","./shatter-DjIYmjHF.js","./nebula-CUGQBQ1M.js","./glitter-C-O18T_v.js","./sparkle-Jh3gRSyM.js","./vortex-D2FbgBbd.js","./emboss-_JYyKEyH.js"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-sJBDdmOt.js";import{n,t as r}from"./preload-helper-2GovK0wV.js";import{n as i,t as a}from"./logo-640w-20p-22Elz6NL.js";import{L as o,g as s,m as c,p as l,z as u}from"./utils-_F9SZfcx.js";import"./preset-DFGAZ5Mi.js";import{n as d,t as f}from"./jellyfish-DtC6VyHr.js";import{n as p,t as m}from"./pigeon-Dic8r3mQ.js";function h(e,t,n){let r=Math.abs(e);if(!(r>=2**-62)||!Number.isFinite(e)){t[n]=0,t[n+1]=0,t[n+2]=0;return}let i=Math.floor(Math.log2(r)),a=Math.round((r/2**i-1)*65536);a>=65536?(a=0,i+=1):a<0&&(a+=65536,--i);let o=Math.min(Math.max(i+_,1),127);t[n]=(e<0?128:0)+o,t[n+1]=a>>8,t[n+2]=a&255}function g(e){let t=e&32768?-1:1,n=e>>10&31,r=e&1023;return n===0?t*r*2**-24:n===31?r?NaN:t*(1/0):t*(1+r/1024)*2**(n-15)}var _,v;function y(){return(y=e((()=>{_=63,v=`
float decodeFloat24(vec3 c) {
    vec3 b = floor(c * 255.0 + 0.5);
    float e = mod(b.x, 128.0);
    if (e < 0.5) return 0.0;
    float v = (1.0 + (b.y * 256.0 + b.z) / 65536.0) * exp2(e - ${_.toFixed(1)});
    return b.x >= 128.0 ? -v : v;
}
`})))()}var b;function x(){return(x=e((()=>{b={card:{prism:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5},"prism.pitch":1765,"prism.pattern":`concentric`,"prism.nc":1.56,"prism.waviness":0,"prism.coatAlpha":.01,"prism.orangePeel":0,"prism.seed":291},pose:{rx:-20.5,ry:-25}},shatter:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},nebula:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},sparkle:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},vortex:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},emboss:{values:{"dof.lens":51,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.3,y:-.7},"studio.panel.width":22,"studio.panel.length":8,"studio.panel.radiance":6,"studio.panel.distance":.45,"studio.spotA.dir":{x:.42,y:.33},"studio.spotA.size":2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":2800,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":.35,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":-28,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"card.bow":2,"motion.pose":{x:-.5,y:0},"emboss.height":15,"emboss.shoulder":.1,"emboss.profile":`bevel`,"emboss.puff":.3,"emboss.foil":`concentric`,"emboss.pitch":1200,"emboss.grooveAngle":149,"emboss.foilCoverage":1,"emboss.edgeBreakup":.31,"emboss.showThrough":0,"emboss.gloss":0,"emboss.sparkleSize":380,"emboss.foilBump":.29,"emboss.textureStrength":0,"emboss.fibreScale":1.32},pose:{rx:0,ry:-.5}}},object:{prism:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5},"prism.pitch":1765,"prism.pattern":`concentric`,"prism.nc":1.56,"prism.waviness":0,"prism.coatAlpha":.01,"prism.orangePeel":0,"prism.seed":291},pose:{rx:2.5,ry:-27}},shatter:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5}},pose:{rx:2.5,ry:-27}},nebula:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5},"nebula.size":140,"nebula.shape":`round`,"nebula.tilt":2.7,"nebula.curv":.05,"nebula.coverage":.57,"nebula.pitchMin":1180,"nebula.pitchMax":870,"nebula.depth":146,"nebula.starDensity":30,"nebula.baseColor":`#22155f`,"nebula.nc":1.65,"nebula.tintEdge":516,"nebula.tintWidth":150,"nebula.tintFloor":.07,"nebula.waviness":.57,"nebula.coatAlpha":.01,"nebula.orangePeel":1.2},pose:{rx:2.5,ry:-27}},sparkle:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5},"sparkle.size":215,"sparkle.coverage":.8},pose:{rx:2.5,ry:-27}},vortex:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5}},pose:{rx:2.5,ry:-27}}}}})))()}var S;function C(){return(C=e((()=>{S={"emboss.stock":{cotton:{"emboss.paperColour":`#f3f1ea`,"emboss.textureStrength":1,"emboss.fibreAmount":.55,"emboss.fibreScale":1,"emboss.tooth":7,"emboss.formation":.45,"emboss.roughness":.75,"emboss.sheen":.35,"emboss.translucency":.35},felt:{"emboss.paperColour":`#f2efe7`,"emboss.textureStrength":1.15,"emboss.fibreAmount":.45,"emboss.fibreScale":1,"emboss.tooth":10,"emboss.formation":.4,"emboss.roughness":.8,"emboss.sheen":.3,"emboss.translucency":.3},smooth:{"emboss.paperColour":`#f5f4f0`,"emboss.textureStrength":.7,"emboss.fibreAmount":.3,"emboss.fibreScale":.8,"emboss.tooth":3,"emboss.formation":.3,"emboss.roughness":.55,"emboss.sheen":.5,"emboss.translucency":.25},laid:{"emboss.paperColour":`#efe9dc`,"emboss.textureStrength":1,"emboss.fibreAmount":.45,"emboss.fibreScale":1.1,"emboss.tooth":6,"emboss.formation":.55,"emboss.roughness":.7,"emboss.sheen":.35,"emboss.translucency":.4},linen:{"emboss.paperColour":`#f5f3ee`,"emboss.textureStrength":1,"emboss.fibreAmount":.35,"emboss.fibreScale":.9,"emboss.tooth":4.5,"emboss.formation":.3,"emboss.roughness":.65,"emboss.sheen":.4,"emboss.translucency":.3},kraft:{"emboss.paperColour":`#b48c63`,"emboss.textureStrength":1.2,"emboss.fibreAmount":.85,"emboss.fibreScale":1.4,"emboss.tooth":8,"emboss.formation":.6,"emboss.roughness":.8,"emboss.sheen":.25,"emboss.translucency":.15}}}})))()}var w,ee;function te(){return(te=e((()=>{w={"dof.on":!1,"dof.fstop":`2.8`,"dof.focus":`object`,"dof.point":{x:0,y:0},"dof.pointZ":0,"dof.distance":32,"dof.offset":0,"dof.blades":`9`,"dof.bladeCurve":.6,"dof.bladeAngle":0,"dof.catsEye":.3,"dof.rim":.15,"dof.loca":.2,"display.wideGamut":!0,"card.corner":3.2,"card.thickness":.33,"card.border":`ink`,"card.borderColor":`#ece9e2`,"card.backColor":`#22304a`,"card.edgeSilver":!0,"bump.map":`/bumps/scratches.jpg`,"bump.strength":.78,"bump.tiling":3.5,"bump.layer":`foil`,"bump.invert":!0,"emboss.element":`foil`,"emboss.shape":`square`,"emboss.aspect":1,"emboss.cornerRadius":2.5,"emboss.edit":!1,"emboss.holo.type":`reflection`,"emboss.holo.subject":`eagle`,"emboss.holo.size":80,"emboss.holo.depth":-25,"emboss.holo.yaw":0,"emboss.holo.pitch":-10,"emboss.holo.recLight":{x:-.5,y:.5},"emboss.holo.speckle":.5,"emboss.holo.backdrop":`seal`,"emboss.holo.backdropDepth":-100,"emboss.holo.patternSize":50,"emboss.holo.lineWidth":.22,"emboss.holo.gratingPitch":1e3,"emboss.holo.patternStrength":1,"emboss.holo.patternRotation":0,"emboss.holo.patternDepth":-8,"emboss.holo.colour":545,"emboss.holo.bandwidth":30,"emboss.holo.reference":{x:-.25,y:-.68},"emboss.holo.selectivity":16,"emboss.holo.slit":9,"emboss.holo.efficiency":.85,"emboss.holo.recording":`stereogram`,"emboss.holo.views":20,"emboss.holo.viewBlend":.5,"emboss.holo.viewZone":30,"emboss.holo.coatAlpha":.04,"emboss.holo.glare":.15,"emboss.filmUm":40,"emboss.filmWall":0,"emboss.thickness":.8,"emboss.doc":``},ee=new Set(`scene.material,scene.object,scene.orbit,scene.orbitGlide,scene.autoMotion,scene.print,scene.wall,scene.wallArt1,scene.wallArt2,scene.wallArt3,scene.wallArt4,scene.wallFill1,scene.wallFill2,scene.wallFill3,scene.wallFill4,scene.flagImage,object.bend,object.amplitude,object.wavelength,object.crumple,object.seed,object.modelSize,object.modelMapping,object.structureScale,object.doubleSided,object.clothSize,object.clothAspect,object.clothViscosity,object.clothStiffness,object.clothSmoothing,object.clothMemory,object.clothFloat,object.clothGrab,object.clothShadow,object.clothTwoSided,object.wallView,object.wallParallax,object.wallBorder,object.wallBorderMm,object.wallShadow,object.wallShadowSoft,object.wallContact,object.wallBumps,object.wallBubbles,object.wallCreases,object.wallEdgeLift,object.wallGloss,object.wallStiffness,object.wallAdhesion,object.flagPaused,object.flagTimeSpeed,object.flagWind,object.flagWindDir,object.flagWindLift,object.flagGust,object.flagTurb,object.flagFlutter,object.flagSeed,object.flagSurface,object.flagColour,object.flagSize,object.flagAspect,object.flagTail,object.flagTailDepth,object.flagWeight,object.flagStiffness,object.flagSheen,object.flagTranslucency,object.flagShadow,object.flagPoleAngle,object.flagAttach,object.flagRings,object.flagFinial,display.quality,motion.spring,motion.hold,motion.gyro,motion.gyroGain,volume.type,volume.subject,volume.size,volume.depth,volume.yaw,volume.pitch,volume.recLight,volume.speckle,volume.backdrop,volume.backdropDepth,volume.patternSize,volume.lineWidth,volume.gratingPitch,volume.patternStrength,volume.patternRotation,volume.patternDepth,volume.colour,volume.bandwidth,volume.reference,volume.selectivity,volume.slit,volume.efficiency,volume.recording,volume.views,volume.viewBlend,volume.viewZone,volume.waviness,volume.coatAlpha,volume.glare,volume.orangePeel,volume.seed`.split(`,`))})))()}var ne;function re(){return(re=e((()=>{ne=[{id:`dof.lens`,kind:`slider`,default:62,min:24,max:200,step:1},{id:`scene.background`,kind:`select`,default:`white`,options:[`black`,`white`,`colour`]},{id:`scene.bgColor`,kind:`color`,default:`#3a4458`},{id:`studio.preset`,kind:`select`,default:`studio`,options:[`studio`,`spot`,`softbox`,`strip`,`dark`,`desk`,`office`,`raking`]},{id:`studio.panel.on`,kind:`toggle`,default:!0},{id:`studio.panel.dir`,kind:`pad`,default:{x:-.48,y:.66},min:-1,max:1,step:.01},{id:`studio.panel.width`,kind:`slider`,default:14,min:1,max:80,step:1},{id:`studio.panel.length`,kind:`slider`,default:50,min:1,max:90,step:1},{id:`studio.panel.radiance`,kind:`slider`,default:4,min:0,max:50,step:.1},{id:`studio.panel.distance`,kind:`slider`,default:.9,min:.3,max:3,step:.05},{id:`studio.panel.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.spotA.on`,kind:`toggle`,default:!0},{id:`studio.spotA.dir`,kind:`pad`,default:{x:-.04,y:-.1},min:-1,max:1,step:.01},{id:`studio.spotA.size`,kind:`slider`,default:1.5,min:.2,max:10,step:.1},{id:`studio.spotA.radiance`,kind:`slider`,default:1200,min:0,max:5e3,step:10},{id:`studio.spotA.distance`,kind:`slider`,default:1,min:.3,max:3,step:.05},{id:`studio.spotA.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.spotB.on`,kind:`toggle`,default:!0},{id:`studio.spotB.dir`,kind:`pad`,default:{x:-.25,y:-.68},min:-1,max:1,step:.01},{id:`studio.spotB.size`,kind:`slider`,default:2.5,min:.2,max:10,step:.1},{id:`studio.spotB.radiance`,kind:`slider`,default:600,min:0,max:5e3,step:10},{id:`studio.spotB.distance`,kind:`slider`,default:1.2,min:.3,max:3,step:.05},{id:`studio.spotB.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.spotC.on`,kind:`toggle`,default:!1},{id:`studio.spotC.dir`,kind:`pad`,default:{x:.21,y:-.37},min:-1,max:1,step:.01},{id:`studio.spotC.size`,kind:`slider`,default:1,min:.2,max:10,step:.1},{id:`studio.spotC.radiance`,kind:`slider`,default:1200,min:0,max:5e3,step:10},{id:`studio.spotC.distance`,kind:`slider`,default:1,min:.3,max:3,step:.05},{id:`studio.spotC.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.ambient.rims`,kind:`slider`,default:3,min:0,max:10,step:.1},{id:`studio.ambient.fill`,kind:`slider`,default:.4,min:0,max:3,step:.05},{id:`studio.ambient.scrim`,kind:`slider`,default:.4,min:0,max:2,step:.05},{id:`studio.ambient.cameraSide`,kind:`slider`,default:.004,min:0,max:.1,step:.001},{id:`studio.ambient.cameraTexture`,kind:`slider`,default:1,min:0,max:1,step:.05},{id:`studio.ambient.backdrop`,kind:`slider`,default:1,min:0,max:1,step:.01},{id:`studio.ambient.rotation`,kind:`slider`,default:0,min:-180,max:180,step:1},{id:`studio.flash.size`,kind:`slider`,default:8.5,min:1,max:20,step:.5},{id:`studio.flash.distance`,kind:`slider`,default:.3,min:.15,max:1,step:.01},{id:`studio.flash.radiance`,kind:`slider`,default:1500,min:0,max:5e3,step:10},{id:`studio.flash.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`display.ev`,kind:`slider`,default:.5,min:-3,max:3,step:.1},{id:`display.tone`,kind:`select`,default:`neutral`,options:[`neutral`,`agx`,`clamp`]},{id:`display.glare`,kind:`slider`,default:.03,min:0,max:.1,step:.005},{id:`display.glareRadius`,kind:`slider`,default:8,min:2,max:32,step:1},{id:`grain.on`,kind:`toggle`,default:!0},{id:`grain.amount`,kind:`slider`,default:.07,min:0,max:.6,step:.005},{id:`grain.size`,kind:`slider`,default:1,min:1,max:4,step:.25},{id:`grain.animated`,kind:`toggle`,default:!0},{id:`grain.colour`,kind:`select`,default:`mono`,options:[`mono`,`rgb`]},{id:`grain.onBackground`,kind:`toggle`,default:!1},{id:`card.bow`,kind:`slider`,default:1.6,min:0,max:2,step:.05},{id:`card.bowAxis`,kind:`select`,default:`across`,options:[`across`,`along`]},{id:`card.emboss`,kind:`select`,default:`crosshatch`,options:[`none`,`lines`,`crosshatch`]},{id:`card.embossPitch`,kind:`slider`,default:1.17,min:.15,max:2,step:.01},{id:`card.embossHeight`,kind:`slider`,default:.5,min:0,max:15,step:.5},{id:`card.embossLayer`,kind:`select`,default:`varnish`,options:[`foil`,`varnish`]},{id:`card.wear`,kind:`slider`,default:.16,min:0,max:1,step:.01},{id:`motion.pointer`,kind:`select`,default:`tilt`,options:[`tilt`,`light`,`flash`,`none`]},{id:`motion.tiltRange`,kind:`slider`,default:25,min:5,max:35,step:1},{id:`motion.pose`,kind:`pad`,default:{x:0,y:0},min:-35,max:35,step:.5},{id:`motion.wobble`,kind:`toggle`,default:!0},{id:`motion.wobbleAmp`,kind:`slider`,default:14,min:0,max:25,step:.5},{id:`prism.pitch`,kind:`slider`,default:1e3,min:500,max:2e3,step:5},{id:`prism.grooveAngle`,kind:`slider`,default:120,min:0,max:180,step:1},{id:`prism.pattern`,kind:`select`,default:`linear`,options:[`linear`,`concentric`,`radial`]},{id:`prism.depth`,kind:`slider`,default:50,min:0,max:200,step:1},{id:`prism.coverage`,kind:`slider`,default:1,min:0,max:1,step:.01},{id:`prism.fan`,kind:`slider`,default:7,min:0,max:20,step:.1},{id:`prism.sigTheta`,kind:`slider`,default:.3,min:0,max:5,step:.05},{id:`prism.sigPitch`,kind:`slider`,default:.5,min:0,max:3,step:.05},{id:`prism.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`prism.roughness`,kind:`slider`,default:.2,min:.05,max:3,step:.05},{id:`prism.tint`,kind:`select`,default:`clear`,options:[`clear`,`longpass`,`shortpass`]},{id:`prism.tintEdge`,kind:`slider`,default:505,min:400,max:700,step:1},{id:`prism.tintWidth`,kind:`slider`,default:35,min:5,max:150,step:1},{id:`prism.tintFloor`,kind:`slider`,default:.06,min:0,max:1,step:.01},{id:`prism.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`prism.coatAlpha`,kind:`slider`,default:.04,min:.01,max:.5,step:.005},{id:`prism.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`prism.seed`,kind:`slider`,default:1,min:1,max:999,step:1},{id:`shatter.size`,kind:`slider`,default:2.5,min:.5,max:8,step:.1},{id:`shatter.jitter`,kind:`slider`,default:.9,min:0,max:1,step:.01},{id:`shatter.chords`,kind:`slider`,default:1.8,min:0,max:3,step:.1},{id:`shatter.orientK`,kind:`slider`,default:0,min:0,max:24,step:1},{id:`shatter.tilt`,kind:`slider`,default:1,min:0,max:6,step:.05},{id:`shatter.fan`,kind:`slider`,default:5,min:0,max:15,step:.1},{id:`shatter.pitchA`,kind:`slider`,default:1150,min:500,max:2e3,step:5},{id:`shatter.pitchB`,kind:`slider`,default:1080,min:500,max:2e3,step:5},{id:`shatter.pitchC`,kind:`slider`,default:870,min:500,max:2e3,step:5},{id:`shatter.depth`,kind:`slider`,default:95,min:0,max:200,step:1},{id:`shatter.coverage`,kind:`slider`,default:.7,min:.2,max:1,step:.01},{id:`shatter.chirp`,kind:`slider`,default:0,min:0,max:5,step:.1},{id:`shatter.ridgeH`,kind:`slider`,default:.3,min:-.4,max:.4,step:.01},{id:`shatter.ridgeW`,kind:`slider`,default:40,min:10,max:200,step:1},{id:`shatter.creaseShare`,kind:`slider`,default:50,min:0,max:100,step:1},{id:`shatter.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`shatter.roughness`,kind:`slider`,default:.45,min:.05,max:3,step:.05},{id:`shatter.tint`,kind:`select`,default:`longpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`shatter.tintEdge`,kind:`slider`,default:500,min:400,max:700,step:1},{id:`shatter.tintWidth`,kind:`slider`,default:70,min:5,max:150,step:1},{id:`shatter.tintFloor`,kind:`slider`,default:.25,min:0,max:1,step:.01},{id:`shatter.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`shatter.coatAlpha`,kind:`slider`,default:.05,min:.01,max:.5,step:.005},{id:`shatter.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`shatter.seed`,kind:`slider`,default:7,min:1,max:999,step:1},{id:`nebula.size`,kind:`slider`,default:200,min:50,max:400,step:5},{id:`nebula.shape`,kind:`select`,default:`hex`,options:[`hex`,`square`,`round`]},{id:`nebula.layers`,kind:`slider`,default:2,min:1,max:3,step:1},{id:`nebula.tilt`,kind:`slider`,default:4.6,min:0,max:20,step:.1},{id:`nebula.curv`,kind:`slider`,default:.4,min:.05,max:3,step:.05},{id:`nebula.coverage`,kind:`slider`,default:.65,min:0,max:1,step:.01},{id:`nebula.pitchMin`,kind:`slider`,default:665,min:400,max:2e3,step:5},{id:`nebula.pitchMax`,kind:`slider`,default:740,min:400,max:2e3,step:5},{id:`nebula.depth`,kind:`slider`,default:100,min:0,max:200,step:1},{id:`nebula.starSize`,kind:`slider`,default:600,min:150,max:1500,step:10},{id:`nebula.starDensity`,kind:`slider`,default:3,min:0,max:30,step:.5},{id:`nebula.baseColor`,kind:`color`,default:`#0c0a24`},{id:`nebula.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`nebula.tint`,kind:`select`,default:`shortpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`nebula.tintEdge`,kind:`slider`,default:525,min:400,max:700,step:1},{id:`nebula.tintWidth`,kind:`slider`,default:30,min:5,max:150,step:1},{id:`nebula.tintFloor`,kind:`slider`,default:.15,min:0,max:1,step:.01},{id:`nebula.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`nebula.coatAlpha`,kind:`slider`,default:.06,min:.01,max:.5,step:.005},{id:`nebula.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`nebula.seed`,kind:`slider`,default:3,min:1,max:999,step:1},{id:`sparkle.size`,kind:`slider`,default:470,min:100,max:1500,step:5},{id:`sparkle.coverage`,kind:`slider`,default:.4,min:.1,max:.8,step:.01},{id:`sparkle.irregularity`,kind:`slider`,default:.8,min:0,max:1,step:.01},{id:`sparkle.tilt`,kind:`slider`,default:.3,min:0,max:5,step:.05},{id:`sparkle.dome`,kind:`slider`,default:.3,min:.05,max:2,step:.05},{id:`sparkle.orientJitter`,kind:`slider`,default:2,min:0,max:15,step:.1},{id:`sparkle.pitch`,kind:`slider`,default:1e3,min:500,max:2e3,step:5},{id:`sparkle.grooveAngle`,kind:`slider`,default:120,min:0,max:180,step:1},{id:`sparkle.depth`,kind:`slider`,default:55,min:0,max:200,step:1},{id:`sparkle.fan`,kind:`slider`,default:12,min:0,max:30,step:.1},{id:`sparkle.pitchJitter`,kind:`slider`,default:1.5,min:0,max:5,step:.05},{id:`sparkle.speckShare`,kind:`slider`,default:9,min:0,max:30,step:.5},{id:`sparkle.speckType`,kind:`select`,default:`dyed`,options:[`dyed`,`grating`]},{id:`sparkle.speckDyePeak`,kind:`slider`,default:460,min:420,max:520,step:1},{id:`sparkle.speckDyeWidth`,kind:`slider`,default:25,min:10,max:60,step:1},{id:`sparkle.speckDyeFloor`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`sparkle.speckPitch`,kind:`slider`,default:700,min:400,max:2e3,step:5},{id:`sparkle.speckSize`,kind:`slider`,default:.9,min:.3,max:1,step:.01},{id:`sparkle.matte`,kind:`slider`,default:8,min:1,max:20,step:.1},{id:`sparkle.sandSize`,kind:`slider`,default:.5,min:.15,max:1,step:.01},{id:`sparkle.sandTilt`,kind:`slider`,default:5,min:0,max:8,step:.1},{id:`sparkle.hazeShare`,kind:`slider`,default:0,min:0,max:1,step:.01},{id:`sparkle.hazeDepth`,kind:`slider`,default:60,min:0,max:200,step:1},{id:`sparkle.hazeRoughness`,kind:`slider`,default:1.5,min:.05,max:6,step:.05},{id:`sparkle.hazeFan`,kind:`slider`,default:10,min:0,max:20,step:.1},{id:`sparkle.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`sparkle.tint`,kind:`select`,default:`shortpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`sparkle.tintEdge`,kind:`slider`,default:600,min:400,max:700,step:1},{id:`sparkle.tintWidth`,kind:`slider`,default:90,min:5,max:150,step:1},{id:`sparkle.tintFloor`,kind:`slider`,default:.5,min:0,max:1,step:.01},{id:`sparkle.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`sparkle.coatAlpha`,kind:`slider`,default:.05,min:.01,max:.5,step:.005},{id:`sparkle.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`sparkle.seed`,kind:`slider`,default:5,min:1,max:999,step:1},{id:`vortex.pitch`,kind:`slider`,default:1250,min:600,max:2e3,step:5},{id:`vortex.swirl`,kind:`slider`,default:15,min:0,max:60,step:.5},{id:`vortex.handedness`,kind:`select`,default:`ccw`,options:[`ccw`,`cw`]},{id:`vortex.centre`,kind:`pad`,default:{x:0,y:0},min:-1,max:1,step:.01},{id:`vortex.depth`,kind:`slider`,default:45,min:0,max:200,step:1},{id:`vortex.fan`,kind:`slider`,default:1.5,min:0,max:10,step:.1},{id:`vortex.bands`,kind:`slider`,default:24,min:0,max:96,step:1},{id:`vortex.contrast`,kind:`slider`,default:.45,min:0,max:1,step:.01},{id:`vortex.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`vortex.roughness`,kind:`slider`,default:.25,min:.05,max:3,step:.05},{id:`vortex.tint`,kind:`select`,default:`longpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`vortex.tintEdge`,kind:`slider`,default:500,min:400,max:700,step:1},{id:`vortex.tintWidth`,kind:`slider`,default:50,min:5,max:150,step:1},{id:`vortex.tintFloor`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`vortex.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`vortex.coatAlpha`,kind:`slider`,default:.045,min:.01,max:.5,step:.005},{id:`vortex.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`vortex.seed`,kind:`slider`,default:9,min:1,max:999,step:1},{id:`emboss.logo`,kind:`image`,default:``},{id:`emboss.threshold`,kind:`slider`,default:.5,min:.01,max:.99,step:.01},{id:`emboss.x`,kind:`slider`,default:null,step:1},{id:`emboss.y`,kind:`slider`,default:null,step:1},{id:`emboss.width`,kind:`slider`,default:null,min:1,step:1},{id:`emboss.rotation`,kind:`slider`,default:0,min:-180,max:180,step:.5},{id:`emboss.height`,kind:`slider`,default:450,min:0,max:1e3,step:5},{id:`emboss.shoulder`,kind:`slider`,default:.6,min:.05,max:2,step:.01},{id:`emboss.profile`,kind:`select`,default:`round`,options:[`round`,`bevel`,`dome`,`deboss`]},{id:`emboss.puff`,kind:`slider`,default:.4,min:0,max:1,step:.01},{id:`emboss.foil`,kind:`select`,default:`rainbow`,options:[`rainbow`,`concentric`,`sparkle`,`silver`,`gold`]},{id:`emboss.pitch`,kind:`slider`,default:1e3,min:500,max:2e3,step:5},{id:`emboss.grooveAngle`,kind:`slider`,default:120,min:0,max:180,step:1},{id:`emboss.foilCoverage`,kind:`slider`,default:.85,min:0,max:1,step:.01},{id:`emboss.edgeBreakup`,kind:`slider`,default:.35,min:0,max:1,step:.01},{id:`emboss.showThrough`,kind:`slider`,default:.25,min:0,max:1,step:.01},{id:`emboss.gloss`,kind:`slider`,default:.8,min:0,max:1,step:.01},{id:`emboss.sparkleSize`,kind:`slider`,default:160,min:40,max:600,step:5},{id:`emboss.foilBump`,kind:`slider`,default:.25,min:0,max:1,step:.01},{id:`emboss.print`,kind:`image`,default:``,options:[]},{id:`emboss.printInk`,kind:`slider`,default:1,min:0,max:1,step:.01},{id:`emboss.paperColour`,kind:`color`,default:`#f3f1ea`},{id:`emboss.stock`,kind:`select`,default:`cotton`,options:[`cotton`,`felt`,`smooth`,`laid`,`linen`,`kraft`]},{id:`emboss.textureStrength`,kind:`slider`,default:1,min:0,max:2,step:.01},{id:`emboss.fibreAmount`,kind:`slider`,default:.55,min:0,max:1,step:.01},{id:`emboss.fibreScale`,kind:`slider`,default:1,min:.5,max:2,step:.01},{id:`emboss.tooth`,kind:`slider`,default:7,min:0,max:30,step:.5},{id:`emboss.formation`,kind:`slider`,default:.45,min:0,max:1,step:.01},{id:`emboss.roughness`,kind:`slider`,default:.75,min:.2,max:1,step:.01},{id:`emboss.sheen`,kind:`slider`,default:.35,min:0,max:1,step:.01},{id:`emboss.translucency`,kind:`slider`,default:.35,min:0,max:1,step:.01},{id:`emboss.waviness`,kind:`slider`,default:.12,min:0,max:1,step:.01},{id:`emboss.paperBump`,kind:`toggle`,default:!1},{id:`emboss.exposure`,kind:`slider`,default:.6,min:-2,max:2,step:.1},{id:`emboss.seed`,kind:`slider`,default:7,min:1,max:999,step:1}]})))()}var ie;function ae(){return(ae=e((()=>{ie={studio:{"studio.panel.on":!0,"studio.panel.dir":{x:-.48,y:.66},"studio.panel.width":14,"studio.panel.length":50,"studio.panel.radiance":4,"studio.panel.distance":.9,"studio.panel.spd":`equal`,"studio.spotA.on":!0,"studio.spotA.dir":{x:-.04,y:-.1},"studio.spotA.size":1.5,"studio.spotA.radiance":1200,"studio.spotA.distance":1,"studio.spotA.spd":`equal`,"studio.spotB.on":!0,"studio.spotB.dir":{x:-.25,y:-.68},"studio.spotB.size":2.5,"studio.spotB.radiance":600,"studio.spotB.distance":1.2,"studio.spotB.spd":`equal`,"studio.spotC.on":!1,"studio.ambient.rims":3,"studio.ambient.fill":.4,"studio.ambient.scrim":.4,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},spot:{"studio.panel.on":!1,"studio.spotA.on":!0,"studio.spotA.dir":{x:.48,y:.28},"studio.spotA.size":1.5,"studio.spotA.radiance":1200,"studio.spotA.distance":1,"studio.spotA.spd":`equal`,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":0,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.002,"studio.ambient.cameraTexture":0},softbox:{"studio.panel.on":!0,"studio.panel.dir":{x:.48,y:.28},"studio.panel.width":40,"studio.panel.length":40,"studio.panel.radiance":3,"studio.panel.distance":.8,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.1,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},strip:{"studio.panel.on":!0,"studio.panel.dir":{x:.48,y:.28},"studio.panel.width":6,"studio.panel.length":60,"studio.panel.radiance":12,"studio.panel.distance":.9,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.1,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},dark:{"studio.panel.on":!1,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":3,"studio.ambient.fill":.4,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},desk:{"studio.panel.on":!0,"studio.panel.dir":{x:-.55,y:.35},"studio.panel.width":30,"studio.panel.length":45,"studio.panel.radiance":3,"studio.panel.distance":1.5,"studio.panel.spd":`daylight`,"studio.spotA.on":!0,"studio.spotA.dir":{x:.45,y:.3},"studio.spotA.size":4,"studio.spotA.radiance":300,"studio.spotA.distance":.5,"studio.spotA.spd":`tungsten`,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.2,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.006,"studio.ambient.cameraTexture":1},office:{"studio.panel.on":!0,"studio.panel.dir":{x:0,y:.55},"studio.panel.width":4,"studio.panel.length":70,"studio.panel.radiance":20,"studio.panel.distance":1.6,"studio.panel.spd":`triphosphor`,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.3,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.01,"studio.ambient.cameraTexture":1},raking:{"studio.panel.on":!1,"studio.spotA.on":!0,"studio.spotA.dir":{x:-.83,y:.52},"studio.spotA.size":3,"studio.spotA.radiance":1500,"studio.spotA.distance":1,"studio.spotA.spd":`equal`,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.15,"studio.ambient.scrim":.3,"studio.ambient.cameraSide":.003,"studio.ambient.cameraTexture":1}}})))()}var T;function E(){return(E=e((()=>{T=[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]})))()}function oe(e){let t=e.split(`.`)[0];return t===`studio`||t===`display`||t===`grain`||t===`card`||t===`motion`||t===`scene`||t===`dof`}function se(e){return!!e&&typeof e==`object`&&e.holoDev===1&&typeof e.values==`object`}function ce(e){return Se(e)?{x:e.x,y:e.y}:e}function D(e){Ce.has(e)||(Ce.add(e),console.warn(e))}function le(e){if(typeof e!=`string`)return null;let t=e.trim().toLowerCase();return/^#[0-9a-f]{6}$/.test(t)?t:/^#[0-9a-f]{3}$/.test(t)?`#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`:null}function ue(e,t){let n=n=>{D(`HoloEffect: ${e.id} = ${JSON.stringify(t)} ${n}; ignored.`)},r=t=>{let n=e.min??-1/0,r=e.max??1/0,i=Math.min(Math.max(t,n),r);return i!==t&&D(`HoloEffect: ${e.id} = ${t} is outside ${e.min}–${e.max}; clamped to ${i}.`),i},i=e.default;switch(e.kind){case`slider`:return typeof t==`number`&&Number.isFinite(t)?r(t):n(`is not a number`);case`toggle`:return typeof t==`boolean`?t:n(`is not a boolean`);case`select`:return e.options&&!e.options.includes(String(t))?n(`is not one of ${e.options.join(`, `)}`):typeof i==`number`?Number(t):String(t);case`color`:return le(t)??n(`is not a #rgb / #rrggbb colour`);case`image`:return typeof t==`string`||typeof t==`object`&&!Se(t)?t:n(`is not a URL or an image`);case`pad`:return t&&typeof t==`object`&&Number.isFinite(t.x)&&Number.isFinite(t.y)?{x:r(t.x),y:r(t.y)}:n(`is not { x, y }`);default:return typeof t==typeof i||typeof i==`object`?t:n(`is not a ${typeof i}`)}}function de(e,t){let n=e.split(`.`)[0];we.has(n)&&!(e in w)&&xe.has(e)||ee.has(e)||(e in w?JSON.stringify(w[e])!==JSON.stringify(t)&&D(`HoloEffect: holo.spot setting ${e} is not supported by this port; ignored.`):D(`HoloEffect: unknown holo.spot setting ${e}; ignored.`))}function fe(e,t,n){let r={},i=`${e}.`,a=e=>xe.has(e)&&(oe(e)||e.startsWith(i));for(let e of ne)a(e.id)&&e.default!==null&&(r[e.id]=ce(e.default));let o=(e,t,n)=>{if(!a(e)){n&&de(e,t);return}let i=xe.get(e),o=i?ue(i,t):t;o!==void 0&&(r[e]=ce(o))},s=t===`plain`?null:b[t][e];if(s)for(let[e,t]of Object.entries(s.values))o(e,t,!1);let c=n[`studio.preset`];if(typeof c==`string`&&ie[c])for(let[e,t]of Object.entries(ie[c]))o(e,t,!1);for(let[e,t]of Object.entries(S)){let r=n[e];if(e.startsWith(i)&&typeof r==`string`&&t[r])for(let[e,n]of Object.entries(t[r]))o(e,n,!1)}for(let[e,t]of Object.entries(n))t!=null&&o(e,t,!0);let l=s?.pose??{rx:0,ry:0},u=n[`motion.pose`]===void 0?null:r[`motion.pose`];return{material:e,values:r,pose:u&&typeof u==`object`?{rx:u.y,ry:u.x}:{rx:l.rx,ry:l.ry}}}function O(e,t,n){let r=e[t];return typeof r==`number`&&Number.isFinite(r)?r:n}function k(e,t,n){let r=e[t];return typeof r==`boolean`?r:n}function pe(e,t,n){let r=e[t];return typeof r==`string`?r:n}function A(e,t,n,r){let i=e[t];return typeof i==`string`&&n.includes(i)?i:r}function me(e,t,n){let r=e[t];return r&&typeof r==`object`&&typeof r.x==`number`?{x:r.x,y:r.y}:n}function j(e,t,n){return Math.min(Math.max(e,t),n)}function he(e,t,n){return{on:k(e,`studio.${t}.on`,n.on),dir:me(e,`studio.${t}.dir`,n.dir),radiance:Math.max(O(e,`studio.${t}.radiance`,n.radiance),0),distanceM:O(e,`studio.${t}.distance`,n.distanceM),spd:A(e,`studio.${t}.spd`,T,`equal`)}}function ge(e){return{panel:{...he(e,`panel`,{on:!0,dir:{x:-.48,y:.66},radiance:4,distanceM:.9}),widthDeg:O(e,`studio.panel.width`,14),lengthDeg:O(e,`studio.panel.length`,50)},spotA:{...he(e,`spotA`,{on:!0,dir:{x:-.04,y:-.1},radiance:1200,distanceM:1}),sizeDeg:O(e,`studio.spotA.size`,1.5)},spotB:{...he(e,`spotB`,{on:!0,dir:{x:-.25,y:-.68},radiance:600,distanceM:1.2}),sizeDeg:O(e,`studio.spotB.size`,2.5)},spotC:{...he(e,`spotC`,{on:!1,dir:{x:.21,y:-.37},radiance:1200,distanceM:1}),sizeDeg:O(e,`studio.spotC.size`,1)},ambient:{rims:O(e,`studio.ambient.rims`,3),fill:O(e,`studio.ambient.fill`,.4),scrim:O(e,`studio.ambient.scrim`,.4),cameraSide:O(e,`studio.ambient.cameraSide`,.004),cameraTexture:O(e,`studio.ambient.cameraTexture`,1),backdrop:O(e,`studio.ambient.backdrop`,1),rotationDeg:O(e,`studio.ambient.rotation`,0)},flash:{sizeMm:O(e,`studio.flash.size`,8.5),distanceM:O(e,`studio.flash.distance`,.3),radiance:Math.max(O(e,`studio.flash.radiance`,1500),0),spd:A(e,`studio.flash.spd`,T,`equal`)}}}function _e(e){return{background:A(e,`scene.background`,[`black`,`white`,`colour`],`white`),bgColor:pe(e,`scene.bgColor`,`#3a4458`),studio:ge(e),display:{ev:O(e,`display.ev`,.5),tone:A(e,`display.tone`,[`neutral`,`agx`,`clamp`],`neutral`),glare:Math.max(O(e,`display.glare`,.03),0),glareRadiusPx:Math.max(O(e,`display.glareRadius`,8),.5)},lensMm:j(O(e,`dof.lens`,62),24,200),grain:{on:k(e,`grain.on`,!0),amount:j(O(e,`grain.amount`,.07),0,.6),sizePx:j(O(e,`grain.size`,1),1,4),animated:k(e,`grain.animated`,!0),colour:A(e,`grain.colour`,[`mono`,`rgb`],`mono`),onBackground:k(e,`grain.onBackground`,!1)},card:{bowMm:O(e,`card.bow`,1.6),bowAxis:A(e,`card.bowAxis`,[`across`,`along`],`across`),emboss:A(e,`card.emboss`,[`none`,`lines`,`crosshatch`],`crosshatch`),embossPitchMm:Math.max(O(e,`card.embossPitch`,1.17),.01),embossHeightUm:Math.max(O(e,`card.embossHeight`,.5),0),embossLayer:A(e,`card.embossLayer`,[`foil`,`varnish`],`varnish`),wear:j(O(e,`card.wear`,.16),0,1)},motion:{pointer:A(e,`motion.pointer`,[`tilt`,`light`,`flash`,`none`],`tilt`),tiltRangeDeg:O(e,`motion.tiltRange`,25),wobble:k(e,`motion.wobble`,!0),wobbleAmpDeg:O(e,`motion.wobbleAmp`,14)}}}function ve(e){let t=/^#?([0-9a-f]{6})$/i.exec(e.trim()),n=t?Number.parseInt(t[1],16):0,r=e=>{let t=e/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4};return[r(n>>16&255),r(n>>8&255),r(n&255)]}function ye(e,t){if(e!==`colour`)return+(e===`white`);let[n,r,i]=ve(t);return j(.2126*n+.7152*r+.0722*i,0,1)}function be(e,t){return 2**(e-.2*j(t,0,1))}var xe,Se,Ce,we;function Te(){return(Te=e((()=>{x(),C(),te(),re(),ae(),E(),xe=new Map(ne.map(e=>[e.id,e])),Se=e=>!!e&&typeof e==`object`&&Object.getPrototypeOf(e)===Object.prototype&&typeof e.x==`number`&&typeof e.y==`number`,Ce=new Set,we=new Set([`prism`,`shatter`,`nebula`,`sparkle`,`vortex`,`emboss`])})))()}var Ee;function De(){return(De=e((()=>{Ee=`uniform float uCoatAlpha;
float D_GGX(float NoH, float a) {
  float a2 = a * a, d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * max(d * d, 1e-20));
}
float V_SmithGGXCorrelated(float NoL, float NoV, float a) {
  float a2 = a * a;
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2), gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / max(gv + gl, 1e-6);
}
vec3 coatDirect(GLight g, vec3 X, vec3 V, vec3 Nc, float alpha, float gloss, float sig2) {
  if (g.A <= 0.0) return vec3(0.0);
  float a = sqrt(max(alpha * alpha + sig2, 1e-6));
#if RECT_LTC
  if (g.type == 2) return gloss * g.rad * g.rgb * ltcGGX(Nc, V, X, a, 0.04, g.c);
#endif
  float ci = dot(Nc, g.L), co = dot(Nc, V);
  if (ci <= 0.0 || co <= 0.0) return vec3(0.0);
  vec3 H = normalize(g.L + V);
  a = sqrt(a * a + 0.25 * g.rAng * g.rAng);
  return gloss * g.rad * g.A * g.rgb * D_GGX(max(dot(Nc, H), 0.0), a) * V_SmithGGXCorrelated(ci, co, a)
       * fresnelDiel(dot(H, g.L), 1.5);
}
float coatT(vec3 Nc, vec3 L, vec3 V) {
  return (1.0 - fresnelDiel(max(dot(Nc, L), 0.0), 1.5)) * (1.0 - fresnelDiel(max(dot(Nc, V), 0.0), 1.5));
}
`})))()}var Oe;function ke(){return(ke=e((()=>{Oe=`#ifndef NSPD
#define NSPD 5
#endif
#ifndef MAX_LIGHTS
#define MAX_LIGHTS 4
#endif
#ifndef DEBUG_VIEW
#define DEBUG_VIEW 0
#endif
#ifndef RECT_EXACT
#define RECT_EXACT 0
#endif
#ifndef RECT_LTC
#define RECT_LTC 0
#endif
#ifndef NB
#define NB 0
#endif
#ifndef IBL_ORDERS
#define IBL_ORDERS 0
#endif
#ifndef DISCRETE_LIGHTS
#define DISCRETE_LIGHTS 2
#endif
#ifndef DISCRETE_LIGHTS_B
#define DISCRETE_LIGHTS_B 1
#endif
#ifndef FLAKE_ENV
#define FLAKE_ENV 0
#endif
#ifndef WEAR_CELLS
#define WEAR_CELLS 2
#endif
#define saturate(a) clamp(a, 0.0, 1.0)
const float PI  = 3.14159265359;
const float TAU = 6.28318530718;
uniform int uMaxOrder, uGhB, uVorR, uFlakeR, uBCells, uBBins, uBLevels;
#define HOLO_NOUNROLL(n) ((n) + min(uMaxOrder, 0))
float sq(float x) { return x * x; }
float max3(vec3 c) { return max(max(c.x, c.y), c.z); }
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
vec3 rnd3(ivec2 c, uint salt) {
  return vec3(pcg3d(uvec3(uvec2(c + ivec2(1 << 20)), salt)) >> 8u) * (1.0 / 16777216.0);
}
vec2 gauss2(vec2 u) { float r = sqrt(-2.0 * log(max(u.x, 1e-7))); return r * vec2(cos(TAU * u.y), sin(TAU * u.y)); }
float erfA(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(max(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)), 0.0));
}
float gaussPdf(float u) { return 0.39894228 * exp(-0.5 * u * u); }
float gaussCdf(float u) {
  float z = abs(u) * 0.70710678;
  float t = 1.0 / (1.0 + 0.3275911 * z);
  float y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
          * exp(-z * z);
  return u >= 0.0 ? 1.0 - 0.5 * y : 0.5 * y;
}
float gauss1(float x, float s) { s = max(s, 1e-12); return exp(-0.5 * x * x / (s * s)) * (0.39894228 / s); }
float besselJ(int m, float x) {
  float h = 0.5 * x, term = 1.0;
  for (int i = 1; i <= 8; ++i) if (i <= m) term *= h / float(i);
  float s = term, h2 = h * h;
  for (int k = 1; k < 8; ++k) { term *= -h2 / float(k * (k + m)); s += term; }
  return s;
}
float i0e(float k) {
  k = abs(k);
  if (k < 3.75) {
    float t = k / 3.75; t *= t;
    return exp(-k) * (1.0 + t * (3.5156229 + t * (3.0899424 + t * (1.2067492 + t * (0.2659732 + t * (0.0360768 + t * 0.0045813))))));
  }
  float u = 3.75 / k;
  return (0.39894228 + u * (0.01328592 + u * (0.00225319 + u * (-0.00157565 + u * (0.00916281 + u * (-0.02057706
         + u * (0.02635537 + u * (-0.01647633 + u * 0.00392377)))))))) / sqrt(k);
}
float cosInside(float cAir, float nc) { return sqrt(max(1.0 - (1.0 - cAir * cAir) / (nc * nc), 0.0)); }
float fresnelDiel(float cAir, float nc) {
  float ci = clamp(cAir, 0.0, 1.0), ct = cosInside(ci, nc);
  float rs = (ci - nc * ct) / max(ci + nc * ct, 1e-12), rp = (nc * ci - ct) / max(nc * ci + ct, 1e-12);
  return 0.5 * (rs * rs + rp * rp);
}
vec3 refractIn(vec3 D, vec3 N, float nc) {
  vec3 Dt = D - N * dot(D, N);
  return Dt / nc + N * sqrt(max(1.0 - dot(Dt, Dt) / (nc * nc), 0.0));
}
vec3 refractOut(vec3 Dp, vec3 N, float nc) {
  float c = dot(Dp, N);
  vec3 Dt = (Dp - N * c) * nc;
  float k = 1.0 - dot(Dt, Dt);
  return (k <= 0.0 || c <= 0.0) ? vec3(0.0) : Dt + N * sqrt(k);
}
mat2 psd2(mat2 S, float eps) {
  float a = S[0][0], c = S[1][1], b = 0.5 * (S[0][1] + S[1][0]);
  float m = 0.5 * (a + c), d = 0.5 * (a - c), r = sqrt(d * d + b * b);
  float l1 = m + r, l2 = m - r;
  if (l2 >= eps) return mat2(a, b, b, c);
  if (r <= 1e-6 * abs(m) + 1e-30) return mat2(max(m, eps));
  vec2 e = d >= 0.0 ? vec2(d + r, b) : vec2(b, r - d);
  e /= length(e);
  vec2 f = vec2(-e.y, e.x);
  return max(l1, eps) * outerProduct(e, e) + max(l2, eps) * outerProduct(f, f);
}
vec3 sanitize(vec3 c) {
  uvec3 b = floatBitsToUint(c) & 0x7fffffffu;
  return mix(c, vec3(0.0), greaterThanEqual(b, uvec3(0x7f800000u)));
}
const float ENC_S = 0.25;
#ifdef CARD_PROGRAM
varying float vOcc;
#define HOLO_OCC_K (1.0 - vOcc)
#else
#define HOLO_OCC_K 1.0
#endif
vec4 encodeCard(vec3 c) {
  c = clamp(sanitize(c), vec3(-6.0e4), vec3(6.0e4)) * HOLO_OCC_K;
  float m = max(max3(c), 0.0) * ENC_S;
  return vec4(c * ENC_S / (1.0 + m), 1.0);
}
const vec3 LUMA_SRGB = vec3(0.2126, 0.7152, 0.0722);
const vec3 LUMA_P3   = vec3(0.2290, 0.6917, 0.0793);
vec3 gamutMapLuma(vec3 c, vec3 lumaW) {
  float Y = dot(c, lumaW), mn = min(c.r, min(c.g, c.b));
  if (Y <= 0.0) return vec3(0.0);
  if (mn >= 0.0) return c;
  vec3 e = max(-c, vec3(0.0));
  vec3 e15 = e * sqrt(e);
  float S = Y + pow(e15.r + e15.g + e15.b, 2.0 / 3.0);
  return Y + (c - Y) * (Y / S);
}
`})))()}var Ae;function je(){return(je=e((()=>{Ae=`struct Elem {
  vec3  n;
  vec3  g;
  float invD;
  float hNm;
  float nc;
  float sigS;
  float tauF;
  float fanQ;
  float sigTheta;
  float sigFrel;
  float iso2;
  float w;
  float fam;
};
vec4 etaOrdFor(int light, float fam) {
  int li = clamp(light, 0, MAX_LIGHTS - 1);
  float fc = clamp(fam, 0.0, 2.0);
  int f0 = int(floor(fc)), f1 = min(f0 + 1, 2);
  return mix(uEtaOrd[3 * li + f0], uEtaOrd[3 * li + f1], fc - float(f0));
}
float orderEff(int m, float lam, float hNm, float nc, float ciIn, float coIn) {
#ifdef HOLO_FIXTURE_ETA
  return float(HOLO_FIXTURE_ETA);
#else
  float x = min(PI * nc * hNm * (ciIn + coIn) / max(lam, 1.0), 5.5);
  float j = besselJ(abs(m), x);
  return j * j;
#endif
}
vec2 besselJPair(int m, float x) {
  float h = 0.5 * x, t = 1.0;
  for (int i = 1; i <= 8; ++i) if (i < m) t *= h / float(i);
  float jm1 = 0.0, jm = 0.0, h2 = h * h, fm = float(m);
  for (int k = 0; k < 8; ++k) {
    jm1 += t; jm += t * h / (float(k) + fm);
    t *= -h2 / ((float(k) + 1.0) * (float(k) + fm));
  }
  return vec2(jm, jm1);
}
float orderEffD(int m, float lam, float hNm, float nc, float ciIn, float coIn, out float dlnEta) {
#ifdef HOLO_FIXTURE_ETA
  dlnEta = 0.0;
  return float(HOLO_FIXTURE_ETA);
#else
  float l = max(lam, 1.0), xr = PI * nc * hNm * (ciIn + coIn) / l, x = min(xr, 5.5);
  vec2 j = besselJPair(max(m, 1), x);
  dlnEta = (xr < 5.5 && abs(j.x) > 1e-3) ? 2.0 * (float(m) - x * j.y / j.x) / l : 0.0;
  return j.x * j.x;
#endif
}
float etaSlope(vec4 e, float lam) {
#ifdef HOLO_FIXTURE_ETAN
  return 0.0;
#else
  float x = (lam - 430.0) / 80.0;
  if (x <= 0.0 || x >= 3.0) return 0.0;
  return x < 1.0 ? (e.y - e.x) / 80.0 : x < 2.0 ? (e.z - e.y) / 80.0 : (e.w - e.z) / 80.0;
#endif
}
vec3 lobeColour(int m, float lam, float sigL, float hNm, float nc, float ciIn, float coIn, vec4 eta, int spd) {
  float dEta, eff = orderEffD(m, lam, hNm, nc, ciIn, coIn, dEta);
  float en = etaAt(eta, lam);
  float a = dEta + etaSlope(eta, lam) / max(en, 1e-6);
  float sh = clamp(a * sigL * sigL, -0.5 * sigL, 0.5 * sigL);
  return eff * en * exp(0.5 * sq(sh / sigL)) * cmfConv(lam + sh, sigL, spd);
}
vec4 mirrorF1(float hNm, float nc, float ciIn, float coIn, vec4 etaM) {
  vec4 f;
  for (int k = 0; k < 4; ++k) {
    float j0 = besselJ(0, min(PI * nc * hNm * (ciIn + coIn) / SPEC_NODES[k], 5.5));
    f[k] = etaM[k] * j0 * j0;
  }
  return f;
}
vec3 elemOrders(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec4 eta) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || e.w <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3  t  = cross(e.n, e.g);
  vec3  H  = e.nc * (Lp + Vp);
  float qg = dot(H, e.g), qt = dot(H, t), sn = dot(H, e.n);
  mat2  R  = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * (ScCard + g.S) * transpose(R);
  float rho  = length(vec2(qg, qt));
  float iso2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
  float sgg  = max(Sx[0][0] + iso2 + sq(rho * e.sigFrel), 1e-10);
  float stt0 = Sx[1][1] + iso2 + sq(rho * e.sigTheta);
  float sgt  = Sx[0][1];
  float d    = 1.0 / max(e.invD, 1e-6);
  vec3 acc = vec3(0.0);
  for (int m = 1; m <= uMaxOrder; ++m) {
    float stt = max(stt0 + float(m) * sq(e.fanQ), 1e-10);
    float qgc = qg - (sgt / stt) * qt;
    float sgc = sqrt(max(sgg - sgt * sgt / stt, 1e-10));
    float lam = d * abs(qgc) / float(m), sigL = clamp(d * sgc / float(m), 0.5, 512.0);
    if (lam + 3.0 * sigL < 360.0 || lam - 3.0 * sigL > 830.0) continue;
    float n1 = exp(-0.5 * qt * qt / stt) * inversesqrt(TAU * stt);
    acc += n1 * (d / float(m)) * lobeColour(m, lam, sigL, e.hNm, e.nc, ciIn, coIn, eta, g.spd);
  }
  return g.rad * g.A * Tc * e.w * acc;
}
vec3 elemMirror(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec3 mirRgb) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g), H = e.nc * (Lp + Vp);
  vec2  q = vec2(dot(H, e.g), dot(H, t));
  float sn = dot(H, e.n);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  S = psd2(R * (ScCard + g.S) * transpose(R) + mat2(sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2), 1e-10);
  float det = max(S[0][0] * S[1][1] - S[0][1] * S[0][1], 1e-14);
  float e0  = max((S[1][1] * q.x * q.x - 2.0 * S[0][1] * q.x * q.y + S[0][0] * q.y * q.y) / det, 0.0);
  return g.rad * g.A * Tc * exp(-0.5 * e0) / (TAU * sqrt(det)) * mirRgb;
}
#if RECT_LTC
vec3 elemMirrorRect(GLight g, vec3 X, vec3 V, Elem e, mat2 ScCard, vec3 Tf, vec3 Bf, vec3 Nf, float kTilt, float Tc, vec3 mirRgb) {
  if (g.A <= 0.0) return vec3(0.0);
  vec2  s   = -vec2(dot(e.n, Tf), dot(e.n, Bf)) / max(dot(e.n, Nf), 1e-3);
  vec3  nEq = normalize(Nf - kTilt * (s.x * Tf + s.y * Bf));
  float co  = max(dot(nEq, V), 1e-3), coIn = cosInside(co, e.nc);
  float sp  = e.nc * 2.0 * coIn;
  float sq2 = sq(sp * e.sigS) + sq(sp * e.tauF) + e.iso2 + 0.5 * (ScCard[0][0] + ScCard[1][1]);
  float a0  = clamp(0.70710678 * sqrt(sq2) / co, 0.002, 1.0);
  return g.rad * Tc * mirRgb * ltcGGX(nEq, V, X, a0, 1.0, g.c);
}
#endif
#if RECT_EXACT
vec3 elemOrdersRect(GLight g, vec3 V, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec4 eta) {
  float co = dot(e.n, V);
  if (co <= 0.0 || e.w <= 0.0 || g.nP < 3 || g.A <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  vec2  v = vec2(dot(V, e.g), dot(V, t)), cen = R * g.C;
  vec2  P[5]; vec2 lo2 = vec2(1e9), hi2 = vec2(-1e9); float area2 = 0.0;
  for (int k = 0; k < 5; ++k) P[k] = vec2(0.0);
  for (int k = 0; k < 5; ++k) { if (k >= g.nP) break; P[k] = R * g.P[k]; lo2 = min(lo2, P[k]); hi2 = max(hi2, P[k]); }
  for (int k = 0; k < 5; ++k) { if (k >= g.nP) break; vec2 a = P[k], b = P[k + 1 < g.nP ? k + 1 : 0]; area2 += a.x * b.y - b.x * a.y; }
  float orient = area2 >= 0.0 ? 1.0 : -1.0;
  float wChord = smoothstep(0.25, 0.6, 0.5 * abs(area2) / g.A);
  vec3 acc = vec3(0.0);
  if (wChord > 0.0) {
    float ciIn = cosInside(max(dot(e.n, g.L), 1e-3), e.nc), coIn = cosInside(co, e.nc);
    mat2  Sx = R * ScCard * transpose(R);
    float rho  = length(v + cen);
    float iso2 = sq(e.nc * (ciIn + coIn) * e.sigS) + e.iso2;
    float sg   = sqrt(max(Sx[0][0] + iso2 + sq(rho * e.sigFrel), 0.0));
    float st0  = Sx[1][1] + iso2 + sq(rho * e.sigTheta);
    float t0 = -v.y, d = 1.0 / max(e.invD, 1e-6);
    for (int m = 1; m <= uMaxOrder; ++m) {
      float st = sqrt(max(st0 + float(m) * sq(e.fanQ), 1e-8)), sigL = clamp(d * sg / float(m), 0.5, 512.0);
      for (int s = -1; s <= 1; s += 2) {
        float k = float(s * m) * e.invD;
        float la = (lo2.x + v.x) / k, lb = (hi2.x + v.x) / k;
        if (max(la, lb) < CMF_L0 || min(la, lb) > CMF_L0 + CMF_SPAN) continue;
        float lc = clamp((cen.x + v.x) / k, 380.0, 780.0);
        vec3 sum = vec3(0.0);
        for (int j = 0; j < 5; ++j) {
          if (j >= g.nP) break;
          vec2 a = P[j], b = P[j + 1 < g.nP ? j + 1 : 0];
          float dt = b.y - a.y;
          if (abs(dt) < 1e-7) continue;
          float ua = (min(a.y, b.y) - t0) / st, ub = (max(a.y, b.y) - t0) / st;
          float Pe = gaussCdf(ub) - gaussCdf(ua);
          if (Pe < 1e-6) continue;
          float pa = gaussPdf(ua), pb = gaussPdf(ub);
          float mu  = st * (pa - pb) / Pe;
          float var = st * st * max(1.0 + (ua * pa - ub * pb) / Pe - sq((pa - pb) / Pe), 0.0);
          float dgdt = (b.x - a.x) / dt;
          float lam = (a.x + (t0 + mu - a.y) * dgdt + v.x) / k;
          float sc  = clamp(sqrt(sigL * sigL + sq(dgdt / k) * var), 0.5, 512.0);
          sum += orient * sign(dt) * float(s) * Pe * cmfCumExt(lam, sc, g.spd);
        }
        acc += orderEff(m, lc, e.hNm, e.nc, ciIn, coIn) * etaAt(eta, lc) * sum;
      }
    }
    acc *= g.rad * Tc * e.w;
  }
  if (wChord < 1.0) {
    vec3 Lp = refractIn(g.L, e.n, e.nc), Vp = refractIn(V, e.n, e.nc);
    acc = mix(elemOrders(g, Lp, Vp, e, ScCard, T, B, Tc, eta), acc, wChord);
  }
  return acc;
}
#endif
vec3 ringKernel(GLight g, vec3 Lp, vec3 Vp, vec3 N, vec3 T, vec3 B, float invDm, float sigFrel, float sigQ,
                float hNm, float nc, float tiltRMS, float Tc, vec4 eta) {
  float ciIn = dot(N, Lp), coIn = dot(N, Vp); if (ciIn <= 0.0 || coIn <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3 H = nc * (Lp + Vp); vec2 q = vec2(dot(H, T), dot(H, B));
  float sT  = dot(H, N) * tiltRMS;
  float rho = max(sqrt(dot(q, q) + 2.0 * sT * sT), 1e-4);
  float sr  = sqrt(sigQ * sigQ + sT * sT + 0.5 * (g.S[0][0] + g.S[1][1]) + sq(rho * sigFrel));
  float d = 1.0 / max(invDm, 1e-6);
  vec3 acc = vec3(0.0);
  for (int k = 1; k <= uMaxOrder; ++k) {
    float lam = d * rho / float(k), sigL = clamp(d * sr / float(k), 0.5, 512.0);
    if (lam + 3.0 * sigL < 360.0 || lam - 3.0 * sigL > 830.0) continue;
    acc += (d / (PI * float(k) * rho)) * lobeColour(k, lam, sigL, hNm, nc, ciIn, coIn, eta, g.spd);
  }
  return g.rad * g.A * Tc * acc;
}
vec3 mirrorMeanField(GLight g, vec3 Lp, vec3 Vp, vec3 N, vec3 T, vec3 B, float nc, float sigQ, float tiltRMS, float Tc, vec3 mirRgb) {
  if (g.A <= 0.0) return vec3(0.0);
  vec3 H = nc * (Lp + Vp); vec2 q = vec2(dot(H, T), dot(H, B));
  float s2 = max(sigQ * sigQ + sq(dot(H, N) * tiltRMS) + 0.5 * (g.S[0][0] + g.S[1][1]), 1e-10);
  return g.rad * g.A * Tc * exp(-0.5 * dot(q, q) / s2) / (TAU * s2) * mirRgb;
}
#if DEBUG_VIEW == 13
vec3 elemOrdersRef(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec4 eta) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || e.w <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g), H = e.nc * (Lp + Vp);
  vec2  q = vec2(dot(H, e.g), dot(H, t));
  float sn = dot(H, e.n);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * (ScCard + g.S) * transpose(R);
  float rho = length(q), iso2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
  const float DL = 6.25;
  vec3 acc = vec3(0.0);
  for (int m = 1; m <= 3; ++m) {
    mat2 S = psd2(Sx + mat2(iso2 + sq(rho * e.sigFrel), 0.0, 0.0, iso2 + sq(rho * e.sigTheta) + float(m) * sq(e.fanQ)), 1e-10);
    float det = max(S[0][0] * S[1][1] - S[0][1] * S[0][1], 1e-14), nrm = 1.0 / (TAU * sqrt(det));
    for (int s = -1; s <= 1; s += 2) {
      for (int k = 0; k < HOLO_NOUNROLL(64); ++k) {
        float lam = 380.0 + (float(k) + 0.5) * DL;
        vec2  dq = q - vec2(float(s * m) * lam * e.invD, 0.0);
        float e0 = (S[1][1] * dq.x * dq.x - 2.0 * S[0][1] * dq.x * dq.y + S[0][0] * dq.y * dq.y) / det;
        if (e0 > 80.0) continue;
        vec3 wk = cmfCum(lam + 0.5 * DL, 0.5, g.spd) - cmfCum(lam - 0.5 * DL, 0.5, g.spd);
        acc += orderEff(m, lam, e.hNm, e.nc, ciIn, coIn) * etaAt(eta, lam) * exp(-0.5 * e0) * nrm * wk;
      }
    }
  }
  return g.rad * g.A * Tc * e.w * acc;
}
#endif
`})))()}var Me;function Ne(){return(Ne=e((()=>{Me=`uniform samplerCube uEnv; uniform float uEnvMaxLod; uniform mat3 uEnvRot; uniform float uEnvIntensity; uniform int uEnvUniform;
#if NB > 0
uniform float uBinLam[NB];
uniform mat3  uBinW[NB];
uniform float uBinWidth;
#endif
vec3 envRadiance(vec3 dirW, float r) {
  if (uEnvUniform == 1) return vec3(1.0);
  r = clamp(r, 0.045, 1.0);
  return textureLod(uEnv, uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r)).rgb * uEnvIntensity;
}
vec3  envIrradiance(vec3 N) { return PI * envRadiance(N, 1.0); }
float sigmaToRough(float sigDir) { return sqrt(max(sigDir, 0.0) * 0.70710678); }
vec2 dfgApprox(float NoV, float rough) {
  const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough * c0 + c1;
  float a004 = min(r.x * r.x, exp2(-9.28 * saturate(NoV))) * r.x + r.y;
  return vec2(-1.04, 1.04) * a004 + r.zw;
}
vec3 coatEnv(vec3 V, vec3 Nc, float alpha, float gloss) {
  float NoV = max(dot(Nc, V), 0.0), rough = sqrt(clamp(alpha, 0.0, 1.0));
  vec2 ab = dfgApprox(NoV, rough);
  return gloss * envRadiance(reflect(-V, Nc), rough) * (0.04 * ab.x + ab.y);
}
vec3 envMirror(vec3 V, vec3 Vp, Elem e, vec3 Nf, mat2 ScCard, vec3 mirRgbEnv) {
  float co = dot(Nf, V), coIn = dot(e.n, Vp);
  if (co <= 0.0 || coIn <= 0.0) return vec3(0.0);
  vec3 R = refractOut(reflect(-Vp, e.n), Nf, e.nc);
  float cr = dot(R, Nf);
  if (cr <= 0.0) return vec3(0.0);
  float sn = 2.0 * e.nc * coIn;
  float sig = sqrt(sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2 + 0.5 * (ScCard[0][0] + ScCard[1][1]));
  float sDir = sig / max(co, 0.05);
  float Tc = (1.0 - fresnelDiel(co, 1.5)) * (1.0 - fresnelDiel(cr, 1.5));
  return Tc * mirRgbEnv * envRadiance(R, sigmaToRough(sDir));
}
#if NB > 0
vec3 envDiffraction(vec3 V, Elem e, mat2 ScCard, vec3 T, vec3 B) {
  vec3 Nf = normalize(cross(T, B));
  float co = dot(Nf, V);
  if (co <= 0.0 || e.w <= 0.0) return vec3(0.0);
  vec3  Vp = refractIn(V, Nf, e.nc);
  float coIn = dot(e.n, Vp);
  if (coIn <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g);
  float To = 1.0 - fresnelDiel(co, 1.5);
  vec2  vp = e.nc * vec2(dot(Vp, e.g), dot(Vp, t));
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * ScCard * transpose(R);
  vec3  acc = vec3(0.0);
  for (int k = 1; k <= IBL_ORDERS; ++k) for (int s = -1; s <= 1; s += 2) for (int j = 0; j < HOLO_NOUNROLL(NB); ++j) {
    float lam = uBinLam[j];
    vec2  lt  = (vec2(float(s * k) * lam * e.invD, 0.0) - vp) / e.nc;
    float r2  = dot(lt, lt);
    if (r2 >= 1.0) continue;
    float ciIn = sqrt(1.0 - r2);
    vec3  L = refractOut(lt.x * e.g + lt.y * t + ciIn * e.n, Nf, e.nc);
    float ci = dot(L, Nf);
    if (ci <= 0.0) continue;
    float sn = e.nc * (ciIn + coIn);
    float base2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
    float rq = float(k) * lam * e.invD;
    float sg = sqrt(base2 + Sx[0][0] + sq(rq * e.sigFrel));
    float st = sqrt(base2 + Sx[1][1] + sq(rq * e.sigTheta) + float(k) * sq(e.fanQ));
    float sDir = max(sqrt(sg * st), 0.5 * float(k) * uBinWidth * e.invD) / sqrt(ci);
    vec3  Le = envRadiance(L, sigmaToRough(sDir));
    float Tc = (1.0 - fresnelDiel(ci, 1.5)) * To;
    acc += Tc * orderEff(k, lam, e.hNm, e.nc, ciIn, coIn) * etaAt(uEtaEnv, lam) * (uBinW[j] * Le);
  }
  return e.w * acc;
}
#endif
`})))()}var Pe;function Fe(){return(Fe=e((()=>{Pe=`uniform int   uLightType[MAX_LIGHTS];
uniform int   uLightOrder[MAX_LIGHTS];
uniform vec3  uLightPos[MAX_LIGHTS];
uniform vec3  uPrevLightPos[MAX_LIGHTS];
uniform vec3  uLightU[MAX_LIGHTS];
uniform vec3  uLightW[MAX_LIGHTS];
uniform float uLightRadius[MAX_LIGHTS];
uniform float uLightRad[MAX_LIGHTS];
uniform int   uLightSpd[MAX_LIGHTS];
uniform vec3  uLightRGB[MAX_LIGHTS];
uniform vec4  uEtaOrd[3 * MAX_LIGHTS];
uniform vec4  uEtaMir[MAX_LIGHTS];
uniform vec4  uEtaEnv;
uniform int   uKeyLight;
struct GLight {
  int   type;
  int   spd;
  float rad;
  float A;
  float rAng;
  vec3  L;
  vec3  rgb;
  mat2  S;
  vec2  C;
  vec3  c[4];
  vec2  P[5];
  int   nP;
};
GLight lightSummary(int i, vec3 X, vec3 V, vec3 T, vec3 B, vec3 N) {
  GLight g;
  int s = clamp(i, 0, MAX_LIGHTS - 1);
  g.type = (i == s) ? uLightType[s] : 0;
  g.spd = clamp(uLightSpd[s], 0, NSPD - 1);
  g.rad = uLightRad[s]; g.rgb = uLightRGB[s];
  g.A = 0.0; g.rAng = 0.0; g.L = N; g.S = mat2(1e-8); g.C = vec2(0.0); g.nP = 0;
  for (int k = 0; k < 4; ++k) g.c[k] = vec3(0.0);
  for (int k = 0; k < 5; ++k) g.P[k] = vec2(0.0);
  if (g.type == 1) {
    vec3 dP = uLightPos[s] - X; float dist = max(length(dP), 1e-6);
    g.L = dP / dist;
    float sa = clamp(uLightRadius[s] / dist, 1e-5, 0.999);
    g.rAng = asin(sa);
    vec2 lc = vec2(dot(g.L, T), dot(g.L, B));
    float cc = max(dot(g.L, N), 0.0), r = length(lc);
    vec2 er = r > 1e-5 ? lc / r : vec2(1.0, 0.0), ep = vec2(-er.y, er.x);
    float ar = max(sa * cc, 1e-5), ap = sa;
    g.A = PI * ar * ap;
    g.S = 0.5 * ar * ar * outerProduct(er, er) + 0.5 * ap * ap * outerProduct(ep, ep);
    g.C = lc;
    if (cc <= 0.0) g.A = 0.0;
  } else if (g.type == 2) {
    vec3 P0 = uLightPos[s], U = uLightU[s], W = uLightW[s];
    g.c[0] = P0 + U + W; g.c[1] = P0 + U - W; g.c[2] = P0 - U - W; g.c[3] = P0 - U + W;
    vec3 Q[5]; int nQ = 0;
    for (int k = 0; k < 5; ++k) Q[k] = vec3(0.0);
    for (int k = 0; k < 4; ++k) {
      vec3 a = g.c[k] - X, b = g.c[(k + 1) & 3] - X;
      float da = dot(N, a) - 1e-4 * length(a), db = dot(N, b) - 1e-4 * length(b);
      if (da >= 0.0) { Q[nQ] = a; nQ++; }
      if ((da >= 0.0) != (db >= 0.0)) { Q[nQ] = a + (b - a) * (da / (da - db)); nQ++; }
    }
    g.nP = nQ; g.rAng = 0.0;
    if (nQ < 3) { g.A = 0.0; return g; }
    for (int k = 0; k < 5; ++k) {
      if (k >= nQ) break;
      vec3 u = Q[k] * inversesqrt(max(dot(Q[k], Q[k]), 1e-30));
      g.P[k] = vec2(dot(u, T), dot(u, B));
    }
    vec2 o = g.P[0]; float A2 = 0.0, Ixx = 0.0, Iyy = 0.0, Ixy = 0.0; vec2 Cn = vec2(0.0);
    for (int k = 1; k < 4; ++k) {
      if (k + 1 >= nQ) break;
      vec2 a = g.P[k] - o, b = g.P[k + 1] - o; float cr = a.x * b.y - b.x * a.y;
      A2 += cr; Cn += (a + b) * cr;
      Ixx += (a.x * a.x + a.x * b.x + b.x * b.x) * cr;
      Iyy += (a.y * a.y + a.y * b.y + b.y * b.y) * cr;
      Ixy += (a.x * b.y + 2.0 * a.x * a.y + 2.0 * b.x * b.y + b.x * a.y) * cr;
    }
    vec3 ln = cross(g.c[1] - g.c[0], g.c[3] - g.c[0]);
    vec3 F = vec3(0.0);
    for (int k = 0; k < 5; ++k) {
      if (k >= nQ) break;
      vec3 a = Q[k], b = Q[k + 1 < nQ ? k + 1 : 0];
      F += ltcEdgeVFF(a * inversesqrt(max(dot(a, a), 1e-30)), b * inversesqrt(max(dot(b, b), 1e-30)));
    }
    g.A = dot(ln, X - g.c[0]) < 0.0 ? 0.0 : PI * max(-dot(F, N), 0.0);
    if (g.A <= 0.0) return g;
    float wChord = abs(A2) < 1e-9 ? 0.0 : smoothstep(0.25, 0.6, 0.5 * abs(A2) / g.A);
    if (wChord > 0.0) {
      vec2 Cl = Cn / (3.0 * A2);
      mat2 E2 = mat2(Ixx / 6.0, Ixy / 12.0, Ixy / 12.0, Iyy / 6.0) / A2;
      g.S = psd2(2.0 * (E2 - outerProduct(Cl, Cl)), 1e-8);
      g.C = o + Cl;
    }
    if (wChord < 1.0) {
      vec3 Ld = normalize(-F);
      vec2 Cr = vec2(dot(Ld, T), dot(Ld, B));
      mat2 Vs = mat2(0.0);
      for (int k = 0; k < 5; ++k) { if (k >= nQ) break; vec2 dv = g.P[k] - Cr; Vs += outerProduct(dv, dv); }
      Vs /= float(nQ);
      float va = Vs[0][0], vc = Vs[1][1], vb = Vs[0][1];
      float vm = 0.5 * (va + vc), vd = 0.5 * (va - vc), vr = sqrt(vd * vd + vb * vb);
      vec2 e1 = vr <= 1e-12 ? vec2(1.0, 0.0) : normalize(vd >= 0.0 ? vec2(vd + vr, vb) : vec2(vb, vr - vd));
      vec2 e2 = vec2(-e1.y, e1.x);
      float s1 = max(0.6666667 * (vm + vr), 1e-8), s2 = clamp(sq(g.A / TAU) / s1, 1e-8, s1);
      mat2 Sr = s1 * outerProduct(e1, e1) + s2 * outerProduct(e2, e2);
      g.S = (1.0 - wChord) * Sr + wChord * g.S;
      g.C = mix(Cr, g.C, wChord);
    }
    g.L = normalize(g.C.x * T + g.C.y * B + sqrt(max(1.0 - dot(g.C, g.C), 0.0)) * N);
    g.rAng = sqrt(g.A / (PI * max(dot(N, g.L), 0.05)));
  }
  return g;
}
float keySn(vec3 X, vec3 V, vec3 N) {
  if (uKeyLight < 0 || uKeyLight >= MAX_LIGHTS) return 2.0;
  vec3 dL = uLightPos[uKeyLight] - X;
  vec3 L = dL * inversesqrt(max(dot(dL, dL), 1e-20));
  return max(dot(N, L + V), 0.25);
}
`})))()}var Ie;function Le(){return(Le=e((()=>{Ie=`uniform sampler2D uLtc1, uLtc2;
vec2 ltcUv(const in vec3 N, const in vec3 V, const in float roughness) {
  const float LUT_SIZE = 64.0;
  const float LUT_SCALE = (LUT_SIZE - 1.0) / LUT_SIZE;
  const float LUT_BIAS = 0.5 / LUT_SIZE;
  float dotNV = saturate(dot(N, V));
  vec2 uv = vec2(roughness, sqrt(1.0 - dotNV));
  uv = uv * LUT_SCALE + LUT_BIAS;
  return uv;
}
float ltcClippedSphereFF(const in vec3 f) {
  float l = length(f);
  return max((l * l + f.z) / (l + 1.0), 0.0);
}
vec3 ltcEdgeVFF(const in vec3 v1, const in vec3 v2) {
  float x = dot(v1, v2);
  float y = abs(x);
  float a = 0.8543985 + (0.4965155 + 0.0145206 * y) * y;
  float b = 3.4175940 + (4.1616724 + y) * y;
  float v = a / b;
  float theta_sintheta = (x > 0.0) ? v : 0.5 * inversesqrt(max(1.0 - x * x, 1e-7)) - v;
  return cross(v1, v2) * theta_sintheta;
}
vec3 ltcEvaluate(const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[4]) {
  vec3 v1 = rectCoords[1] - rectCoords[0];
  vec3 v2 = rectCoords[3] - rectCoords[0];
  vec3 lightNormal = cross(v1, v2);
  if (dot(lightNormal, P - rectCoords[0]) < 0.0) return vec3(0.0);
  vec3 T1, T2;
  vec3 Vt = V - N * dot(V, N);
  T1 = dot(Vt, Vt) < 1e-8 ? normalize(cross(N, abs(N.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)))
                          : normalize(Vt);
  T2 = -cross(N, T1);
  mat3 mat = mInv * transpose(mat3(T1, T2, N));
  vec3 coords[4];
  coords[0] = mat * (rectCoords[0] - P);
  coords[1] = mat * (rectCoords[1] - P);
  coords[2] = mat * (rectCoords[2] - P);
  coords[3] = mat * (rectCoords[3] - P);
  coords[0] = normalize(coords[0]);
  coords[1] = normalize(coords[1]);
  coords[2] = normalize(coords[2]);
  coords[3] = normalize(coords[3]);
  vec3 vectorFormFactor = vec3(0.0);
  vectorFormFactor += ltcEdgeVFF(coords[0], coords[1]);
  vectorFormFactor += ltcEdgeVFF(coords[1], coords[2]);
  vectorFormFactor += ltcEdgeVFF(coords[2], coords[3]);
  vectorFormFactor += ltcEdgeVFF(coords[3], coords[0]);
  float result = ltcClippedSphereFF(vectorFormFactor);
  return vec3(result);
}
float ltcFormFactor(vec3 N, vec3 V, vec3 P, vec3 c[4]) { return ltcEvaluate(N, V, P, mat3(1.0), c).x; }
#if RECT_LTC
float ltcGGX(vec3 N, vec3 V, vec3 P, float alpha, float F0, vec3 c[4]) {
  vec2 uv = ltcUv(N, V, sqrt(clamp(alpha, 1e-4, 1.0)));
  vec4 t1 = textureLod(uLtc1, uv, 0.0), t2 = textureLod(uLtc2, uv, 0.0);
  mat3 mInv = mat3(vec3(t1.x, 0.0, t1.y), vec3(0.0, 1.0, 0.0), vec3(t1.z, 0.0, t1.w));
  return (F0 * t2.x + (1.0 - F0) * t2.y) * ltcEvaluate(N, V, P, mInv, c).x;
}
#endif
`})))()}var Re;function ze(){return(ze=e((()=>{Re=`uniform vec2  uCardSizeMm;
uniform float uBowMm;
uniform int   uBowAxis;
uniform vec4  uWave[32];
uniform ivec2 uWaveBoard, uWaveCoat;
uniform int   uBumpMode;
uniform sampler2D uBumpMom, uBumpCross;
uniform vec2  uBumpScale, uBumpK;
uniform vec2  uWrapMm;
const float LATTICE_OPEN_MM = 2048.0;
struct Lattice { mat2 G, Gi; ivec2 ku, kv; int det; bool wrap; };
Lattice latticeOf(mat2 E, float pitch) {
  Lattice L;
  L.G = pitch * E; L.Gi = transpose(E) / pitch;
  L.ku = ivec2(0); L.kv = ivec2(0); L.det = 1; L.wrap = false;
  if (uWrapMm.x <= 0.0 && uWrapMm.y <= 0.0) return L;
  vec2 P = vec2(uWrapMm.x > 0.0 ? uWrapMm.x : LATTICE_OPEN_MM, uWrapMm.y > 0.0 ? uWrapMm.y : LATTICE_OPEN_MM);
  mat2 Et = transpose(E);
  vec2 ku = round(Et * vec2(P.x / pitch, 0.0)), kv = round(Et * vec2(0.0, P.y / pitch));
  ivec2 iu = ivec2(ku), iv = ivec2(kv);
  int det = iu.x * iv.y - iv.x * iu.y;
  if (det == 0) return L;
  mat2 K = mat2(ku, kv);
  L.G = mat2(P.x, 0.0, 0.0, P.y) * inverse(K);
  L.Gi = K * mat2(1.0 / P.x, 0.0, 0.0, 1.0 / P.y);
  L.ku = iu; L.kv = det > 0 ? iv : -iv; L.det = det > 0 ? det : -det; L.wrap = true;
  return L;
}
int floorDivPos(int a, int b) { return a >= 0 ? a / b : -((b - 1 - a) / b); }
ivec2 latticeCell(Lattice L, ivec2 k) {
  if (!L.wrap) return k;
  int zx = floorDivPos(L.kv.y * k.x - L.kv.x * k.y, L.det);
  int zy = floorDivPos(L.ku.x * k.y - L.ku.y * k.x, L.det);
  return k - zx * L.ku - zy * L.kv;
}
vec2 wrapDelta(vec2 d) {
  if (uWrapMm.x > 0.0) d.x -= uWrapMm.x * round(d.x / uWrapMm.x);
  if (uWrapMm.y > 0.0) d.y -= uWrapMm.y * round(d.y / uWrapMm.y);
  return d;
}
vec2 wrapFreq(vec2 f) {
  if (uWrapMm.x > 0.0) f.x = round(f.x * uWrapMm.x) / uWrapMm.x;
  if (uWrapMm.y > 0.0) f.y = round(f.y * uWrapMm.y) / uWrapMm.y;
  return f;
}
struct Footprint { mat2 S; float area, sMaj, sMin; vec2 eMaj; };
const float FOOTPRINT_KA = 16.0;
Footprint footprintOf(vec2 p  ) {
  vec2 dx = dFdx(p), dy = dFdy(p);
  Footprint F;
  mat2 S = 0.15915494 * (outerProduct(dx, dx) + outerProduct(dy, dy));
  F.area = abs(dx.x * dy.y - dx.y * dy.x);
  float a = S[0][0], b = S[0][1], c = S[1][1];
  float m = 0.5 * (a + c), r = sqrt(max(m * m - (a * c - b * b), 0.0));
  float l1 = m + r, l2 = max(m - r, l1 / (FOOTPRINT_KA * FOOTPRINT_KA));
  F.eMaj = abs(b) > 1e-20 ? normalize(vec2(l1 - c, b)) : (a >= c ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  vec2 eMin = vec2(-F.eMaj.y, F.eMaj.x);
  F.S = l1 * outerProduct(F.eMaj, F.eMaj) + l2 * outerProduct(eMin, eMin);
  F.sMaj = sqrt(l1); F.sMin = sqrt(l2);
  return F;
}
float sigmaAlong(Footprint F, vec2 n) { return sqrt(max(dot(n, F.S * n), 1e-14)); }
vec2 bowSlope(vec2 p) {
  vec2 c = p - 0.5 * uCardSizeMm;
  return uBowAxis == 1 ? vec2(0.0, 8.0 * uBowMm * c.y / (uCardSizeMm.y * uCardSizeMm.y))
                       : vec2(8.0 * uBowMm * c.x / (uCardSizeMm.x * uCardSizeMm.x), 0.0);
}
void wavesSlope(ivec2 range, vec2 p, Footprint F, out vec2 slope, out mat2 sig) {
  slope = vec2(0.0); sig = mat2(0.0);
  int n = min(range.y, 32 - clamp(range.x, 0, 32));
  for (int k = 0; k < n; ++k) {
    vec4 w = uWave[range.x + k];
    float G = exp(-19.7392088 * dot(w.xy, F.S * w.xy));
    vec2 gA = TAU * w.z * w.xy;
    float ph = fract(dot(w.xy, p) + w.w);
    slope += G * gA * cos(TAU * ph);
    sig   += 0.5 * (1.0 - G * G) * outerProduct(gA, gA);
  }
}
void bumpSlope(vec2 p, Footprint F, out vec2 s, out mat2 Sg) {
  s = vec2(0.0); Sg = mat2(0.0);
  if (uBumpMode == 0) return;
  vec2 uv = p * uBumpScale;
  vec2 gMaj = (2.50662827 * F.sMaj) * F.eMaj * uBumpScale;
  vec2 gMin = (2.50662827 * F.sMin) * vec2(-F.eMaj.y, F.eMaj.x) * uBumpScale;
  vec4  m   = textureGrad(uBumpMom, uv, gMaj, gMin);
  float mxy = textureGrad(uBumpCross, uv, gMaj, gMin).r;
  float vxx = max(m.z - m.x * m.x, 0.0), vyy = max(m.w - m.y * m.y, 0.0);
  float c = sqrt(vxx * vyy), vxy = clamp(mxy - m.x * m.y, -c, c);
  s = uBumpK * m.xy;
  float kxy = uBumpK.x * uBumpK.y;
  Sg = mat2(vxx * uBumpK.x * uBumpK.x, vxy * kxy, vxy * kxy, vyy * uBumpK.y * uBumpK.y);
}
mat3 frameFromSlope(vec3 T, vec3 B, vec3 N, vec2 s) {
  vec3 n = normalize(N - s.x * T - s.y * B), t = normalize(T - n * dot(T, n));
  return mat3(t, cross(n, t), n);
}
`})))()}var Be;function Ve(){return(Ve=e((()=>{Be=`const float CMF_L0 = 300.0, CMF_SPAN = 1024.0, CMF_ROWS = 41.0;
uniform highp sampler2DArray uCmfConv;
uniform highp sampler2DArray uCmfCum;
uniform mat4 uSpecProj[NSPD];
float cmfRow(float sigL) { return (4.0 * log2(clamp(sigL, 0.5, 512.0) / 0.5) + 0.5) / CMF_ROWS; }
const float CMF_LO = 301.0, CMF_HI = 1323.0;
const vec3  CMF_CENTROID = vec3(600.0, 550.0, 460.0);
vec3 cmfMills(vec3 x) {
  vec3 t = 1.0 / (1.0 + 0.3275911 * 0.70710678 * max(x, 0.0));
  return 1.25331414 * t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
}
vec3 cmfConv(float lam, float sigL, int spd) {
  float s = clamp(sigL, 0.5, 512.0), le = clamp(lam, CMF_LO, CMF_HI);
  vec3 c = textureLod(uCmfConv, vec3((le - CMF_L0) / CMF_SPAN, cmfRow(s), float(spd)), 0.0).rgb;
  if (lam != le) {
    float d = abs(lam - le);
    vec3 A = lam < le ? CMF_CENTROID - CMF_LO : CMF_HI - CMF_CENTROID;
    c *= exp(-d * (d + 2.0 * A) / (2.0 * s * s));
  }
  return c;
}
vec3 cmfCum(float lam, float sigL, int spd) {
  return textureLod(uCmfCum, vec3((lam - CMF_L0) / CMF_SPAN, cmfRow(sigL), float(spd)), 0.0).rgb;
}
vec3 cmfCumExt(float lam, float sigL, int spd) {
  float s = clamp(sigL, 0.5, 512.0);
  if (s <= 24.0) return cmfCum(lam, s, spd);
  float row = cmfRow(s);
  vec3 cLo = textureLod(uCmfConv, vec3((CMF_LO - CMF_L0) / CMF_SPAN, row, float(spd)), 0.0).rgb;
  vec3 A = (CMF_CENTROID - CMF_LO) / s;
  if (lam < CMF_L0) {
    vec3 x2 = (CMF_CENTROID - lam) / s;
    return cLo * s * cmfMills(x2) * exp(-0.5 * (x2 * x2 - A * A));
  }
  vec3 x0 = (CMF_CENTROID - CMF_L0) / s;
  vec3 c = cmfCum(min(lam, CMF_HI), s, spd) + cLo * s * cmfMills(x0) * exp(-0.5 * (x0 * x0 - A * A));
  if (lam > CMF_HI) {
    vec3 cHi = textureLod(uCmfConv, vec3((CMF_HI - CMF_L0) / CMF_SPAN, row, float(spd)), 0.0).rgb;
    vec3 Bq = (CMF_HI - CMF_CENTROID) / s, x2 = (lam - CMF_CENTROID) / s;
    c += cHi * s * (cmfMills(Bq) - cmfMills(x2) * exp(-0.5 * (x2 * x2 - Bq * Bq)));
  }
  return c;
}
const vec4 SPEC_NODES = vec4(430.0, 510.0, 590.0, 670.0);
vec3 specProject(vec4 f, int spd) { return (uSpecProj[spd] * f).rgb; }
float etaAt(vec4 e, float lam) {
#ifdef HOLO_FIXTURE_ETAN
  return float(HOLO_FIXTURE_ETAN);
#else
  float x = clamp((lam - 430.0) / 80.0, 0.0, 3.0);
  vec4 w = max(vec4(0.0), 1.0 - abs(vec4(x) - vec4(0.0, 1.0, 2.0, 3.0)));
  return dot(e, w);
#endif
}
`})))()}var He;function Ue(){return(Ue=e((()=>{He=`uniform float uWear;
struct Wear { float alphaAdd; float gloss; float mottle; float dust; };
const uint WEAR_SEED = 11u;
float wearSmudge(vec2 p) {
  float m = 0.0;
  for (int k = 0; k < 3; ++k) {
    vec3 a = rnd3(ivec2(k, 0), WEAR_SEED ^ 0x53D6E000u);
    vec3 b = rnd3(ivec2(k, 1), WEAR_SEED ^ 0x53D6E000u);
    vec2 c = vec2(6.0, 8.0) + a.xy * (uCardSizeMm - vec2(12.0, 16.0));
    vec2 s = 0.5 * mix(vec2(6.0), vec2(14.0), b.xy);
    vec2 e = vec2(cos(PI * b.z), sin(PI * b.z));
    vec2 d = wrapDelta(p - c);
    vec2 u = vec2(dot(d, e), dot(d, vec2(-e.y, e.x))) / s;
    m = max(m, exp(-0.5 * dot(u, u)));
  }
  return m;
}
float wearMottle(vec2 p, Footprint F) {
  float M = 0.0;
  for (int k = 0; k < 3; ++k) {
    vec3 a = rnd3(ivec2(k, 2), WEAR_SEED ^ 0x0A77E000u);
    float lam = 5.0 * exp2(2.0 * a.x);
    vec2 f = wrapFreq(vec2(cos(PI * a.y), sin(PI * a.y)) / lam);
    float G = exp(-19.7392088 * dot(f, F.S * f));
    M += G * sin(TAU * fract(dot(f, p) + a.z));
  }
  return M / 3.0;
}
float wearDust(vec2 p, Footprint F) {
  const float CELL = 5.0;
  Lattice La = latticeOf(mat2(1.0), CELL);
  ivec2 cell = ivec2(floor(La.Gi * p)), hc = latticeCell(La, cell);
  vec3 h = rnd3(hc, WEAR_SEED ^ 0xD0570000u);
  if (h.z >= 0.3 * uWear) return 0.0;
  vec3 h2 = rnd3(hc, WEAR_SEED ^ 0xD0571000u);
  vec2 c = La.G * (vec2(cell) + 0.15 + 0.7 * h.xy);
  float r = mix(0.015, 0.050, h2.x);
  mat2 S = F.S + mat2(0.25 * r * r);
  float det = max(determinant(S), 1e-20);
  vec2 d = p - c;
  float e = dot(d, inverse(S) * d);
  return min(PI * r * r * exp(-0.5 * e) / (TAU * sqrt(det)), 1.0);
}
Wear wearAt(vec2 p, Footprint F) {
  Wear w;
  w.alphaAdd = 0.0; w.gloss = 1.0; w.mottle = 1.0; w.dust = 0.0;
  if (uWear <= 0.0) return w;
  float m = wearSmudge(p);
  w.alphaAdd = 0.12 * uWear * m;
  w.gloss = 1.0 - 0.15 * uWear * m;
  w.mottle = 1.0 + 0.35 * uWear * wearMottle(p, F);
  w.dust = wearDust(p, F);
  return w;
}
vec3 scratchLobe(GLight g, vec3 V, mat3 fC, vec2 p, Footprint F, mat2 ScCard) {
  if (uWear <= 0.0 || g.type != 1 || g.A <= 0.0) return vec3(0.0);
  vec3 Nc = fC[2], Hs = g.L + V;
  float sn = dot(Hs, Nc);
  if (sn <= 0.0 || dot(Nc, g.L) <= 0.0 || dot(Nc, V) <= 0.0) return vec3(0.0);
  float Fr = fresnelDiel(dot(normalize(Hs), g.L), 1.5);
  const float CELL = 2.0, TAN_TS = 0.57735027;
  float halfW = sn * TAN_TS, edge = 0.05 * sn;
  float base2 = sq(sn * 0.02) + 0.5 * (g.S[0][0] + g.S[1][1]);
  Lattice La = latticeOf(mat2(1.0), CELL);
  vec2 cf = La.Gi * p;
#if WEAR_CELLS >= 3
  const int NC = 3; ivec2 c0 = ivec2(floor(cf)) - 1;
#else
  const int NC = 2; ivec2 c0 = ivec2(floor(cf - 0.5));
#endif
  float acc = 0.0;
  for (int j = 0; j < NC; ++j) for (int i = 0; i < NC; ++i) {
    ivec2 cell = c0 + ivec2(i, j), hc = latticeCell(La, cell);
    for (int k = 0; k < 2; ++k) {
      vec3 h = rnd3(hc, WEAR_SEED ^ (0x5C7A0000u + uint(k)));
      if (h.z >= 0.6 * uWear) continue;
      vec3 h2 = rnd3(hc, WEAR_SEED ^ (0x5C7B0000u + uint(k)));
      vec2 c = La.G * (vec2(cell) + h.xy);
      vec2 dir = vec2(cos(PI * h2.x), sin(PI * h2.x)), nrm = vec2(-dir.y, dir.x);
      float hl = mix(0.2, 1.0, h2.y) * CELL;
      float ws = mix(0.002, 0.004, h2.z);
      vec2 d = p - c;
      float along = dot(d, dir), across = dot(d, nrm);
      float sPerp = max(sigmaAlong(F, nrm), ws), sPar = sigmaAlong(F, dir);
      float lenW = gaussCdf((hl - along) / sPar) - gaussCdf((-hl - along) / sPar);
      float cov = ws * gauss1(across, sPerp) * lenW;
      if (cov < 1e-8) continue;
      vec3 t3 = normalize(dir.x * fC[0] + dir.y * fC[1]);
      vec3 n3 = cross(Nc, t3);
      float qPar = dot(Hs, t3), qPerp = dot(Hs, n3);
      float sPar2 = base2 + dot(dir, ScCard * dir);
      float win = 1.0 - smoothstep(halfW - edge, halfW + edge, abs(qPerp));
      acc += cov * gauss1(qPar, sqrt(sPar2)) * win;
    }
  }
  return g.rad * g.A * Fr * acc / (2.0 * halfW) * g.rgb;
}
vec3 dustRadiance(vec3 E, vec3 V, vec3 Nc) {
  float co = clamp(dot(Nc, V), 0.0, 1.0);
  return (0.4 / PI) * E * (1.0 + 3.0 * sq(1.0 - co));
}
`})))()}function We(e,t,n,r){if(!e.includes(t))throw Error(`holo: shader adaptation "${r}" no longer applies`);return e.split(t).join(n)}function Ge(e){return Object.entries(e).map(([e,t])=>{if(!Ze.test(e))throw Error(`holo: invalid define name "${e}"`);return`#define ${e} ${t}`}).join(`
`)}function Ke(e,t,n){return[M,Ge(e),`#define CARD_PROGRAM 1`,Oe,qe,Ie,Pe,Re,Ee,He,Ae,Ye,Xe,...t,n].join(`
`)}var M,qe,Je,Ye,Xe,Ze,Qe,$e,N;function P(){return(P=e((()=>{if(De(),ke(),je(),Ne(),Fe(),Le(),ze(),Ve(),Ue(),M=`#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define texture2D texture
precision highp float;
precision highp int;
precision highp sampler2D;
#define HIGH_PRECISION
uniform vec3 cameraPosition;
`,qe=We(Be,`uniform highp sampler2DArray uCmfConv;
uniform highp sampler2DArray uCmfCum;`,`uniform highp sampler2D uCmfConv;
uniform highp sampler2D uCmfCum;
// vfx-js port: the SPD layers are stacked vertically in one 2D atlas. c = (u, v within the layer, layer). v lies in
// [0.5, 40.5]/41 (cmfRow clamps σ), so bilinear filtering never mixes layers.
vec4 cmfAtlas(highp sampler2D t, vec3 c, float lod) {
  return textureLod(t, vec2(c.x, (c.z + c.y) / float(NSPD)), lod);
}`,`spectral atlas`).replace(/textureLod\((uCmfConv|uCmfCum), vec3\(/g,`cmfAtlas($1, vec3(`),qe.includes(`textureLod(uCmf`))throw Error(`holo: shader adaptation "spectral lookups" incomplete`);Je=`
vec2 octEncode(vec3 d) {
  d /= abs(d.x) + abs(d.y) + abs(d.z);
  vec2 e = d.z >= 0.0 ? d.xy : (1.0 - abs(d.yx)) * vec2(d.x >= 0.0 ? 1.0 : -1.0, d.y >= 0.0 ? 1.0 : -1.0);
  return e * 0.5 + 0.5;
}
vec3 octDecode(vec2 uv) {
  vec2 f = uv * 2.0 - 1.0;
  vec3 n = vec3(f, 1.0 - abs(f.x) - abs(f.y));
  float t = max(-n.z, 0.0);
  n.xy += vec2(n.x >= 0.0 ? -t : t, n.y >= 0.0 ? -t : t);
  return normalize(n);
}
`,Ye=We(We(Me,`uniform samplerCube uEnv;`,`uniform sampler2D uEnv;${Je}
// vfx-js port: uEnv is an octahedral atlas of ENV_LEVELS prefiltered tiles stacked vertically (scene/env.ts); the
// level blends the two nearest tiles, like a trilinear lookup of the PMREM mips.
vec3 envOctLod(vec3 d, float lod) {
  const float N = ${7 .toFixed(1)}, S = ${128 .toFixed(1)};
  vec2 uv = clamp(octEncode(d), 0.5 / S, 1.0 - 0.5 / S);
  float l = clamp(lod, 0.0, N - 1.0), l0 = floor(l), l1 = min(l0 + 1.0, N - 1.0);
  vec3 a = textureLod(uEnv, vec2(uv.x, (l0 + uv.y) / N), 0.0).rgb;
  vec3 b = textureLod(uEnv, vec2(uv.x, (l1 + uv.y) / N), 0.0).rgb;
  return mix(a, b, l - l0);
}`,`ibl sampler`),`textureLod(uEnv, uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r)).rgb`,`envOctLod(uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r))`,`ibl lookup`),Xe=`
// ===== print (vfx-js port) — the element is the print layer =====
// holospot composes R ≈ (1 − W)·T2·R_foil + W·onWhite (print.glsl). Here W = 0 everywhere (the element's own pixels
// outside the foil are composited by the output pass) and T2 = mix(1, element colour, uInk): the element tints the
// foil like a translucent ink. The foil's coverage comes from the element too (uMask: 0 its alpha, 1 its luma × alpha,
// 2 everywhere) and goes into the card target's alpha, as holospot's coverage does, so the glare only sees visible
// foil.
uniform sampler2D uPrintSrc;
uniform vec4 srcRectUv;    // element UV → src texture UV (vfx-js auto uniform)
uniform float uInk;
uniform int uMask;
struct Print { float W; vec3 T2; vec3 onWhite; float silver; };
in vec2 vHoloUv;             // card UV of this fragment (CARD_VERT; the mains declare their own vUv)
vec4 printUvDerivs(vec2 p) { return vec4(0.0); }
vec3 printSrgbToLinear(vec3 c) {
  return mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92, vec3(lessThanEqual(c, vec3(0.04045))));
}
Print printLayer(vec2 pMm, vec4 dUv) {
  Print pr; pr.W = 0.0; pr.onWhite = vec3(0.85); pr.silver = 0.0;
  vec4 s = texture(uPrintSrc, srcRectUv.xy + (pMm / uCardSizeMm) * srcRectUv.zw);
  vec3 c = s.a > 1e-4 ? printSrgbToLinear(clamp(s.rgb / s.a, 0.0, 1.0)) : vec3(1.0);
  pr.T2 = mix(vec3(1.0), c, uInk);
  return pr;
}
#ifdef HOLO_CLEAR_PAPER
// emboss with the element as its logo and no ground: only the logo is drawn (defined by the emboss chunk)
float holoPaperAlpha();
#endif
float printCoverage() {
#ifdef HOLO_CLEAR_PAPER
  return holoPaperAlpha();
#endif
  if (uMask == 2) return 1.0;
  vec4 s = texture(uPrintSrc, srcRectUv.xy + vHoloUv * srcRectUv.zw);
  if (uMask == 0) return clamp(s.a, 0.0, 1.0);
  vec3 u = s.a > 1e-4 ? clamp(s.rgb / s.a, 0.0, 1.0) : vec3(0.0);
  return clamp(dot(u, LUMA_SRGB) * s.a, 0.0, 1.0);
}
// Foil Emboss's printed picture (paper.glsl printTint): the element, or the emboss.print image (uPrintOwn, fitted by
// uPrintRect); linear colour, straight alpha, as three decodes an sRGB image texture.
uniform sampler2D uPrintImg;
uniform vec4 uPrintRect;
uniform int uPrintOwn;
vec4 holoPrintSample(vec2 uv, vec2 dx, vec2 dy) {
  vec4 s = uPrintOwn == 1
    ? textureGrad(uPrintImg, uPrintRect.xy + uv * uPrintRect.zw, dx * uPrintRect.zw, dy * uPrintRect.zw)
    : textureGrad(uPrintSrc, srcRectUv.xy + uv * srcRectUv.zw, dx * srcRectUv.zw, dy * srcRectUv.zw);
  return vec4(s.a > 1e-4 ? printSrgbToLinear(clamp(s.rgb / s.a, 0.0, 1.0)) : vec3(1.0), s.a);
}
// The material mains end with gl_FragColor = encodeCard(L): premultiply it by the coverage.
vec4 encodeCardCovered(vec3 L) { return encodeCard(L) * printCoverage(); }
#define encodeCard(L) encodeCardCovered(L)
`,Ze=/^[A-Za-z_][A-Za-z0-9_]*$/,Qe=`#version 300 es
precision highp float;
in vec3 position;
uniform mat3 uCardRot, uPrevCardRot;
uniform vec2 uCardWorldMm;
uniform mat3 uVisRot;
uniform mat4 uViewProj;
uniform int uPersp;
out vec3 vWorldPos; out vec3 vPrevWorldPos; out vec2 vUv; out vec3 vN; out vec3 vT; out vec3 vB;
out float vOcc;
out vec2 vHoloUv;
void main() {
  vec2 uv = position.xy * 0.5 + 0.5;
  vec3 local = vec3((uv - 0.5) * uCardWorldMm * 0.001, 0.0);   // metres, card centre at the origin
  vWorldPos = uCardRot * local;
  vPrevWorldPos = uPrevCardRot * local;
  vUv = uv;
  vN = uCardRot[2]; vT = uCardRot[0]; vB = uCardRot[1];
  vOcc = 0.0;
  vHoloUv = uv;
  gl_Position = uPersp == 1 ? uViewProj * vec4(uVisRot * local, 1.0) : vec4(position.xy, 0.0, 1.0);
}
`,$e=`#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D src;
uniform vec4 srcRectUv;
out vec4 outColor;
void main() { outColor = texture(src, srcRectUv.xy + vUv * srcRectUv.zw); }
`,N=`#version 300 es
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`})))()}function et(e,t){let n=0;for(let[r,i,a,o]of t){let t=(e-i)*(e<i?a:o);n+=r*Math.exp(-.5*t*t)}return n}function tt(e){return[et(e,ot),et(e,st),et(e,ct)]}function nt(e,t){return[e[0]*t[0]+e[1]*t[1]+e[2]*t[2],e[3]*t[0]+e[4]*t[1]+e[5]*t[2],e[6]*t[0]+e[7]*t[1]+e[8]*t[2]]}function F(e,t){let n=Array(9);for(let r=0;r<3;r++)for(let i=0;i<3;i++)n[3*r+i]=e[3*r]*t[i]+e[3*r+1]*t[3+i]+e[3*r+2]*t[6+i];return n}function I(e){let[t,n,r,i,a,o,s,c,l]=e,u=a*l-o*c,d=o*s-i*l,f=i*c-a*s,p=t*u+n*d+r*f;if(Math.abs(p)<1e-300)throw Error(`mat3Inverse: singular matrix`);let m=1/p;return[u*m,(r*c-n*l)*m,(n*o-r*a)*m,d*m,(t*l-r*s)*m,(r*i-t*o)*m,f*m,(n*s-t*c)*m,(t*a-n*i)*m]}function rt(e){return[e[0],0,0,0,e[1],0,0,0,e[2]]}function it(e,t){let n=([e,t])=>[e/t,1,(1-e-t)/t],r=n(e[0]),i=n(e[1]),a=n(e[2]),o=[r[0],i[0],a[0],r[1],i[1],a[1],r[2],i[2],a[2]];return F(o,rt(nt(I(o),n(t))))}function at(e){let[t,n,r]=tt(e);return nt(vt,[t/lt[0],n/lt[1],r/lt[2]])}var L,R,z,ot,st,ct,lt,ut,dt,ft,pt,mt,ht,gt,_t,vt,yt,bt,B;function xt(){return(xt=e((()=>{L=.5,Math.round(470/L)+1,R=new Float64Array(941),z=new Float64Array(941);for(let e=0;e<941;e++)R[e]=360+L*e,z[e]=e===0||e===940?.5*L:L;ot=[[.362,442,.0624,.0374],[1.056,599.8,.0264,.0323],[-.065,501.1,.049,.0382]],st=[[.821,568.8,.0213,.0247],[.286,530.9,.0613,.0322]],ct=[[1.217,437,.0845,.0278],[.681,459,.0385,.0725]],lt=(()=>{let e=0,t=0,n=0;for(let r=0;r<941;r++){let[i,a,o]=tt(R[r]);e+=z[r]*i,t+=z[r]*a,n+=z[r]*o}return[e,t,n]})(),ut=[.3127,.329],dt=[[.64,.33],[.3,.6],[.15,.06]],ft=[[.68,.32],[.265,.69],[.15,.06]],pt=it(dt,ut),mt=I(pt),ht=nt(pt,[1,1,1]),gt=[.8951,.2664,-.1614,-.7502,1.7135,.0367,.0389,-.0685,1.0296],_t=(()=>{let e=e=>nt(gt,e),t=e([1,1,1]),n=e(ht);return F(I(gt),F(rt([n[0]/t[0],n[1]/t[1],n[2]/t[2]]),gt))})(),vt=F(mt,_t),yt=it(ft,ut),bt=F(I(yt),pt),I(bt),B=(()=>{let e=new Float64Array(2823);for(let t=0;t<941;t++){let n=at(R[t]);e[3*t]=n[0],e[3*t+1]=n[1],e[3*t+2]=n[2]}return e})()})))()}function St(e,t,n){let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)}function Ct(e){return .889-125e-6*(Math.min(Math.max(e,380),780)-450)}function wt(e,t){if(t.type===`clear`)return 1;let n=St(t.edgeNm-t.widthNm,t.edgeNm+t.widthNm,e);return t.floor+(1-t.floor)*(t.type===`longpass`?n:1-n)}function Tt(e){let t={type:e.type,edgeNm:e.edgeNm,widthNm:e.widthNm,floor:e.floor};return e=>Ct(e)*wt(e,t)}function Et(e,t){return e**-5/Math.expm1(Mt/(e*t))}function Dt(e,t,n){let r=(e-t)/n;return Math.exp(-.5*r*r)}function Ot(e,t){switch(e){case`equal`:return 1;case`daylight`:return Et(t,5600);case`tungsten`:return Et(t,3200);case`led`:return Dt(t,452,10)+.62*Dt(t,565,52);case`triphosphor`:{let e=.03;for(let[n,r,i]of Nt)e+=r*Dt(t,n,i);return e}}}function kt(e,t){return e===`equal`?1:Pt[e]*Ot(e,t)}function At(e,t){let n=0,r=0,i=0;for(let a=0;a<941;a++){let o=R[a],s=z[a]*kt(e,o)*t(o);n+=s*B[3*a],r+=s*B[3*a+1],i+=s*B[3*a+2]}return[n,r,i]}function jt(e){let t=It.get(e);return t||(t=At(e,Ft),It.set(e,t)),t}var Mt,Nt,Pt,Ft,It;function V(){return(V=e((()=>{xt(),Mt=14388e3,Nt=[[405,.12,2.5],[436,.55,2.5],[487,.12,3],[546,1,3],[577,.15,3],[611,.95,4],[631,.12,4]],Pt=(()=>{let e=[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`],t=0,n={};for(let t of e)n[t]=0;for(let r=0;r<941;r++){let i=R[r],a=z[r]*tt(i)[1];t+=a;for(let t of e)n[t]+=a*Ot(t,i)}let r={};for(let i of e)r[i]=i===`equal`?1:t/n[i];return r})(),Ft=()=>1,It=new Map})))()}var Lt;function Rt(){return(Rt=e((()=>{Lt={prism:{compactDisc:{"prism.pattern":`concentric`,"prism.pitch":1600,"prism.fan":1.5,"prism.coatAlpha":.02,"prism.orangePeel":0},goldRainbowFoil:{"prism.tint":`longpass`,"prism.tintEdge":500,"prism.tintWidth":70,"prism.tintFloor":.25,"prism.depth":80},softPastelSatin:{"prism.fan":16,"prism.roughness":1.2,"prism.sigPitch":2,"prism.coatAlpha":.15},sunburst:{"prism.pattern":`radial`,"prism.pitch":1200,"prism.depth":110,"prism.fan":0,"prism.sigTheta":3},iceBlue:{"prism.tint":`shortpass`,"prism.tintEdge":560,"prism.tintWidth":60,"prism.tintFloor":.3}},shatter:{silverCrackedIce:{"shatter.tint":`clear`,"shatter.depth":75},fineFrost:{"shatter.size":.8,"shatter.chords":1,"shatter.tilt":2.5,"shatter.fan":8},largeMirrorFacets:{"shatter.size":6,"shatter.coverage":.3,"shatter.tilt":3,"shatter.ridgeH":.4,"shatter.creaseShare":100},steppedFlashes:{"shatter.orientK":6,"shatter.jitter":.6,"shatter.chords":.8},squareTiles:{"shatter.jitter":0,"shatter.chords":0,"shatter.size":3,"shatter.creaseShare":100}},nebula:{silverHolographicGlitter:{"nebula.tint":`clear`,"nebula.baseColor":`#101014`,"nebula.pitchMin":800,"nebula.pitchMax":1200},goldGlitter:{"nebula.tint":`longpass`,"nebula.tintEdge":500,"nebula.tintWidth":70,"nebula.tintFloor":.25,"nebula.baseColor":`#2a1a05`,"nebula.pitchMin":900,"nebula.pitchMax":1200},fineShimmerDust:{"nebula.size":60,"nebula.layers":3,"nebula.tilt":8,"nebula.starDensity":0},chunkyFlakes:{"nebula.size":400,"nebula.shape":`square`,"nebula.layers":1,"nebula.curv":.2,"nebula.tilt":3},starfield:{"nebula.starDensity":12,"nebula.starSize":900,"nebula.coverage":.4,"nebula.baseColor":`#05040f`}},sparkle:{silverSparkleFilm:{"sparkle.tint":`clear`,"sparkle.speckShare":0},champagneSparkle:{"sparkle.tint":`longpass`,"sparkle.tintEdge":540,"sparkle.tintWidth":90,"sparkle.tintFloor":.5,"sparkle.speckShare":0},fineDenseGlitter:{"sparkle.size":200,"sparkle.coverage":.7,"sparkle.irregularity":1},confettiDots:{"sparkle.size":1200,"sparkle.coverage":.5,"sparkle.irregularity":.3,"sparkle.tilt":1.5,"sparkle.orientJitter":8},twinklingSpecks:{"sparkle.speckType":`grating`,"sparkle.speckShare":25,"sparkle.speckPitch":700}},vortex:{silverVortex:{"vortex.tint":`clear`},discRings:{"vortex.swirl":0,"vortex.bands":0,"vortex.pitch":1600,"vortex.tint":`clear`},tightWhirlpool:{"vortex.swirl":40,"vortex.fan":.8,"vortex.bands":48,"vortex.contrast":.7},softGlowArms:{"vortex.fan":6,"vortex.roughness":.8,"vortex.bands":0},offCentreCopper:{"vortex.centre":{x:.5,y:-.4},"vortex.handedness":`cw`,"vortex.tintEdge":570,"vortex.tintWidth":80,"vortex.tintFloor":.2}},emboss:{goldMarkOnCotton:{"emboss.foil":`gold`,"emboss.height":350,"emboss.shoulder":.3},silverDeboss:{"emboss.foil":`silver`,"emboss.profile":`deboss`,"emboss.height":300,"emboss.gloss":.4},rainbowSealOnKraft:{"emboss.stock":`kraft`,"emboss.foil":`rainbow`},sparkleFoilPillow:{"emboss.foil":`sparkle`,"emboss.sparkleSize":120,"emboss.profile":`dome`,"emboss.height":600,"emboss.puff":.7}}}})))()}var zt;function Bt(){return(Bt=e((()=>{zt=`uniform sampler2D tSrc;
uniform vec2 uSrcTexel;
uniform ivec2 uSrcSize;
uniform vec2 uSrcMin, uSrcMax;
#if GLARE_MODE < 2
vec3 decodeTexel(ivec2 p) {
  if (any(lessThan(p, ivec2(0))) || any(greaterThanEqual(p, uSrcSize))) return vec3(0.0);
  vec4 P = texelFetch(tSrc, p, 0);
  float a = clamp(P.a, 0.0, 1.0);
  if (a <= 1e-5) return vec3(0.0);
  vec3 cu = P.rgb / a;
  vec3 c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4));
  c = clamp(sanitize(c), vec3(-1.0e4), vec3(1.0e4));
  float Y = dot(c, LUMA_SRGB);
  c *= Y > 1.0e4 ? 1.0e4 / Y : (Y < 0.0 ? 0.0 : 1.0);
  return c * a;
}
#endif
#if GLARE_MODE == 0
const float W13[36] = float[36](
   8.0,  8.0, 16.0, 16.0,  8.0,  8.0,
   8.0, 40.0, 48.0, 48.0, 40.0,  8.0,
  16.0, 48.0, 64.0, 64.0, 48.0, 16.0,
  16.0, 48.0, 64.0, 64.0, 48.0, 16.0,
   8.0, 40.0, 48.0, 48.0, 40.0,  8.0,
   8.0,  8.0, 16.0, 16.0,  8.0,  8.0);
void main() {
  ivec2 base = 2 * ivec2(gl_FragCoord.xy) - 2;
  vec3 s = vec3(0.0);
  for (int j = 0; j < 6; ++j)
    for (int i = 0; i < 6; ++i)
      s += W13[j * 6 + i] * decodeTexel(base + ivec2(i, j));
  gl_FragColor = vec4(s * (1.0 / 1024.0), 1.0);
}
#elif GLARE_MODE == 1
const float W8[8] = float[8](0.5, 1.5, 2.5, 3.5, 3.5, 2.5, 1.5, 0.5);
void main() {
  ivec2 base = 4 * ivec2(gl_FragCoord.xy) - 2;
  vec3 s = vec3(0.0);
  for (int j = 0; j < 8; ++j) {
    vec3 row = vec3(0.0);
    for (int i = 0; i < 8; ++i) row += W8[i] * decodeTexel(base + ivec2(i, j));
    s += W8[j] * row;
  }
  gl_FragColor = vec4(s * (1.0 / 256.0), 1.0);
}
#else
vec3 tapSrc(vec2 uv) { return textureLod(tSrc, clamp(uv, uSrcMin, uSrcMax), 0.0).rgb; }
void main() {
  vec2 c = 2.0 * gl_FragCoord.xy * uSrcTexel, t = uSrcTexel;
  vec3 a = tapSrc(c + t * vec2(-2.0,  2.0)), b = tapSrc(c + t * vec2(0.0,  2.0)), cc = tapSrc(c + t * vec2(2.0,  2.0));
  vec3 d = tapSrc(c + t * vec2(-2.0,  0.0)), e = tapSrc(c),                       f = tapSrc(c + t * vec2(2.0,  0.0));
  vec3 g = tapSrc(c + t * vec2(-2.0, -2.0)), h = tapSrc(c + t * vec2(0.0, -2.0)), i = tapSrc(c + t * vec2(2.0, -2.0));
  vec3 j = tapSrc(c + t * vec2(-1.0,  1.0)), k = tapSrc(c + t * vec2(1.0,  1.0));
  vec3 l = tapSrc(c + t * vec2(-1.0, -1.0)), m = tapSrc(c + t * vec2(1.0, -1.0));
  vec3 s = e * 0.125 + (a + cc + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(s, 1.0);
}
#endif
`})))()}var Vt;function Ht(){return(Ht=e((()=>{Vt=`uniform sampler2D tSrc;
uniform vec2 uSrcTexel;
uniform vec2 uSrcMin, uSrcMax;
uniform float uK;
vec3 tapSrc(vec2 uv) { return textureLod(tSrc, clamp(uv, uSrcMin, uSrcMax), 0.0).rgb; }
void main() {
  vec2 c = 0.5 * gl_FragCoord.xy * uSrcTexel, t = uSrcTexel;
  vec3 s = 4.0 * tapSrc(c)
         + 2.0 * (tapSrc(c + vec2(t.x, 0.0)) + tapSrc(c - vec2(t.x, 0.0)) + tapSrc(c + vec2(0.0, t.y)) + tapSrc(c - vec2(0.0, t.y)))
         + tapSrc(c + t) + tapSrc(c - t) + tapSrc(c + vec2(t.x, -t.y)) + tapSrc(c + vec2(-t.x, t.y));
  gl_FragColor = vec4(uK * s * (1.0 / 16.0), 0.0);
}
`})))()}function Ut(e,t,n,r){let i=Math.max(n,.001),a=[];for(let n=0;n<e;n++)a.push(Math.exp(-(t*2**n)/Math.max(r,.001)/i));let o=a.reduce((e,t)=>e+t,0);return a.map(e=>e/o)}var Wt,Gt,Kt;function qt(){return(qt=e((()=>{Bt(),Ht(),P(),Wt=e=>`${M}\n#define GLARE_MODE ${e}\n${Oe}\n${zt}`,Gt=`${M}\n${Vt}`,Kt=class{levels=[];key=``;ensure(e,t,n,r,i){let a=`${t}x${n}/${r}/${i}`;if(a===this.key)return;this.dispose(),this.key=a;let o=Math.max(1,Math.ceil(t/i)),s=Math.max(1,Math.ceil(n/i));for(let t=0;t<r;t++)this.levels.push({rt:e.createRenderTarget({size:[o,s],float:!0,filter:`linear`}),w:o,h:s}),o=Math.max(1,Math.ceil(o/2)),s=Math.max(1,Math.ceil(s/2))}get level0(){return this.levels[0]?.rt??null}render(e,t,n,r,i,a,o){let s=this.levels.length;if(!s)return 0;let c=Ut(s,i,a,o);for(let a=0;a<s;a++){let o=this.levels[a];if(a===0)e.draw({frag:Wt(+(i===4)),vert:N,target:o.rt,uniforms:{tSrc:t,uSrcTexel:[1/n,1/r],uSrcSize:[n,r],uSrcMin:[0,0],uSrcMax:[1,1]}});else{let t=this.levels[a-1];e.draw({frag:Wt(2),vert:N,target:o.rt,uniforms:{tSrc:t.rt,uSrcTexel:[1/t.w,1/t.h],uSrcSize:[t.w,t.h],uSrcMin:[.5/t.w,.5/t.h],uSrcMax:[(t.w-.5)/t.w,(t.h-.5)/t.h]}})}}for(let t=s-1;t>=1;t--){let n=this.levels[t],r=this.levels[t-1];e.draw({frag:Gt,vert:N,target:r.rt,blend:`additive`,uniforms:{tSrc:n.rt,uSrcTexel:[1/n.w,1/n.h],uSrcMin:[.5/n.w,.5/n.h],uSrcMax:[(n.w-.5)/n.w,(n.h-.5)/n.h],uK:c[t]/Math.max(c[t-1],1e-30)}})}return c[0]}outputScale(e,t,n){let r=this.levels[0];return r?[e/n/r.w,t/n/r.h]:[1,1]}dispose(){for(let e of this.levels)e.rt.dispose();this.levels=[],this.key=``}}})))()}var Jt;function Yt(){return(Yt=e((()=>{Jt=`uniform sampler2D tHdr; uniform sampler2D tG0; uniform float uGW0; uniform vec2 uViewScale;
uniform vec2 uHdrMax;
uniform vec2 uG0Scale, uG0Max;
uniform float uGlare, uExposure; uniform int uTone, uP3, uRaw; uniform vec3 uBg;
uniform float uGrain, uGrainCell, uGrainSeed; uniform int uGrainRgb, uGrainBg;
varying vec2 vUv;
const mat3 M_SRGB_TO_P3 = mat3(0.822462, 0.033194, 0.017083,
                               0.177538, 0.966806, 0.072397,
                               0.0,      0.0,      0.910520);
vec3 neutralTM(vec3 color) {
  const float StartCompression = 0.8 - 0.04;
  const float Desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < StartCompression) return color;
  float d = 1.0 - StartCompression;
  float newPeak = 1.0 - d * d / (peak + d - StartCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (Desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
const mat3 OUT_SRGB_TO_REC2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
const mat3 OUT_REC2020_TO_SRGB = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
vec3 outAgxContrast(vec3 x) {
  vec3 x2 = x * x, x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 agxTM(vec3 color) {
  const mat3 AgXInsetMatrix = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
                                   vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
                                   vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 AgXOutsetMatrix = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
                                    vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
                                    vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  const float AgxMinEv = -12.47393, AgxMaxEv = 4.026069;
  color = OUT_SRGB_TO_REC2020 * color;
  color = AgXInsetMatrix * color;
  color = max(color, 1e-10);
  color = log2(color);
  color = (color - AgxMinEv) / (AgxMaxEv - AgxMinEv);
  color = clamp(color, 0.0, 1.0);
  color = outAgxContrast(color);
  color = AgXOutsetMatrix * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  color = OUT_REC2020_TO_SRGB * color;
  return clamp(color, 0.0, 1.0);
}
vec3 toDisplay(vec3 c) {
  if (uTone == 1) {
    c = agxTM(gamutMapLuma(c, LUMA_SRGB));
    return clamp(uP3 == 1 ? M_SRGB_TO_P3 * c : c, 0.0, 1.0);
  }
  if (uP3 == 1) c = M_SRGB_TO_P3 * c;
  c = gamutMapLuma(c, uP3 == 1 ? LUMA_P3 : LUMA_SRGB);
  return clamp(uTone == 0 ? neutralTM(c) : c, 0.0, 1.0);
}
float min3Bg(vec3 c) { return min(min(c.x, c.y), c.z); }
vec3 srgbOETF(vec3 x) {
  x = clamp(x, 0.0, 1.0);
  return mix(1.055 * pow(x, vec3(1.0 / 2.4)) - 0.055, 12.92 * x, vec3(lessThanEqual(x, vec3(0.0031308))));
}
float triangularDither(vec2 fragCoord) {
  uvec3 h = pcg3d(uvec3(uvec2(fragCoord), 0x2545f491u));
  vec2 u = vec2(h.xy >> 8u) * (1.0 / 16777216.0);
  return u.x + u.y - 1.0;
}
float grainHash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float grainLattice(vec2 q, float z) { return grainHash(vec3(mod(q, 2048.0), z)) - 0.5; }
float grainNoise(vec2 fc, float z) {
  if (uGrainCell <= 1.0) return grainLattice(floor(fc), z);
  vec2 x = fc / uGrainCell - 0.5;
  vec2 i = floor(x), f = x - i;
  vec2 s = f * f * (3.0 - 2.0 * f);
  vec4 w = vec4((1.0 - s.x) * (1.0 - s.y), s.x * (1.0 - s.y), (1.0 - s.x) * s.y, s.x * s.y);
  vec4 v = vec4(grainLattice(i, z), grainLattice(i + vec2(1.0, 0.0), z),
                grainLattice(i + vec2(0.0, 1.0), z), grainLattice(i + vec2(1.0, 1.0), z));
  return dot(w, v) * inversesqrt(dot(w, w));
}
void main() {
  vec2 uv = min(vUv * uViewScale, uHdrMax);
  vec4 P = textureLod(tHdr, uv, 0.0);
  if (uRaw == 1) { gl_FragColor = vec4(P.rgb, 1.0); return; }
  float a = clamp(P.a, 0.0, 1.0); vec3 c = vec3(0.0);
  if (a > 1e-5) { vec3 cu = P.rgb / a; c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4)); }
  vec3 G = uGW0 * textureLod(tG0, min(vUv * uG0Scale, uG0Max), 0.0).rgb;
  vec3 card  = toDisplay(((1.0 - uGlare) * c + uGlare * G) * uExposure);
  vec3 spill = toDisplay(uGlare * G * uExposure);
  vec3 bgD = uP3 == 1 ? clamp(M_SRGB_TO_P3 * uBg, 0.0, 1.0) : uBg;
  vec3 lin = a * card + (1.0 - a) * (1.0 - (1.0 - bgD) * (1.0 - spill));
  vec3 enc = srgbOETF(lin);
  if (uGrain > 0.0) {
    vec2 fc = gl_FragCoord.xy;
    float k = uGrain * (uGrainBg == 1 ? 1.0 : a);
    enc += k * (uGrainRgb == 1
      ? vec3(grainNoise(fc, uGrainSeed), grainNoise(fc, uGrainSeed + 171.0), grainNoise(fc, uGrainSeed + 342.0))
      : vec3(grainNoise(fc, uGrainSeed)));
  }
  bool page = a <= 0.0 && (min3Bg(uBg) >= 1.0 || max3(spill) <= 1e-4);
  if (!page) enc += triangularDither(gl_FragCoord.xy) / 255.0;
  gl_FragColor = vec4(clamp(enc, 0.0, 1.0), 1.0);
}
`})))()}var Xt,Zt;function Qt(){return(Qt=e((()=>{Xt=`PAAAATwAABA8AAAYPAAAHDwAACA8AAAiPAAAJDwAACY8AAAoPAAAKTwAACo8AAArPAAALDwAAC08AAAuPAAALzwAADA8AAAwPAAAMTwAADE8AAAyPAAAMzwAADM8AAA0PAAANDwAADQ8AAA1PAAANTwAADY8AAA2PAAANzwAADc8AAA3PAAAODwAADg8AAA4PAAAODwAADk8AAA5PAAAOTwAADk8AAA5PAAAOjwAADo8AAA6PAAAOjwAADo8AAA7PAAAOzwAADs8AAA7PAAAOzwAADs8AAA8PAAAPDwAADw8AAA8PAAAPDwAADw8AAA8PAAAPDwAADw8AAA8PAAAPP+AJQD/gCUA/4IlAP+GJQD/iSUA/4wl//+OJQD/kCX//5ElAP+TJf//lCX//5Ul//+WJf//lyX//5gl//+ZJf//mSX//5olAP+bJQD/nCX//5wl//+cJf//nCX//54l//+eJf//nyX//58lAP+gJf//oCUA/6Al//+gJQD/oSX//6El//+hJf//oSUA/6El//+hJQD/oSUA/6Il//+hJf//oSUA/6Il//+hJP//oiQA/6Ek//+hJP//oST//6EkAP+hI///oCMA/6Ai//+gIv//nyH//58hAP+dIAD/niAA/5weAP+cHgD/mhwA/5ocAACXGQD/lhgA/5ETAACAAAD/AAP//wAD//8CA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wQD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DBP//AwP//wQEAP8DA///AwP//wQE//8DA///AwP//wQEAP8DBP//BAT//wMD//8EBP//AwMA/wQE//8DAwD/BAT//wMD//8EBP//AwMA/wQEAP8DAwD/BAQA/wMDAP8EBP8AAwMAAAQEAAADA///BAQAAAMDAAAEBAD/goEA/wACAP8AAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wEC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgH//wIC//8CAv//AgL//wIC//8CAv//AgIA/wICAP8CAgD/AgIA/wICAP8CAgAAAgIAAAICAAACAgD/AgIAAAMBAP8AAf//AAH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAQD/AQEA/wEBAP8BAQD/AQEA/wECAP8BAQAAAQIAAAEBAAD+/gD/AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAP//AQH//wEB//8BAf//AQH//wEB//8BAQD/AQH//wEBAP8BAQD/AQH//wEBAP8BAP8AAQEAAAEBAAABAQAAAwUA/wAB//8AAf//AQH//wAB//8BAf//AQH//wAB//8BAf//AQH//wAB//8BAf//AQH//wAB//8AAf//AQH//wEB//8BAf//AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wAB//8AAf//AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wAB//8BAf//AQH//wAB//8BAf//AQH//wEB//8BAf//AQD//wEA//8BAP//AQD//wEA//8BAf//AAH//wABAP8BAf//AQAA/wEAAP8AAQD/AQAA/wEBAP8BAAAAAQAAAAEAAP8AAP//AAD//wAA//8AAP//AAD//wEA//8AAP//AQD//wAA//8AAP//AQD//wAA//8AAP//AAD//wEA//8AAP//AAD//wAA//8AAP//AQD//wEA//8BAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AQD//wEA//8BAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAH//wAB//8AAf//AAH//wAA//8AAP//AAD//wEA//8BAP//AAD//wAA//8AAf//AAEA/wAA//8BAAD/AAAA/wAA//8BAAAAAAAAAAAAAP/8/gD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAAAAAAA/wAAAAAAAQAAAwAA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAP//AAAA/wAAAAAAAAD/AAAAAAEBAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAAAAAAAP/9+wD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAA/wAA//8AAAD/AAAA/wAAAAAAAAAAAwAA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAEAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAA/wAAAAD//QD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AwIA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAAAP8AAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAD9/gD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAQEA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAAAP//AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAD//wAAAP8AAAD/AAAA/wAAAP///wD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAgEA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA//7+AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAD//wAAAP8AAAD/AAAAAAAAAAD/AAD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAAAAQIA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAAAAAAAAP7+AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAD9/AD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AgQA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAP//AAAA/wAAAP8AAAAAAAAAAP//AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAAD9/wD/AP///wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/BAIA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAP/9AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAAAAAAAAD8/QD/AP///wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAAAAP4A/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wUHAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAD+/QD/AAD///////////////////////////////////////////////////////////////////8A////////////////////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD//wAA////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAA/wAAAAAAAAD/9vUA////////AP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP//AAD//wAA////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAYFAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAAACBAD//wD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP///wD///8A////AP///wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAA/fkA/wAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAAAHWCAP//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///////////////////wD///8A////AP///wD///8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA//8AAACMfQAAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP///wD///8A//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAQQA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP///wD///8A////AP//AAD///8A//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wACAP////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD//wAAAAAAAAB/gAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP///wAAcfQA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD//////////////wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD//wAAABCMAP//AP////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8CAwD//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD//wAA//8AAP//AAD/AAAA/wAAAP8AAAAA7fIA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP//AAD//wAAAP8AAAD/AAAAAAAAAJWQAP//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA//8AAP//AAD///8A////AAD49AD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA//8AAP///wD/h4sA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///////8A//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAICAP7////+/////v///v7////+///+/v////7////+/////v///v7////+/////v///v7////+/////v////7////+/////v////7/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP8AAAD/AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAD+/gD+/////v////7///7+///+/v///v7////+///+/v////7///7+///+/v////7////+///+/v////7////+/////v///v7////+////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP8AAAD/AAAA/wAAAAAAAAAAAAAA/wAAAP8AAAAAd3IA/////////////////////v/////////+/////v////7//////////v////7//////////v////7////////////////////+/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP///wD///8A////AP///wAAAAAA/wAAAP8AAAD/AAAAAA4TAP7////+/////v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///////////////////7/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAD//wAA//8AAP8AAAADAwD+/////v////7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v////7////+/////v//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//7/AAD9/wAAb2wA/v////7////+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+/////v////7////+//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP///wAA//8AAP//AP///wD///8A////AAD+/wD//P8A/xEUAP3////9/////f///v3+//79///9/f///v3+//79///+/f///f3+//79///+/f///v3+//7+/v/+/v///v7///7+///+/v///v7////+/////v////7////+//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A/wD/AP8A/wD/AAAA/wAAAP8A/wD/AP8A/wD/AP///wAA//8AAP//AAD//wAA//8AAPv/AAACAgD9/////f////3//v79/v79/f/+/f3+/v39/v79/f7//f3///39/v/9/f7//v3+//39/v/9/v7//v7+//7+///+/v////7///7+///////////////+//////////7///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP8A/wD/AP8A/wD/AP8A/wD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/wAAAAAA/P/+//z//v/8/v7//P7+/vz+/vz8/v78/P7+/Pz+/v38/v78/P7+/fz+/v38/v79/f7+/v3+/v39/v/+/v7//v7///7+/////v////7////+/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP8A/wAAAP8A/wD/AP8A/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABQEAAP39APv//f/7//7/+/7+//v9/v77/v79+/3+/Pv9/vv7/f77+/7+/Pv9/vz8/f78/P7+/f3+/v39/v7+/f7+/v3+/v79/v/+/v////7////+/////v////7///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAP//AP///wAA//8AAP//AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAgAAAAQBAABvcAD4//v/+P78//j8/P/4/Pv/+Pz8/vj8/P34/Pz8+Pz8+/n8/Pv6/f38+/39/fz9/v38/v7+/f7+/v3+/v7+//7//v7+//7+/v/+//7//v////7////+/////v///////////////v////7//v////7/////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEBAAADAgD/FBMA7P/4AOv+2f/s++T/7Pfm/+z16P/t9Oz/7vXt/vH38P3z+PL89fnz+/n8+/36/fz++/38/vv9/P79/v3//f39/vz+/f79/v3+/f79//3+/f7+/v7//v7+//7+/v/+//7//v/+//7//v/+//7//v/+/////v////7///////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP8A/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAEAAAABAAAAAQAAAAEAAAACAQD/AgIA/wQFAAAAAE8AAAAgAAAAIAAAAKQAAAAgAAAAcwAAAKQAAABSAAAAIAAAADkAAABzAAAAzgAAAKUAAAB0AAAAUwAAAEMAAAAiAAAAqgAAADsAAADVAAAAdgAAAB0AAAC9AAAAMgAAAJIAAAD2AAAAXQAAAMgAAAAyAAAAmgAAAAIAAAB4AAAA7QAAADAAAABmAAAAowAAAN4AAAAWAAAAUQAAAIsAAADBAAAA+wAAADEAAABlAAAAmgAAAMsAAAD8AAAAKQAAAFcAAACAAAAAqgAAANAAAAD1AAAACwAAABsAAAAqAAAAOQAAAEYAAABSAAAAXgAAAGgAAAByAAAAegAAAIP/B74A/r2+AP72vgD+q74A/u2+AP6hvv/+q74A/oq+//7tvgD+gb7//qG+//6bvv/+rL7//tS+//6Kvv/+N77//u++//6zvgD/gr4A/y2+//6bvv/+873//6O2//4Dvv/+ir3//hO9//+ZuwD+Brn//yi0AP4YqP//4LUA/xOv//8qpP//GpX//2COAP/Yj///uXYA/4NXAP86Yf/+8Dr//+sdAP8zDf//q9X//0PTAP+mjv//4nX//2w1//9tDAD/BJX///M0Af9zof//cEP//36U//+9QgD/+n8A/3c8AP+d6AD/+lwA/5jlAP+EKQAA678A/0sRAP8bhAAAEQ8A/Aj///2+//799v/+/f7//v3///79///9/f7//v3+//39///+/f7//v3///79/v/9/f7//v3///79///+/f7//f3+//79/v/+/P7//vz///79//79/f3+/f0W//z9//7//v7///7+/v79/f/+/v7//v39/v3+/P/9/dX6/v3+//39/gD9/f3+/v0EAAD9/f7//f3//v0zCf/98vv//vz///0QAwD9/AD+/S8I//7C8f/+EAL//tT2AP4KAP/+5foA/hAE//7k9P/+IBH/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`,Zt=`PAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA7AAAAOwAAADsAAAA7AAAAOwAAADsAAAA7AAAAOwAAADsAAAA7AAAAOwEAADsBAAA7AAAAOwAAADsAAAA7AAAAOwEAADsBAAA7AQAAOwEAADsBAAA7AgAkOwIAKjsBAC06AgAvOgIAMDoCADE6AgAyOgIAMzoCADQ6AgA0OQIANTkCADU5AwA2OQMANjkDADc5AwA3OAMAODgDADg4AwA4OAMAODgDADk3AgA5NwIAOTcCADk2AgA6NgIAOjYCADo2AgA6NQIAOzUCADs1AgA7NAIAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAI//8AGQAAACAAAAAlAAAABAD/AAEAAAAAAAAAAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAD//wAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAS/wAAEv//AAcAAAAE/wAAAv8AAAH//wABAAAAAP8AAAD/AAAAAAAAAP8AAAD/AAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAD/AAAAAAAA/wAAAAAAAAIAAAAT/wAACf8AAAQA/wADAAAAAv8AAAH/AAAB//8AAAAAAAD/AAAA/wAAAAAAAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP//AAAA/wAAAAAAAAAAAAMAAAAQ/wAABv8AAAT/AAACAAAAAQAAAAH/AAAA/wAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAP8AAAAAAAEAAAAOAAAABgAAAAP/AAAC//8AAQAAAAEAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAD/AAAA/wAAAAAAAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP8AAAD/AAAA//8AAAD/AAAAAAANAAAABv8AAAP/AAAC/wAAAv//AAEAAAABAAAAAAAAAAD/AAAA/wAAAAAAAAAAAAAAAAAAAP8AAAD/AAAAAAAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP//AAAAAAALAAAABgAAAAMAAAAC/wAAAf8AAAH/AAABAAAAAAAAAAAAAAAA/wAAAP8AAAD/AAAAAAAAAAAAAAD/AAAAAAAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAD//wAHAAAABwAAAAMAAAAC/wAAAf8AAAH/AAAB/wAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA/wAAAP8AAAAAAAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAB//8ACQAAAAQAAAACAAAAAv8AAAH/AAAA/wAAAf8AAAAAAAAAAAAAAP8AAAAAAAAA/wAAAP8AAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAD/AAAA/wAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA//8ACgAAAAQAAAACAAAAAgAAAAH/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAABP//AAX/AAADAAAAAgAAAAEAAAABAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAA/wAAAP8AAAAAAAAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAP8AAAj/AAAEAAAAAgAAAAEAAAABAAAAAQAAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAA/wAAAP8BAAD/AAAA/wEAAP8AAAD/AQAA/wAAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAf/AAAF/wAAAgAAAAEAAAABAAAAAQAAAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAAABAAD/AQAA/wEAAP8AAAD/AAAAAAAAAP8AAAD/AAAA/wAAAAAAAAD/AAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG//8AAwAAAAIAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAD/AQAA/wEAAP8AAAD/AQAA/wEAAP8AAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/wAABP//AAL/AAABAAAAAQAAAAEAAAAAAAEAAAAAAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8AAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABgAAAAP/AAAC/wAAAQAAAAAAAAABAAEAAAABAAAAAAAAAAEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AQAA/wAAAP8AAAAAAAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAABgAAAAT/AAAC/wAAAQAAAAH/AAABAAEAAAABAAAAAQAAAAEAAAABAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX/AQAD/wAAAf8AAAEAAAAAAAEAAQABAAD/AQAA/wAAAAAAAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAQAEAAEAAv8AAAH/AQAB/wEAAAABAAAAAQAAAAEAAP8AAAAAAQAAAAEAAAABAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AQAGAAEAA/8BAAH/AAABAAEAAQABAAEAAQAAAAEAAP8BAAD/AQAAAAEAAAABAAAAAAAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEAAEABAABAAIAAAAB/wEAAf8BAAD/AQABAAEAAAABAAD/AQAAAAEAAAABAAAAAAAAAAAAAAABAAD/AAAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEABgABAAP/AQAB/wEAAf8BAAH/AQAAAAEAAAABAAD/AQAA/wAAAAAAAAAAAQAAAAEAAAABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAgACAAQAAQACAAEAAf8AAAH/AQAAAAEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAAAAQAAAAEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAIAAAACAAb/AQADAAEAAgABAAH/AQABAAEAAAABAAAAAQAAAAEAAP8BAAD/AQAAAAEAAAABAAAAAQAAAAAAAP8AAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAQAEAAEAAgABAAH/AQAB/wAAAP8BAAD/AQAA/wEAAP8BAAD/AQAAAAEAAP8BAAD/AAAA/wEAAP8BAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAEAAAABAAAAAgAEAAIAAwABAAIAAQAB/wEAAf8BAAD/AQAAAAEAAAABAAD/AQAA/wAAAP8BAAD/AQAA/wEAAAABAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAEABv8BAAIAAQAB/wEAAf8BAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAQAAAAEAAAABAAAAAQAAAAEAAgABAAQAAgACAAEAAQABAAH/AAAA/wEAAAABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAEAAAAAAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAYAAQACAAEAAgABAAH/AQAB/wEAAP8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAEAAEAAgABAAH/AQABAAEAAP8BAAAAAQAAAAEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAAAAAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAACAAAAAgADAAIAA/8BAAIAAQABAAEAAf8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAAAAQAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAP8BAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABgABAAMAAQABAAEAAQABAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAQAAQACAAEAAQABAAH/AQAA/wEAAP8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAMAAQADAAEAAgABAAH/AQABAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAP8BAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAFAAEAAv8BAAEAAQABAAEAAf8BAAD/AQAAAAEAAAABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABAABAAIAAQABAAEAAQABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABAABAAMAAQACAAEAAQABAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAP8BAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAUAAQACAAEAAQABAAH/AQAAAAEAAP8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAEAAEAAv8BAAEAAQABAAEAAP8BAAD/AQAA/wEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAA/wEAAAABAAAAAQAAAAEAAAABAAAAAQADAAEAAwABAAEAAQABAAEAAQABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABgABAAIAAQABAAEAAf8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAQAAQACAAEAAQABAAEAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAMAAQADAAEAAf8BAAEAAQABAAEAAP8BAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAGAAEAAgABAAEAAQABAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABAABAAIAAQABAAEAAf8BAAAAAQAA/wEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAgABAAMAAQABAAEAAQABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAYAAQACAAEAAf8BAAEAAQAAAAEAAf8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAFAAEAAgABAAEAAQAB/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAwAAAAEAAAABAAAAAAAAAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEABgABAAMAAQABAAEAAQABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAUAAQACAAEAAf8BAAH/AQAB/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAQAAAAEAAAAAAAAAAf8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAwAAAAIAAAABAAAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAP8BAAAAAQAAAAEABwABAAMAAQAB/wEAAf8BAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAUAAQACAAEAAQABAAEAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAEAAAADAAAAAgAAAAEAAAAB/wAAAP8AAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAwAAAAH/AAAB/wAAAf8AAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEABwABAAIAAQACAAEAAf8BAAH/AQAB/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAUAAQAC/wEAAf8BAAH/AQAB/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAEAAAAAgAAAAL/AAAB/wAAAf8AAAD/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAAAAAAAALAAAAA/8AAAL/AAAB/wAAAf8AAAH/AAAB/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAB/8BAAP/AAAC/wAAAv8AAAH/AAAB/wAAAf8AAAD/AAAB/wAAAf8AAAH/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA/wEAAP8AAAr+AAAG/wAABP8AAAT/AAAD/wAAAwAAAAIAAAACAAAAAgAAAAIAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAB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B3wAJQqkACUL2AAlC8kAJA68ACQQsQAjE6YAIhWcACIXkgAhGosAEBqDABAcmwAPHdIADyDaAA4izwANJMIADSW5AAwmrwALJ6cACiqfAAksmAAJLZAACC2pAAYv2gAELvQABC/pAAIu3AABLdMAACvHAAApwAAAANAAAP/QAAAA0ABXANAA+wDQAE4AzwCBAM4Ac//NAOT9yQAL/sYAmPrAAKj5ygC499MAgfTfAGrw7QBx7gEAdusUAHvp/gCA6eoAQ+nXAETpxQBG6rQASOymAEnumABL8YwATPSBAE33hABO+r0AKfzNACf/vwAnAbIAKASmACgGmgAoCJEAKAuIACgNgAAnDn0AJxG5ACcR0AAnEsMAJhS4ACYWrgAlGKQAFBqaABEdkgARH4sAESGEABAiqQAPI98ADyXhAA4o1AAOKckADCy+AAsttAALLqsACS+jAAgynAAHNJUABjajAAQ21QADOAQAATj4AAE48AAAOOUAAAD0AAAA9AAAAPQAqwD0AGAA9ADg//MAWv/xAAT66gAL/eoAzvrkAK353QC/9tQAx/HIAG/uuwB37LEAfeiiAIPllACI5bYAVOXcAEnm4gBM6M4ATuu9AE/trABR8KAAUvSUAFT4iQBV+4AAQf53ACsBlQAsAswALAa/ACsHswAsCagALAueACsNlQArD4wALBGEACsTfAArFJQAKhbOACoXzgApGMEAKBq2ABQcrQAUHqQAEyCcABIilQARJY4AESeHABEpsgAQKuUADizlAA4t2gANMNAADDLEAAs1ugAKN7QACTitAAc6pwAGPKIAAz6dAAJAzwAAQvwAAEMUAAAAHgAAAB4AAAAeAAsAHQDsAB0AAgAcAK7+GQAM/BIAPfsOALX4AwDK9PkA3e/qAHfr2gB/58wAhuO4AI3gpwCU35gAed+KAFDifgBS5JIAVOjDAFbswQBY8LMAWvWmAFz4mwBd/JAAVwCHADADfwAwBnYAMAlwADEKqwAxDMIAMA62ADAQrAAxEaEAMROZADAVkAAwFokALxiBAC8ZegAuG6gALh3dABge0gAWH8YAFSC7ABUirwAVJKYAFCaeABMplwASK5AAES6KABExtAAQM+cADzX0AA437AANOOQACzrZAAo90AAJP8gABkK/AAVEuQADRrMAAUiuAABKuwAAACcAAAAnAAAAJwAAACgAVv8nAJ7/KAA1+SYAS/wuAM32LwDZ8iMA7+wPALDm+wCM4eYAlNzOAJ3ZuQCk2KYAmtqWAFneiABc4XwAXuhzAGHtagBj8pUAZfi5AGf8rQBoAaIAaQWZADUIjwA2C4YANw1/ADcPdwA3EXEANxKLADgTxgA4FLoAOBWwADcWpwA3F54ANxmXADYakAA1HIkANR2DACkffwAZILcAGiLeABkk1AAYJswAFyjCABcpuAAXK68AFS2mABUvoQAUMZsAEjWWABI3sgAQOuMADz4PAA5ABwAMQ/4ACkb2AAlI7gAHSuQABEzbAAFO0gAAUcwAAADDAAAAwwBQAMMAHgDCAJYAwQAP+bsAYPu5AErzsQDw7acAC+StAO/buQCe1MoAqM3ZALPLvwC7zakAuNOZAGbajABp4YIAbOp5AHDwcQBy+GsAdf5lAHcEcwB5Ca4AeAyqAD4PoAA/EpcAQBSQAEAWiABAF4EAQRh6AEEZdABBGm4AQRqpAEAbxABBG7cAQByuAEAcpABAHZ0APx6WADggjwAeIYoAHyOFAB0ljwAdJ8UAHSnsABwr4wAbLdsAGi/VABoyzwAYNMcAFze/ABc4twAVO68AEz2oABJAowAQQtAAD0X8AA1IJAALSx0ACFAYAAZTEgAEVwwAAVoEAAAA4gAAAOIApADhAKr/4QBK+twAiffWAMvtyQAY4rkAPNKjAC/EjQC9u3cAyrZkANe6XgDhxIoA0tCSAHvdiQB/6YMAhPZ9AIj/eACLCHMAjg5uAJEUaQCUGGQAhBpfAEwclQBNHqsATh6iAE4fmQBPH5IAUCCKAE8fgwBQIH0AUCB2AFAgcgBQIIoATyHEAFAhxwBPIb4ATiK1AEMjrQAmI6UAJySdACUmmAAlJ5IAJSmOACMrlQAjLcoAIjD7ACEy+wAgNPQAHzfsAB455gAcPd8AGz/bABpD1QAYRc8AFknLABNMxgART8EAD1LqAA1VDwAJWTMABVtVAAFfUQAAAAYAAAAGAMb/BQCt9vsAi+vtAGTV0QBxtaoApJd+AHqIXQD9i0kAEZ1BACK4QgAx1EQA8uxHAKcBcQCtEY8Asx6NALgliQC9K4MAwS5+AMYwdwDJMHEAkC9rAGcvZQBpL2EAai2AAGssrwBsKqYAbCqeAG0omABuKJEAbieLAG4mhgBuJoAAbiZ7AG4ldwBtJqUAbSfbAE0n1AA1KM0ANSnGADQqwQA0K7oAMyy0ADIurQAxL6gAMDGiAC8znQAuNcQALDjxACs6GwApPRoAKD8TACZDDAAkRQcAIkkCACBM+wAdT/cAG1P0ABdX8QATWu8AEF7tAAtj6gAEZg4AAP8mAACCpwBW7QYAjicoAM9bOwAGkEkAjcxdAAMKdADEQIYA5maPAJB8jwA3h4kA24mAAMqGdQDagGwA6Hh9APZwrADyaKQAvGCYAIZajQBOU4QAFk18ABlIdQAdRG8AID9pACM7YwAlOGoAJzWlACkyrAAqMKQAKy6dACwslgAsK5AAHCqKAPsphADaKX8AuCh7AJYodwCTKawAkyneAJEq2ACQK9EAjizLAI0uxgCKL8IAiTG9AIYzuQCENbYAgDizAH46sAB6Pa4Ad0DUAHJD/wBuRicAaUlLAGRMTwBeUE4AWVRMAFFXSgBKW0kAQV9HADdjRgAqZ0cAG2xGAAA=`})))()}function $t(e){let t=atob(e),n=new Uint8Array(t.length);for(let e=0;e<t.length;e++)n[e]=t.charCodeAt(e);return n}function en(){let{width:e,height:t}=H,n=new Uint8ClampedArray(e*t*4).fill(255);return[Xt,Zt].forEach((r,i)=>{let a=$t(r),o=a.length/2,s=new Uint16Array(o);for(let t=0;t<o;t++){let n=a[t]<<8|a[o+t];s[t]=n+(t>=e?s[t-e]:0)&65535}for(let r=0;r<64;r++){let a=t-1-(i*64+r);for(let t=0;t<e;t++)h(g(s[r*e+t]),n,4*(a*e+t))}}),n}var H,tn;function nn(){return(nn=e((()=>{Qt(),y(),H={width:256,height:128},tn=`
uniform sampler2D uBytes;
uniform int uRowOffset;
out vec4 outColor;
void main() {
    ivec2 t = ivec2(gl_FragCoord.xy);
    int y = t.y + uRowOffset;
    outColor = vec4(
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 1, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 2, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 3, y), 0).rgb));
}
`})))()}function rn(e){return ln.get(e)}function an(e){let t=ln.get(e);if(t)return Promise.resolve(t);let n=un.get(e);return n||(n=on[e]().then(t=>(ln.set(e,t),un.delete(e),t),t=>{throw un.delete(e),t}),un.set(e,n)),n}var on,sn,cn,ln,un;function dn(){return(dn=e((()=>{n(),on={prism:()=>r(()=>import(`./prism-CRBLf5J4.js`).then(e=>e.prism),__vite__mapDeps([0,1,2]),import.meta.url),shatter:()=>r(()=>import(`./shatter-DjIYmjHF.js`).then(e=>e.shatter),__vite__mapDeps([3,1,2]),import.meta.url),nebula:()=>r(()=>import(`./nebula-CUGQBQ1M.js`).then(e=>e.nebula),__vite__mapDeps([4,1,2,5]),import.meta.url),sparkle:()=>r(()=>import(`./sparkle-Jh3gRSyM.js`).then(e=>e.sparkle),__vite__mapDeps([6,1,2,5]),import.meta.url),vortex:()=>r(()=>import(`./vortex-D2FbgBbd.js`).then(e=>e.vortex),__vite__mapDeps([7,1,2]),import.meta.url),emboss:()=>r(()=>import(`./emboss-_JYyKEyH.js`).then(e=>e.emboss),__vite__mapDeps([8,1,2]),import.meta.url)},sn=Object.keys(on),cn=e=>typeof e==`string`&&Object.hasOwn(on,e),ln=new Map,un=new Map})))()}function fn(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function pn(e,t){return[e[0]*t,e[1]*t,e[2]*t]}function mn(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function hn(e){return Math.hypot(e[0],e[1],e[2])}function gn(e){let t=hn(e);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function _n(e,t){return[e[t],e[3+t],e[6+t]]}function vn(e,t){let n=Math.hypot(e,t),r=Math.min(n,.996),i=n>0?r/n:0;return[e*i,t*i,Math.sqrt(1-r*r)]}function yn(e,t){return t*Math.tan(.5*e*U)}function bn(e){let t=Math.hypot(e[0],e[1]),n=t<1e-4?0:Math.atan2(e[1],e[0]),r=Math.sqrt(Math.max(1-t*t,0)),i=Math.min(t,1),a=Math.cos(n),o=Math.sin(n);return{eTheta:[r*a,r*o,-i],ePhi:[-o,a,0]}}function xn(e,t,n,r){let{eTheta:i,ePhi:a}=bn(e);return{U:pn(i,r*Math.tan(.5*t*U)),W:pn(a,r*Math.tan(.5*n*U))}}function Sn(e,t,n,r=22){let i=2*Math.tan(.5*r*U);return Math.max(2*n/.7/i,2*t/.8/(i*Math.max(e,1e-6)))}function Cn(e,t,n){let r=Math.cos(e*U),i=Math.sin(e*U),a=Math.cos(t*U),o=Math.sin(t*U),s=Math.cos(n*U),c=Math.sin(n*U);return[a*s,-a*c,o,r*c+i*s*o,r*s-i*c*o,-i*a,i*c-r*s*o,i*s+r*c*o,r*a]}function wn(e,t,n,r,i,a){let o=e*U,s=t*U,c=[Math.sin(o)*Math.cos(s),Math.sin(o)*Math.sin(s),Math.cos(o)],{eTheta:l,ePhi:u}=bn(c);return{centre:c,eTheta:l,ePhi:u,halfU:.5*n*U,halfW:.5*r*U,edgeRad:i*U,profile:a}}function Tn(e,t){let n=typeof t==`number`?Math.min(Math.max(t,0),1):+(t===`white`);return{rims:e.rims,fill:n===1?1.5*e.fill:(1+.5*n)*e.fill,scrim:e.scrim,cameraSide:n>0?Math.max(e.cameraSide,.03*n):e.cameraSide,cameraTexture:e.cameraTexture,behind:.6*n*e.backdrop}}var U;function En(){return(En=e((()=>{U=Math.PI/180,wn(78,0,5,60,3,()=>1),wn(78,180,5,60,3,()=>1),wn(62,90,60,60,3,(e,t)=>1+.15*(1-Math.min(e*e+t*t,1))),wn(20,90,20,50,3,e=>.75+.25*Math.min(Math.max(e,-1),1))})))()}function Dn(e){return .5*2**(e/4)}function On(e){let t=Math.abs(e),n=1/(1+.5*t),r=n*Math.exp(-t*t-1.26551223+n*(1.00002368+n*(.37409196+n*(.09678418+n*(-.18628806+n*(.27886807+n*(-1.13520398+n*(1.48851587+n*(-.82215223+n*.17087277)))))))));return e>=0?r:2-r}function kn(e){return .5*On(-e*Math.SQRT1_2)}function An(e){return 2**Math.max(Math.floor(e/4)-4,-1)/G}function jn(e,t,n){let r=0,i=0,a=0;for(let o=0;o<941;o++){let s=R[o],c=kt(e,s)*t(s),l=c*B[3*o],u=c*B[3*o+1],d=c*B[3*o+2];o>0&&(n[3*o]=n[3*o-3]+.5*G*(r+l),n[3*o+1]=n[3*o-2]+.5*G*(i+u),n[3*o+2]=n[3*o-1]+.5*G*(a+d)),r=l,i=u,a=d}}function Mn(e,t){let{PHI:n,SPSI:r}=e,i=G/t;for(let e=J;e<=Gn;e++){let a=e*i,o=e-J;if(a<-6)n[o]=0,r[o]=0;else if(a>Kn)n[o]=1,r[o]=t*a;else{let e=kn(a);n[o]=e,r[o]=t*(a*e+Vn*Math.exp(-.5*a*a))}}}function Nn(e,t){let{gp:n,edge:r,fb:i,mass:a,pre:o,SPSI:s}=e,c=Math.ceil(q/t);o[0]=o[1]=o[2]=0,r[0]=K;for(let e=0;e<c;e++){let c=e*t,l=Math.min(c+t,q),u=(l-c)*G;r[e+1]=K+l;for(let t=0;t<3;t++)i[3*e+t]=(n[3*l+t]-n[3*c+t])/u;let d=s[r[e+1]-Hn-J]-s[r[e]-Hn-J];a[e]=d;for(let t=0;t<3;t++)o[3*(e+1)+t]=o[3*e+t]+i[3*e+t]*d}return c}function Pn(e,t,n,r){let{edge:i,PHI:a,SPSI:o,mass:s,fb:c,acc:l}=e,u=0,d=0,f=0,p=0,m=0,h=0,g=i[t]+r,_=a[g],v=o[g];for(let e=t;e<=n;e++){let t=i[e+1]+r,n=a[t],l=o[t],g=n-_,y=s[e]-(l-v),b=c[3*e],x=c[3*e+1],S=c[3*e+2];u+=b*g,d+=x*g,f+=S*g,p+=b*y,m+=x*y,h+=S*y,_=n,v=l}l[0]=u,l[1]=d,l[2]=f,l[3]=p,l[4]=m,l[5]=h}function Fn(e,t,n,r,i,a,o){let s=W.width,{pre:c,acc:l}=e,u=Math.ceil(Kn*n/G)+1;for(let n=0;n<s;n++){let d=Un+Wn*n,f=Math.max(0,Math.ceil((d-u-K)/r)-1),p=Math.min(i-1,Math.floor((d+u-K)/r)),m=Math.min(f,i),h=0,g=0,_=0,v=c[3*m],y=c[3*m+1],b=c[3*m+2];f<=p&&(Pn(e,f,p,-d-J),h=l[0],g=l[1],_=l[2],v+=l[3],y+=l[4],b+=l[5]);let x=(t*s+n)*4;a[x]=h,a[x+1]=g,a[x+2]=_,a[x+3]=1,o[x]=v,o[x+1]=y,o[x+2]=b,o[x+3]=1}}function In(e,t){let n=W.width,r=W.rows,i=Gn-J+1,a=new Float32Array(n*r*4),o=new Float32Array(n*r*4),s={gp:new Float64Array(3*(q+1)),PHI:new Float64Array(i),SPSI:new Float64Array(i),edge:new Int32Array(q+1),fb:new Float64Array(3*q),mass:new Float64Array(q),pre:new Float64Array(3*(q+1)),acc:new Float64Array(6)};jn(e,t,s.gp);for(let e=0;e<r;e++){let t=Dn(e),n=An(e);Mn(s,t);let r=Nn(s,n);Fn(s,e,t,n,r,a,o)}return{conv:a,cum:o}}function Ln(e){let t=Math.min(Math.max(e,400),700),n=qn,r=e=>{let r=1;for(let i=0;i<4;i++)i!==e&&(r*=(t-n[i])/(n[e]-n[i]));return r};return[r(0),r(1),r(2),r(3)]}function Rn(e,t){let n=new Float64Array(16);for(let r=0;r<941;r++){let i=R[r],a=z[r]*kt(e,i)*t(i),o=a*B[3*r],s=a*B[3*r+1],c=a*B[3*r+2];for(let e=0;e<4;e++){let t=Jn[4*r+e];n[4*e]+=o*t,n[4*e+1]+=s*t,n[4*e+2]+=c*t}}let r=new Float32Array(16);for(let e=0;e<4;e++)for(let t=0;t<3;t++)r[4*e+t]=n[4*e+t];return r}function zn(e){let t=1-St(480,520,e),n=St(570,610,e);return[n,1-n-t,t]}function Bn(e,t){let n=300/e,r=new Float32Array(e),i=new Float64Array(3*e),a=new Float64Array(3*e);for(let t=0;t<e;t++)r[t]=400+(t+.5)*n;for(let r=0;r<940;r++){let o=R[r],s=o+.5*L,c=Math.min(Math.max(Math.floor((s-400)/n),0),e-1),l=t(o),u=t(o+L);for(let e=0;e<3;e++){let t=B[3*r+e],n=B[3*r+3+e];i[3*c+e]+=.5*L*(t+n),a[3*c+e]+=.5*L*(l*t+u*n)}}let o=Array.from(r,e=>zn(e)),s=Array(9).fill(0);for(let t=0;t<e;t++)for(let e=0;e<3;e++)for(let n=0;n<3;n++)s[3*e+n]+=i[3*t+e]*o[t][n];let c=I(s),l=new Float32Array(9*e);for(let t=0;t<e;t++)for(let e=0;e<3;e++)for(let n=0;n<3;n++){let r=0;for(let i=0;i<3;i++)r+=a[3*t+e]*o[t][i]*c[3*i+n];l[9*t+3*n+e]=r}return{lambda:r,width:n,W:l}}var W,Vn,G,K,Hn,Un,Wn,q,J,Gn,Kn,qn,Jn;function Yn(){return(Yn=e((()=>{xt(),V(),W={lambda0:300,dLambda:2,width:512,rows:41,layers:5},Vn=.3989422804014327,G=L,K=Math.round(360/G),Hn=Math.round(W.lambda0/G),Un=Math.round((W.lambda0+.5*W.dLambda)/G),Wn=Math.round(W.dLambda/G),q=940,J=K-(Un+Wn*(W.width-1))-32,Gn=K+q+32-Hn+32,Kn=6,qn=[430,510,590,670],Jn=(()=>{let e=new Float64Array(3764);for(let t=0;t<941;t++)e.set(Ln(R[t]),4*t);return e})()})))()}function Xn(e,t){let n=Math.abs(e),r=.5*t,i=1;for(let e=1;e<=n;e++)i*=r/e;let a=i,o=r*r;for(let e=1;e<8;e++)i*=-o/(e*(e+n)),a+=i;return e<0&&(n&1)==1?-a:a}function Zn(e,t){return Math.sqrt(Math.max(1-(1-e*e)/(t*t),0))}function Qn(e,t){let n=Math.min(Math.max(e,0),1),r=Zn(n,t),i=(n-t*r)/(n+t*r),a=(t*n-r)/(t*n+r);return .5*(i*i+a*a)}function $n(e,t){let n=Math.abs(e);return n>=1?1:Qn(Math.sqrt(1-n*n),t)}function er(e){let t=5e-4,n=Math.round((Y.uMax+2*Y.halfWindow)/t)+1,r=new Float64Array(n),i=$n(0,e);for(let a=1;a<n;a++){let n=$n(a*t,e);r[a]=r[a-1]+.5*t*(i+n),i=n}let a=e=>{let i=Math.abs(e)/t,a=Math.min(Math.floor(i),n-2),o=i-a,s=r[a]*(1-o)+r[a+1]*o;return e<0?-s:s},o=Y.entries,s=Y.halfWindow,c=new Float64Array(o);for(let e=0;e<o;e++){let t=Y.uMax*e/(o-1);c[e]=(a(t+s)-a(t-s))/(2*s)}return c}function tr(e){if(e===mr&&hr)return hr;let t=pr.get(e);return t||(t=er(e),pr.set(e,t)),mr=e,hr=t,t}function nr(e,t){let n=Y.entries,r=Math.min(Math.abs(t),Y.uMax)/Y.uMax*(n-1),i=Math.min(Math.floor(r),n-2),a=r-i;return e[i]*(1-a)+e[i+1]*a}function rr(e){let{lg:t,lt:n,invD:r,depthNm:i,nc:a,lambdaNm:o,R:s}=e,c=Zn(e.ci,a),l=tr(a),u=o*r,d=u>1e-6&&Number.isFinite(u)?Math.min(Math.floor((a+Math.abs(t))/u)+1,4096):0,f=n*n,p=a*a,m=Math.PI*a*i/o,h=0,g=0;for(let e=-d;e<=d;e++){let n=e*u-t,r=n*n+f;if(r>=p)continue;let i=Math.sqrt(r),o=St(a,a-.1,i);if(o<=0)continue;let s=Math.sqrt(Math.max(1-r/p,0)),d=Xn(e,Math.min(m*(c+s),5.5)),_=o*d*d;h+=_,g+=_*nr(l,i)}return h>1e-9?e.recycle?1/(h-s*g):1/h:1}function ir(e,t){return Ct(t)*wt(t,e.tint)}function ar(e,t,n,r,i,a,o,s){let c=t.x*n+t.y*r,l=-t.x*r+t.y*n,u=Math.sqrt(Math.max(1-(t.x*t.x+t.y*t.y),0));for(let t=0;t<4;t++){let n=qn[t];o[s+t]=rr({lg:c,lt:l,ci:u,invD:1/i,depthNm:a,nc:e.nc,lambdaNm:n,R:ir(e,n),recycle:e.recycle})}}function or(e,t,n,r,i,a){let o=new Float64Array(4),s=new Float64Array(4);for(let i=0;i<8;i++){let a=i*Math.PI/8;ar(e,t,Math.cos(a),Math.sin(a),n,r,s,0);for(let e=0;e<4;e++)o[e]+=s[e]/8}for(let e=0;e<4;e++)i[a+e]=o[e]}function sr(e,t){return e.pitchesNm[Math.min(t,e.pitchesNm.length-1)]}function cr(e){return Math.floor(e.pitchesNm.length/2)}function lr(e,t){let n=e.depthsNm;return n&&n.length>0?n[Math.min(t,n.length-1)]:e.depthNm}function ur(e,t,n){let r=new Float32Array(12),i=new Float32Array(4),a,o;if(e.gAzimuthRad!==null)a=Math.cos(e.gAzimuthRad),o=Math.sin(e.gAzimuthRad);else{let e=t.x+n.x,r=t.y+n.y,i=Math.hypot(e,r),s=Math.hypot(t.x,t.y);i>1e-9?(a=e/i,o=r/i):s>1e-9?(a=t.x/s,o=t.y/s):(a=1,o=0)}for(let n=0;n<3;n++)ar(e,t,a,o,sr(e,n),lr(e,n),r,4*n);if(e.gAzimuthRad!==null)ar(e,t,a,o,sr(e,0),lr(e,0),i,0);else{let n=cr(e);or(e,t,sr(e,n),lr(e,n),i,0)}return{ord:r,mir:i}}function dr(e,t){let n=new Float32Array(4);if(e.gAzimuthRad!==null)ar(e,t,Math.cos(e.gAzimuthRad),Math.sin(e.gAzimuthRad),sr(e,0),lr(e,0),n,0);else{let r=cr(e);or(e,t,sr(e,r),lr(e,r),n,0)}return n}function fr(e,t,n,r,i=[0,0,0]){let a=_n(n,0),o=_n(n,1),s=gn(fn(r,i)),c={x:mn(s,a),y:mn(s,o)},l=new Float32Array(48).fill(1),u=new Float32Array(16).fill(1);for(let n=0;n<4;n++){if(t.type[n]===0)continue;let r=gn(fn([t.pos[3*n],t.pos[3*n+1],t.pos[3*n+2]],i)),s=ur(e,{x:mn(r,a),y:mn(r,o)},c);l.set(s.ord,12*n),u.set(s.mir,4*n)}return{ord:l,mir:u,env:dr(e,c)}}var Y,pr,mr,hr;function gr(){return(gr=e((()=>{V(),Yn(),En(),Y={uMax:1.6,entries:601,halfWindow:.03},pr=new Map,mr=NaN,hr=null})))()}var _r;function vr(){return(vr=e((()=>{_r=`uniform float uRims, uFill, uScrim, uCameraSide, uCameraTexture, uBehind;
uniform vec4 uBlobs[5];
uniform float uBlobNorm;
varying vec3 vDir;
const float ENV_DEG = 0.017453292519943295;
const float ENV_EDGE = 3.0 * ENV_DEG;
float envPanel(vec3 d, float th, float ph, float hu, float hw, out vec2 ang) {
  vec3 c  = vec3(sin(th) * cos(ph), sin(th) * sin(ph), cos(th));
  vec3 er = vec3(cos(th) * cos(ph), cos(th) * sin(ph), -sin(th));
  vec3 et = vec3(-sin(ph), cos(ph), 0.0);
  float z = dot(d, c);
  ang = vec2(1.0e3);
  if (z <= 1e-6) return 0.0;
  ang = atan(vec2(dot(d, er), dot(d, et)) / z);
  float e = 0.5 * ENV_EDGE;
  float mu = 1.0 - smoothstep(0.0, 1.0, (abs(ang.x) - (hu - e)) / (2.0 * e));
  float mw = 1.0 - smoothstep(0.0, 1.0, (abs(ang.y) - (hw - e)) / (2.0 * e));
  return mu * mw;
}
float envCameraSide(vec3 d) {
  float B = 0.0;
  for (int k = 0; k < 5; ++k) {
    float a = acos(clamp(dot(d, uBlobs[k].xyz), -1.0, 1.0)) / uBlobs[k].w;
    B = max(B, exp(-0.5 * a * a));
  }
  return (0.5 + 4.5 * B) / uBlobNorm;
}
float envStudio(vec3 d) {
  vec2 a; float m, cover = 0.0, L = 0.0;
  m = envPanel(d, 78.0 * ENV_DEG, 0.0, 2.5 * ENV_DEG, 30.0 * ENV_DEG, a);
  cover += m; L += uRims * m;
  m = envPanel(d, 78.0 * ENV_DEG, 180.0 * ENV_DEG, 2.5 * ENV_DEG, 30.0 * ENV_DEG, a);
  cover += m; L += uRims * m;
  m = envPanel(d, 62.0 * ENV_DEG, 90.0 * ENV_DEG, 30.0 * ENV_DEG, 30.0 * ENV_DEG, a);
  if (m > 0.0) { vec2 s = a / (30.0 * ENV_DEG); cover += m; L += uFill * m * (1.0 + 0.15 * (1.0 - min(dot(s, s), 1.0))); }
  m = envPanel(d, 20.0 * ENV_DEG, 90.0 * ENV_DEG, 10.0 * ENV_DEG, 25.0 * ENV_DEG, a);
  if (m > 0.0) { cover += m; L += uScrim * m * (0.75 + 0.25 * clamp(a.x / (10.0 * ENV_DEG), -1.0, 1.0)); }
  float front = L + uCameraSide * mix(1.0, envCameraSide(d), uCameraTexture) * max(1.0 - cover, 0.0);
  return mix(uBehind, front, smoothstep(-0.002, 0.002, d.z));
}
void main() {
  vec3 dx = dFdx(vDir) * 0.25, dy = dFdy(vDir) * 0.25;
  float L = 0.25 * (envStudio(normalize(vDir - dx - dy)) + envStudio(normalize(vDir + dx - dy))
                  + envStudio(normalize(vDir - dx + dy)) + envStudio(normalize(vDir + dx + dy)));
  gl_FragColor = vec4(vec3(L), 1.0);
}
`})))()}function yr(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function br(e,t){return yr((Math.imul((e|0)^1540483477,2654435761)^Math.imul(t,2246822507))>>>0)}function xr(e,t,n,r){let i=[];if(e<=0)return i;let a=Array.from({length:e},(e,t)=>t);for(let t=e-1;t>0;t--){let e=Math.floor(r()*(t+1)),n=a[t];a[t]=a[e],a[e]=n}let o=Math.log(n/t);for(let n=0;n<e;n++){let s=t*Math.exp(o*(n+r())/e),c=Math.PI*(a[n]+r())/e,l=r();l>=0&&l<1||(l=0),i.push({fx:Math.cos(c)/s,fy:Math.sin(c)/s,lambda:s,phase:l})}return i}function Sr(e){let t=e.pitchMm,n=.5*Math.max(0,e.heightUm)*.001;if(e.emboss===`none`||!(t>0)||!(n>0))return[];if(e.emboss===`lines`)return[{fx:0,fy:1/t,A:n}];let r=Math.SQRT1_2/t;return[{fx:r,fy:r,A:n},{fx:-r,fy:r,A:n}]}function Cr(e,t,n){let r=new Float32Array(128),i=Sr(t),a=Math.max(0,Number.isFinite(e.wavinessDeg)?e.wavinessDeg:0),o=Math.max(0,Number.isFinite(e.orangePeelUm)?e.orangePeelUm:0),s=a>0?Math.max(0,Math.floor(n.board)):0,c=o>0?Math.max(0,Math.floor(n.coat)):0,l=i.length;for(;s+c+l>32;)c>s?c--:s--;let u=0,d=(e,t,n,i)=>{r[4*u]=e,r[4*u+1]=t,r[4*u+2]=n,r[4*u+3]=i,u++},f=xr(s,wr[0],wr[1],br(e.seed,1));if(f.length){let e=0;for(let t of f)e+=t.lambda**(2*Er-2);let t=a*Math.PI/180/Math.sqrt(2*Math.PI*Math.PI*e);for(let e of f)d(e.fx,e.fy,t*e.lambda**Er,e.phase)}if(t.layer===`foil`)for(let e of i)d(e.fx,e.fy,e.A,0);let p=[0,u],m=xr(c,Tr[0],Tr[1],br(e.seed,2));if(m.length){let e=0;for(let t of m)e+=t.lambda**(2*Er);let t=o*.001*Math.sqrt(2/e);for(let e of m)d(e.fx,e.fy,t*e.lambda**Er,e.phase)}if(t.layer===`varnish`)for(let e of i)d(e.fx,e.fy,e.A,0);return{data:r,board:p,coat:[p[1],u-p[1]]}}var wr,Tr,Er;function Dr(){return(Dr=e((()=>{wr=[8,40],Tr=[.5,5],Er=1.5})))()}function Or(e=jr){let t=yr(e),n=[];for(let e=0;e<5;e++){let e=t(),r=2*Math.PI*t(),i=Math.sqrt(Math.max(0,1-e*e)),a=(12+13*t())*Math.PI/180;n.push([i*Math.cos(r),i*Math.sin(r),e,a])}let r=0;for(let e=0;e<96;e++){let t=(e+.5)/96,i=Math.sqrt(1-t*t);for(let e=0;e<192;e++){let a=2*Math.PI*(e+.5)/192,o=i*Math.cos(a),s=i*Math.sin(a),c=0;for(let e of n){let n=Math.acos(Math.min(1,Math.max(-1,o*e[0]+s*e[1]+t*e[2])))/e[3];c=Math.max(c,Math.exp(-.5*n*n))}r+=.5+4.5*c}}return{blobs:new Float32Array(n.flat()),norm:r/18432}}function kr(e,t){let n=-e*Math.PI/180,r=Math.cos(n),i=Math.sin(n),a=[r,-i,0,i,r,0,0,0,1],o=t?Array.from({length:9},(e,n)=>{let r=Math.floor(n/3),i=n%3;return a[3*r]*t[i]+a[3*r+1]*t[3+i]+a[3*r+2]*t[6+i]}):a;return new Float32Array([o[0],o[3],o[6],o[1],o[4],o[7],o[2],o[5],o[8]])}function Ar(e,t){return!!e&&e.rims===t.rims&&e.fill===t.fill&&e.scrim===t.scrim&&e.cameraSide===t.cameraSide&&e.cameraTexture===t.cameraTexture&&e.behind===t.behind}var jr,Mr,Nr;function Pr(){return(Pr=e((()=>{vr(),P(),Dr(),jr=20973,Mr=_r.slice(0,_r.indexOf(`void main()`)).replace(`varying vec3 vDir;
`,``),Nr=`#version 300 es
precision highp float;
precision highp int;
#define gl_FragColor pc_fragColor
layout(location = 0) out highp vec4 pc_fragColor;
${Mr}
${Je}
const float ENV_SIZE_F = ${128 .toFixed(1)};
const float ENV_MAX_LOD = ${6 .toFixed(1)};
const int SAMPLES = 192;

vec2 hammersley(int i, int n) {
  uint b = uint(i);
  b = (b << 16u) | (b >> 16u);
  b = ((b & 0x55555555u) << 1u) | ((b & 0xAAAAAAAAu) >> 1u);
  b = ((b & 0x33333333u) << 2u) | ((b & 0xCCCCCCCCu) >> 2u);
  b = ((b & 0x0F0F0F0Fu) << 4u) | ((b & 0xF0F0F0F0u) >> 4u);
  b = ((b & 0x00FF00FFu) << 8u) | ((b & 0xFF00FF00u) >> 8u);
  return vec2(float(i) / float(n), float(b) * 2.3283064365386963e-10);
}

void main() {
  float tile = floor(gl_FragCoord.y / ENV_SIZE_F);
  vec2 uv = vec2(gl_FragCoord.x, gl_FragCoord.y - tile * ENV_SIZE_F) / ENV_SIZE_F;
  vec3 n = octDecode(uv);
  if (tile < 0.5) {
    // the sharp level: 4× supersampled over the texel, as env.frag
    float h = 0.25 / ENV_SIZE_F;
    float L = 0.25 * (envStudio(octDecode(uv + vec2(-h, -h))) + envStudio(octDecode(uv + vec2(h, -h)))
                    + envStudio(octDecode(uv + vec2(-h, h))) + envStudio(octDecode(uv + vec2(h, h))));
    gl_FragColor = vec4(vec3(L), 1.0);
    return;
  }
  float r = 1.0 - sqrt(max(1.0 - tile / ENV_MAX_LOD, 0.0));   // tile = ENV_MAX_LOD·r(2 − r)
  float a = max(r * r, 1e-4);
  vec3 up = abs(n.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tx = normalize(cross(up, n)), ty = cross(n, tx);
  float sum = 0.0, wsum = 0.0;
  for (int i = 0; i < SAMPLES; ++i) {
    vec2 xi = hammersley(i, SAMPLES);
    float phi = 6.28318530718 * xi.y;
    float ct = sqrt((1.0 - xi.x) / (1.0 + (a * a - 1.0) * xi.x));
    float st = sqrt(1.0 - ct * ct);
    vec3 hv = normalize(tx * (st * cos(phi)) + ty * (st * sin(phi)) + n * ct);
    vec3 l = reflect(-n, hv);
    float nl = dot(n, l);
    if (nl <= 0.0) continue;
    sum += envStudio(l) * nl;
    wsum += nl;
  }
  gl_FragColor = vec4(vec3(sum / max(wsum, 1e-6)), 1.0);
}
`})))()}function Fr(e){let t=Kr.get(e);return t||(t=jt(e),Kr.set(e,t)),t}function Ir(e,t){let[n,r,i]=t,a=2*(e.y*i-e.z*r),o=2*(e.z*n-e.x*i),s=2*(e.x*r-e.y*n);return[n+e.w*a+(e.y*s-e.z*o),r+e.w*o+(e.z*a-e.x*s),i+e.w*s+(e.x*o-e.y*a)]}function Lr(){return{type:new Int32Array(4),pos:new Float32Array(12),u:new Float32Array(12),w:new Float32Array(12),radius:new Float32Array(4),rad:new Float32Array(4),spd:new Int32Array(4),rgb:new Float32Array(12).fill(1),key:-1,order:new Int32Array(4).fill(-1)}}function Rr(e){return Math.max(0,T.indexOf(e))}function zr(e,t,n,r,i,a){e.type[t]=1,e.pos.set(n,3*t),e.u.fill(0,3*t,3*t+3),e.w.fill(0,3*t,3*t+3),e.radius[t]=Math.max(r,1e-6),e.rad[t]=Math.max(i,0),e.spd[t]=Rr(a),e.rgb.set(Fr(a),3*t)}function Br(e,t,n,r){let i=vn(n.dir.x,n.dir.y);zr(e,t,Ir(r,[i[0]*n.distanceM,i[1]*n.distanceM,i[2]*n.distanceM]),yn(n.sizeDeg,n.distanceM),n.radiance,n.spd)}function Vr(e,t){let n=e.pos[3*t],r=e.pos[3*t+1],i=e.pos[3*t+2],a=Math.hypot(n,r,i);if(a<=0)return 0;let o=Math.min(e.radius[t]/a,.999);return e.rad[t]*Math.PI*o*o*Math.max(i/a,0)}function Hr(e,t,n){let r=[[e[0]+t[0]+n[0],e[1]+t[1]+n[1],e[2]+t[2]+n[2]],[e[0]+t[0]-n[0],e[1]+t[1]-n[1],e[2]+t[2]-n[2]],[e[0]-t[0]-n[0],e[1]-t[1]-n[1],e[2]-t[2]-n[2]],[e[0]-t[0]+n[0],e[1]-t[1]+n[1],e[2]-t[2]+n[2]]],i=[];for(let e=0;e<4;e++){let t=r[e],n=r[e+1&3];if(t[2]>=0&&i.push(t),t[2]>=0!=n[2]>=0){let e=t[2]/(t[2]-n[2]);i.push([t[0]+(n[0]-t[0])*e,t[1]+(n[1]-t[1])*e,0])}}if(i.length<3)return 0;let a=0;for(let e=0;e<i.length;e++){let t=i[e],n=i[(e+1)%i.length],r=Math.hypot(...t),o=Math.hypot(...n),s=[t[0]/r,t[1]/r,t[2]/r],c=[n[0]/o,n[1]/o,n[2]/o],l=s[1]*c[2]-s[2]*c[1],u=s[2]*c[0]-s[0]*c[2],d=s[0]*c[1]-s[1]*c[0],f=Math.hypot(l,u,d);if(f<1e-12)continue;let p=Math.atan2(f,s[0]*c[0]+s[1]*c[1]+s[2]*c[2]);a+=d/f*p}return Math.abs(a)/2}function Ur(e,t){let n=[e.pos[3*t],e.pos[3*t+1],e.pos[3*t+2]],r=[e.u[3*t],e.u[3*t+1],e.u[3*t+2]],i=[e.w[3*t],e.w[3*t+1],e.w[3*t+2]];return e.rad[t]*Hr(n,r,i)}function Wr(e,t){return e.type[t]===1?Vr(e,t):e.type[t]===2?Ur(e,t):0}function Gr(e,t,n,r,i,a=Lr()){let o=a;o.type.fill(0),o.pos.fill(0),o.u.fill(0),o.w.fill(0),o.radius.fill(0),o.rad.fill(0),o.spd.fill(0),o.rgb.fill(1);let s=e.panel;if(s.on&&s.radiance>0){let e=vn(s.dir.x,s.dir.y),t=xn(e,s.widthDeg,s.lengthDeg,s.distanceM);o.type[0]=2,o.pos.set(Ir(r,[e[0]*s.distanceM,e[1]*s.distanceM,e[2]*s.distanceM]),0),o.u.set(Ir(r,t.U),0),o.w.set(Ir(r,t.W),0),o.rad[0]=s.radiance,o.spd[0]=Rr(s.spd),o.rgb.set(Fr(s.spd),0)}e.spotA.on&&e.spotA.radiance>0&&Br(o,1,e.spotA,r),e.spotB.on&&e.spotB.radiance>0&&Br(o,2,e.spotB,r);let c=e.flash;if(t.mode===`flash`)c.radiance>0&&zr(o,3,i,c.sizeMm/2e3,c.radiance,c.spd);else if(t.mode===`light`){if(c.radiance>0){let e=vn(t.pad.x,t.pad.y);zr(o,3,[e[0]*c.distanceM,e[1]*c.distanceM,e[2]*c.distanceM],c.sizeMm/2e3,c.radiance,c.spd)}}else e.spotC.on&&e.spotC.radiance>0&&Br(o,3,e.spotC,r);let l=-1,u=0,d=[];for(let e=0;e<4;e++){if(o.type[e]===0)continue;d.push(e);let t=Wr(o,e);t>u&&(u=t,l=e)}return o.key=l,d.sort((e,t)=>o.type[e]-o.type[t]||o.rad[t]-o.rad[e]||e-t),o.order.fill(-1),d.forEach((e,t)=>{o.order[t]=e}),o}var Kr;function qr(){return(qr=e((()=>{En(),V(),E(),Kr=new Map})))()}function Jr(e,t){let n=e*Math.PI/360,r=t*Math.PI/360,i=Math.sin(n),a=Math.cos(n),o=Math.sin(r),s=Math.cos(r);return{x:-i*s,y:-a*o,z:-i*o,w:a*s}}function Yr(e,t){return{rx:.45*t*Math.sin(.53*e),ry:t*Math.sin(.37*e+1.1)}}var Xr;function Zr(){return(Zr=e((()=>{Xr=class{stiffness;damping;mass;rx=0;ry=0;vx=0;vy=0;started=!1;constructor(e=190,t=22,n=1){this.stiffness=e,this.damping=t,this.mass=n}step(e,t){if(!this.started){this.rx=e.rx,this.ry=e.ry,this.started=!0;return}let n=Math.max(1,Math.ceil(t/(1/240))),r=t/n;for(let t=0;t<n;t++){let t=(-this.stiffness*(this.rx-e.rx)-this.damping*this.vx)/this.mass,n=(-this.stiffness*(this.ry-e.ry)-this.damping*this.vy)/this.mass;this.vx+=t*r,this.vy+=n*r,this.rx+=this.vx*r,this.ry+=this.vy*r}}snap(e){this.rx=e.rx,this.ry=e.ry,this.vx=0,this.vy=0,this.started=!0}}})))()}function Qr(e,t){return!e||e.type!==t.type?!1:e.type===`clear`||e.edgeNm===t.edgeNm&&e.widthNm===t.widthNm&&e.floor===t.floor}var X,$r,ei;function ti(){return(ti=e((()=>{E(),y(),V(),Yn(),X={width:W.width,rows:W.rows,layers:W.layers,height:W.rows*W.layers,imageWidth:3*W.width,imageHeight:2*W.rows*W.layers},$r={type:`clear`,edgeNm:550,widthNm:50,floor:1},ei=class{bytes=new Uint8ClampedArray(X.imageWidth*X.imageHeight*4).fill(255);specProj=new Float32Array(16*T.length);bins={6:{lambda:new Float32Array(6),W:new Float32Array(54),width:50},8:{lambda:new Float32Array(8),W:new Float32Array(72),width:37.5}};version=0;built=new Set([0]);tint=null;rho=Tt($r);constructor(e=$r){this.setTint(e)}setTint(e){if(!Qr(this.tint,e)){this.tint={...e},this.rho=Tt(this.tint),T.forEach((e,t)=>{this.specProj.set(Rn(e,this.rho),16*t)});for(let e of[6,8]){let t=Bn(e,this.rho);this.bins[e].lambda.set(t.lambda),this.bins[e].W.set(t.W),this.bins[e].width=t.width}for(let e of this.built)this.buildLayer(e);this.version++}}ensureLayer(e){let t=T.indexOf(e);t<0||this.built.has(t)||(this.built.add(t),this.buildLayer(t),this.version++)}buildLayer(e){let{conv:t,cum:n}=In(T[e],this.rho);this.writeRows(t,e*X.rows),this.writeRows(n,X.height+e*X.rows)}writeRows(e,t){let n=X.width;for(let r=0;r<X.rows;r++){let i=(X.imageHeight-1-(t+r))*X.imageWidth*4;for(let t=0;t<n;t++)for(let a=0;a<3;a++)h(e[(r*n+t)*4+a],this.bytes,i+(3*t+a)*4)}}}})))()}function ni(e){try{let t=e.getExtension(`WEBGL_debug_renderer_info`),n=t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):null;if(typeof n==`string`&&n.length>0)return n}catch{}let t=e.getParameter(e.RENDERER);return typeof t==`string`?t:``}function ri(e){let t=typeof matchMedia==`function`&&matchMedia(`(pointer: coarse)`).matches,n=typeof navigator<`u`&&navigator.maxTouchPoints>0,r=typeof screen<`u`&&Math.min(screen.width,screen.height)<900;return t&&n&&r?`low`:ii.test(ni(e))?`high`:`medium`}var ii,ai;function oi(){return(oi=e((()=>{ii=/NVIDIA|GeForce|RTX|Quadro|Radeon RX|Radeon Pro|Arc A|Apple M\d|Apple GPU/i,ai={high:{tier:`high`,glareLevels:5,glareStartDiv:2,waves:{board:8,coat:16},defines:{RECT_EXACT:1,RECT_LTC:1,NB:8,IBL_ORDERS:1,DISCRETE_LIGHTS:4,DISCRETE_LIGHTS_B:2,FLAKE_ENV:1,WEAR_CELLS:3},trips:{maxOrder:3,ghB:4,vorR:2,flakeR:1,bCells:3,bBins:5,bLevels:2}},medium:{tier:`medium`,glareLevels:4,glareStartDiv:2,waves:{board:6,coat:8},defines:{RECT_EXACT:1,RECT_LTC:1,NB:6,IBL_ORDERS:1,DISCRETE_LIGHTS:4,DISCRETE_LIGHTS_B:2,FLAKE_ENV:1,WEAR_CELLS:3},trips:{maxOrder:2,ghB:4,vorR:2,flakeR:0,bCells:3,bBins:3,bLevels:2}},low:{tier:`low`,glareLevels:3,glareStartDiv:4,waves:{board:2,coat:2},defines:{RECT_EXACT:0,RECT_LTC:0,NB:0,IBL_ORDERS:0,DISCRETE_LIGHTS:2,DISCRETE_LIGHTS_B:1,FLAKE_ENV:0,WEAR_CELLS:2},trips:{maxOrder:2,ghB:2,vorR:1,flakeR:0,bCells:2,bBins:2,bLevels:1}}}})))()}function si(e){let t={...gi},n=Array.isArray(e)?e:e?[e]:[];for(let e of n)e&&typeof e==`object`&&ui(t,e);return t}function ci(e){let t={},n=(e,...n)=>{if(e!==void 0)for(let r of n)t[r]=e};if(n(e.exposure,`display.ev`),n(e.tone,`display.tone`),n(e.glare,`display.glare`),e.grain!==void 0&&(t[`grain.amount`]=e.grain,t[`grain.on`]=e.grain===null?null:e.grain>0),n(e.studio,`studio.preset`),e.background!==void 0){let n=e.background?.trim()??null;n===null||n===`black`||n===`white`?(t[`scene.background`]=n,t[`scene.bgColor`]=null):(t[`scene.background`]=`colour`,t[`scene.bgColor`]=n)}return n(e.bow,`card.bow`),n(e.pose&&{x:e.pose.x,y:e.pose.y},`motion.pose`),n(e.lens,`dof.lens`),n(e.pointer,`motion.pointer`),n(e.tiltRange,`motion.tiltRange`),n(e.wobble,`motion.wobble`),n(e.wobbleAmp,`motion.wobbleAmp`),t}function li(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e[n],t=Math.imul(t,16777619);return(t>>>0).toString(16)}function ui(e,t){let n={},r={...e.settings};if(se(t)){r={};let i=t.material;i!==void 0&&(cn(i)?e.material=i:D(`HoloEffect: the Copy settings' material "${i}" is not supported (one of ${sn.join(`, `)}); keeping "${e.material}".`));let a=t.entity;a!==void 0&&!bi.has(String(a))&&D(`HoloEffect: a holo.spot Copy settings of the "${String(a)}" object is drawn as a flat card (HoloEffect draws holo.spot's card, 3D object look and paper card, not its cloth, stickers or flag).`);for(let[e,r]of Object.entries(t.values))(e===`emboss.logo`||e===`emboss.print`)&&typeof r==`string`&&/^(\/logos\/|asset:)/.test(r.trim())?D(`HoloEffect: ${e} "${r}" of a holo.spot Copy settings is holo.spot's own image, which HoloEffect does not include; ignored. Set ${e} to an image or a URL.`):xi.has(e)?D(`HoloEffect: ${e} of a holo.spot Copy settings is in mm on holo.spot's card; ignored (HoloEffect's is in CSS px).`):wi(r)&&(n[e]=r);let o=t.pose;o&&typeof o.rx==`number`&&typeof o.ry==`number`&&(n[`motion.pose`]={x:o.ry,y:o.rx});let s=t.values[`object.structureScale`];typeof s==`number`&&(e.structureScale=s)}else{let{settings:r,...i}=t;se(r)?D("HoloEffect: a holo.spot Copy settings blob goes in `holo` itself (`holo: blob`, or an element of the list), not in `settings`; ignored."):r&&Object.assign(n,r),Object.assign(n,ci(i));for(let[t,n]of Object.entries(i))vi.has(t)?n!==void 0&&(e[t]=n):yi.has(t)||D(`HoloEffect: unknown key "${t}" in holo; ignored.${t in _i?` ${t} is a param of its own: { holo, ${t} }.`:``}`)}let i=n[`studio.preset`];typeof i==`string`&&ie[i]&&Object.assign(r,ie[i]);for(let[e,t]of Object.entries(S)){let i=n[e];typeof i==`string`&&t[i]&&Object.assign(r,t[i])}for(let[e,t]of Object.entries(n))t===null?delete r[e]:t!==void 0&&(r[e]=t);e.settings=Object.freeze(r)}function di(e,t,n){let r={};for(let[,t]of e)Object.assign(r,t.values);let i=e[0][1].pose;return r[`motion.pose`]={x:i.ry,y:i.rx},Object.freeze({...n?{material:n}:{},quality:t,settings:Object.freeze(r)})}function fi(e){return!(e>0)||e===62?22:2*Math.atan(12/e)*180/Math.PI}function pi(e,t){let n=(1/Oi-1)/2;return[Math.ceil(e*n),Math.ceil(t*n)]}function mi(e,t,n){if(!e.on||!(e.amount>0))return{uGrain:0,uGrainCell:1,uGrainSeed:0,uGrainRgb:0,uGrainBg:0};let r=e.animated?(n*120%512+512)%512:0;return{uGrain:e.amount,uGrainCell:Math.max(e.sizePx*(t>0?t:1),1),uGrainSeed:Number.isFinite(r)?r:0,uGrainRgb:+(e.colour===`rgb`),uGrainBg:+!!e.onBackground}}function hi(e,t=new Float32Array(9)){return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],t}var gi,_i,vi,yi,bi,xi,Si,Ci,wi,Ti,Ei,Di,Oi,ki,Ai,ji,Mi,Ni,Pi,Fi,Ii,Z;function Li(){return(Li=e((()=>{u(),x(),C(),re(),Rt(),ae(),qt(),Yt(),nn(),dn(),En(),gr(),Pr(),qr(),Zr(),Dr(),Te(),P(),ti(),y(),oi(),E(),gi={material:`prism`,settings:{},quality:`medium`,structureScale:1},_i={holo:[],sourceChannel:`alpha`,ink:0,flat:!1,sizeMm:null,antialias:!0},vi=new Set([`material`,`quality`,`structureScale`]),yi=new Set([`exposure`,`tone`,`glare`,`grain`,`studio`,`background`,`bow`,`pose`,`lens`,`pointer`,`tiltRange`,`wobble`,`wobbleAmp`]),bi=new Set([`card`,`object`,`image`,`plain`]),xi=new Set([`emboss.x`,`emboss.y`,`emboss.width`]),Si=e=>typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement,Ci=e=>typeof e==`string`&&e.trim()!==``||!!e&&typeof e==`object`,wi=e=>typeof e==`number`||typeof e==`boolean`||typeof e==`string`||!!e&&typeof e==`object`&&typeof e.x==`number`&&typeof e.y==`number`,Ti=e=>Object.entries(b[e]).filter(([e])=>e!==`emboss`),Ei=25.4/96,Di=new Set(sn),Oi=.7,ki={alpha:0,luminance:1,none:2},Ai=new Float32Array(128),ji={neutral:0,agx:1,clamp:2},Mi=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uBytes;
uniform int uRowOffset;
out vec4 outColor;
${v}
void main() {
    ivec2 t = ivec2(gl_FragCoord.xy);
    int y = t.y + uRowOffset;
    outColor = vec4(
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x + 1, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x + 2, y), 0).rgb),
        1.0);
}
`,Ni=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${v}
${tn}`,Pi=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,Fi=Jt.slice(0,Jt.indexOf(`void main()`)).replace(`varying vec2 vUv;
`,``),Ii=`${M}
${Oe}
${Fi}
in vec2 uv;
in vec2 uvContent;
in vec2 uvSrc;
uniform sampler2D src;
uniform sampler2D uBase;   // 3d view: the element mapped onto the card
uniform int uMask;
uniform int uPersp;
void main() {
  // flat view: the card target covers the element; 3d view: the whole (grown) output
  vec2 hu = uPersp == 1 ? uv : uvContent;
  vec4 s = uPersp == 1 ? (uMask == 1 ? texture(uBase, uv) : vec4(0.0)) : texture(src, uvSrc);
  if (uPersp == 0 && (uvContent.x < 0.0 || uvContent.x > 1.0 || uvContent.y < 0.0 || uvContent.y > 1.0)) {
    gl_FragColor = s;
    return;
  }
  vec4 P = textureLod(tHdr, clamp(hu, 0.0, 1.0), 0.0);
  float a = clamp(P.a, 0.0, 1.0); vec3 c = vec3(0.0);
  if (a > 1e-5) { vec3 cu = P.rgb / a; c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4)); }
  vec3 G = uGW0 * textureLod(tG0, hu * uG0Scale, 0.0).rgb;   // premultiplied linear glare
  vec3 card  = toDisplay(((1.0 - uGlare) * c + uGlare * G) * uExposure);
  vec3 spill = toDisplay(uGlare * G * uExposure);
  // The foil's coverage (the mask, applied by the material pass) is the card target's alpha, then the foil goes over
  // what is left of the element (luma mask) with the glare spill on it. holospot screens the spill onto the page: in
  // premultiplied output that is the spill with alpha = its largest channel (exact on black, invisible on white).
  float cov = a;
  vec4 base = uMask == 1 ? s : vec4(0.0);
  vec3 se = srgbOETF(spill);
  vec4 spillP = vec4(se, max3(se));
  base = spillP + (1.0 - spillP.a) * base;
  vec3 enc = srgbOETF(card);
  // A4.1 film grain in display space, after the tone curve and before the dither (output.frag).
  if (uGrain > 0.0) {
    vec2 fc = gl_FragCoord.xy;
    vec3 n = uGrainRgb == 1
      ? vec3(grainNoise(fc, uGrainSeed), grainNoise(fc, uGrainSeed + 171.0), grainNoise(fc, uGrainSeed + 342.0))
      : vec3(grainNoise(fc, uGrainSeed));
    enc += uGrain * n;
    if (uGrainBg == 1) base.rgb = clamp(base.rgb + uGrain * n * base.a, 0.0, 1.0);
  }
  if (cov > 0.0 || max3(spill) > 1e-4) enc += triangularDither(gl_FragCoord.xy) / 255.0;
  gl_FragColor = vec4(clamp(enc, 0.0, 1.0), 1.0) * cov + base * (1.0 - cov);
}
`,Z=class{params;#e={...gi};#t=Symbol(`unseen`);#n=null;#r=null;#i=null;#a=!0;#o=null;#s=-1;#c=null;#l=null;#u=null;#d=null;#f=null;#p=null;#m=new Float32Array(16);#h=null;#g=null;#_=null;#v=null;#y=null;#b=!1;#x=new Kt;#S=null;#C=null;#w=[1.28,1.28,1/800,1];#T=-1;#E=null;#D=-1;#O=null;#k=Or();#A=null;#j=!1;#M=new Xr;#N=Lr();#P=new Float32Array(12);#F=new Float32Array(9);#I=new Float32Array(9);#L=[0,0,.4];#R=[63,88];#z=[238,333];#B=[63,88];#V=new Float32Array([1,0,0,0,1,0,0,0,1]);#H=null;#U=null;#W={};#G=new Float32Array(8);#K=new Float32Array(72);#q=``;#J=null;#Y=!1;#X=!1;constructor(e={}){this.params={..._i,...e},this.#Z()}setParams(e){Object.assign(this.params,e),this.#Z()}get material(){return this.#Z(),this.#e.material}#Z(){let e=this.params.holo;e!==this.#t&&(this.#t=e,this.#e=si(e),this.#a=!0,this.#he=null,this.#Te++),this.params.sourceChannel!==this.#n&&(this.#n=this.params.sourceChannel,this.#a=!0)}get ready(){return this.#Z(),this.#ee()?Promise.resolve():new Promise(e=>this.#Q.push(e))}get errors(){return[...this.#pe?[this.#pe]:[],...this.#S?.errors??[],...this.#Le?[this.#Le]:[]]}#Q=[];#$=!1;#ee(){return this.#$&&!this.#a&&(this.#fe?.id===this.#e.material||this.#he===this.#e.material)&&(this.#e.material!==`emboss`||!this.#S?.busy&&!this.#Ie&&!this.#De)}#te(){if(this.#Q.length>0&&this.#ee()){let e=this.#Q;this.#Q=[];for(let t of e)t()}}static looks=Object.freeze({card:di(Ti(`card`),`medium`),object:di(Ti(`object`),`low`),image:di([[`emboss`,b.card.emboss]],`medium`,`emboss`)});static startingPoints=Object.freeze(Object.fromEntries(Object.entries(Lt).map(([e,t])=>[e,Object.freeze(Object.fromEntries(Object.entries(t).map(([t,n])=>[t,Object.freeze({material:e,settings:Object.freeze({...n})})])))])));static settingSpecs(e){let t=t=>t.startsWith(`${e}.`),n=e=>!Di.has(e.split(`.`)[0]),r=ne.filter(e=>t(e.id)||n(e.id));return[...r.filter(e=>t(e.id)),...r.filter(e=>!t(e.id))]}resolvedSettings(){this.#Z();let e=fe(this.#e.material,`plain`,this.#e.settings);return{...e.values,"motion.pose":{x:e.pose.ry,y:e.pose.rx}}}#ne=null;#re(){let e=this.#e.quality,t=e===`auto`?this.#ne??`medium`:e;return ai[t]??ai.medium}#ie=null;static preload(...e){return Promise.all(e.map(an)).then(()=>{})}#ae=0;async init(e){let t=++this.#ae;this.#Z(),await this.#ge(this.#e.material),t===this.#ae&&(this.#ie=e.onContextRestored(()=>{this.#ne=ri(e.gl),this.#s=-1,this.#b=!1,this.#j=!1,this.#O=null,this.#T=this.#D=-1,this.#we=``,this.#Oe=!1,this.#ke++}),this.#oe(e))}#oe(e){this.#ne=ri(e.gl),this.#a=!0,this.#o=new ei;let t=this.#ue(X.imageWidth,X.imageHeight);this.#c=t,this.#l=e.wrapTexture(t,{autoUpdate:!1,filter:`nearest`});let n={size:[X.width,X.height],float:!0,filter:`linear`};this.#u=e.createRenderTarget(n),this.#d=e.createRenderTarget(n),this.#ce(e),this.#h=e.createRenderTarget({size:[1,1],float:!0});let r=this.#ue(H.width,H.height);this.#de(r)?.putImageData(new ImageData(en(),H.width,H.height),0,0),this.#_=e.wrapTexture(r,{autoUpdate:!1,filter:`nearest`});let i={size:[64,64],float:!0,filter:`linear`};this.#v=e.createRenderTarget(i),this.#y=e.createRenderTarget(i),this.#g=e.createRenderTarget({size:[128,896],float:!0,filter:`linear`})}#se=1;#ce(e){let t=this.params.antialias?4:1;this.#f&&this.#se===t||(this.#f?.dispose(),this.#p?.dispose(),this.#p=null,this.#f=e.createRenderTarget({float:!0,filter:`nearest`,samples:t}),this.#se=t)}#le(e){return this.#p??=e.createRenderTarget({samples:this.#se}),this.#p}outputRect(e){if(this.params.flat)return;let[t,n]=e.elementPixel,[r,i]=pi(t,n);return[-r,-i,t+2*r,n+2*i]}#ue(e,t){let n=typeof document<`u`?document.createElement(`canvas`):new OffscreenCanvas(e,t);return n.width=e,n.height=t,n}#de(e){return e.getContext(`2d`)}#fe=null;#pe=null;#me=null;#he=null;#ge(e){if(this.#me?.m===e)return this.#me.p;let t=an(e).then(()=>{this.#pe=null,this.#he=null},t=>{this.#he=e,this.#pe=`HoloEffect: could not load the "${e}" material: ${t instanceof Error?t.message:String(t)}`,console.warn(this.#pe)}).finally(()=>{this.#me?.p===t&&(this.#me=null),this.#a=!0});return this.#me={m:e,p:t},t}#_e(){let e=this.#e,t=rn(e.material);if(!t&&(this.#he!==e.material&&this.#ge(e.material),t=this.#fe??void 0,!t))return;this.#fe=t,this.#r=fe(t.id,`plain`,e.settings),this.#i=_e(this.#r.values),this.#W=t.uniforms(this.#r.values),this.#o?.setTint(t.gratingSummary(this.#r.values).tint);let n=this.#re(),r=this.#i.card;this.#A=Cr(t.relief(this.#r.values),{emboss:r.emboss,pitchMm:r.embossPitchMm,heightUm:r.embossHeightUm,layer:r.embossLayer},n.waves),this.#q=Ke({...n.defines,...t.defines(n),[`MATERIAL_${t.id.toUpperCase()}`]:1,...this.#Se()?{HOLO_CLEAR_PAPER:1}:{},NSPD:5,MAX_LIGHTS:4,DEBUG_VIEW:0},t.extraChunks,t.fragmentMain),this.#a=!1}#ve(e,t,n){let r=1/n,i=.1*t,a=10*t,o=(a+i)/(i-a),s=2*a*i/(i-a),c=this.#m;c.fill(0),c[0]=r/e,c[5]=r,c[10]=o,c[11]=-1,c[14]=o*-t+s,c[15]=t}update(e){this.#Z(),(this.#a||!this.#r)&&this.#_e();let t=this.#r,n=this.#i;if(!t||!n)return;let[r,i]=e.dims.element,a=Math.max(e.dims.elementPixel[0],1),o=Math.max(e.dims.elementPixel[1],1),s=Math.max(r,1),c=Math.max(i,1),l=this.params.sizeMm,u=(l!==null&&Number.isFinite(l)&&l>0?l:Math.max(s,c)*Ei)/Math.max(s,c);this.#R=[s*u,c*u],this.#z=[s,c];let d=Math.min(Math.max(this.#e.structureScale||1,.25),4);this.#B=[s*u*d,c*u*d];let f=fi(n.lensMm),p=Math.tan(f*Math.PI/360),m=!this.params.flat,h=Sn(s/c,this.#R[0]/2e3,this.#R[1]/2e3,f);if(m){let[e,t]=pi(a,o),n=o+2*t;h=this.#R[1]/2e3/p*(n/Math.max(o,1)),this.#ve((a+2*e)/Math.max(n,1),h,p)}this.#L=[0,0,h],this.#J?(e.mouseViewport[0]!==this.#J[0]||e.mouseViewport[1]!==this.#J[1])&&(this.#Y=!0):this.#J=e.mouseViewport;let g=e.mouse[0]/Math.max(a,1)*2-1,_=e.mouse[1]/Math.max(o,1)*2-1,v=this.#Y&&Math.abs(g)<=1&&Math.abs(_)<=1,y=n.motion,b=Math.min(Math.max(e.deltaTime,0),.1),x={rx:t.pose.rx,ry:t.pose.ry};if(y.pointer===`tilt`&&v)x={rx:t.pose.rx-_*y.tiltRangeDeg,ry:t.pose.ry+g*y.tiltRangeDeg};else if(y.wobble){let n=Yr(e.time,y.wobbleAmpDeg);x={rx:t.pose.rx+n.rx,ry:t.pose.ry+n.ry}}this.#M.step(x,b);let S=Cn(this.#M.rx,this.#M.ry,0),C=m?S:[1,0,0,0,1,0,0,0,1],w=m?{x:0,y:0,z:0,w:1}:Jr(this.#M.rx,this.#M.ry);this.#H=m?null:S,this.#X&&(this.#I.set(this.#F),this.#P.set(this.#N.pos)),hi(C,this.#F),hi(C,this.#V);let ee=v?{x:g,y:_}:{x:0,y:0};Gr(n.studio,{mode:y.pointer===`none`?`tilt`:y.pointer,pad:ee},n.background,w,this.#L,this.#N);for(let e=0;e<4;e++)this.#N.type[e]!==0&&this.#o?.ensureLayer(T[this.#N.spd[e]]??`equal`);this.#X||=(this.#I.set(this.#F),this.#P.set(this.#N.pos),!0);let te=this.#fe?.emboss;if(te){this.#S??=te.createAssets();let e=t.values[`emboss.logo`];e!==`element`&&(this.#Ae=``,(this.#De||this.#Oe)&&(this.#De=!1,this.#Oe=!1,this.#ke++,this.#we=``,this.#Ee=0),this.#S.setLogo(e,this.#be(`ink`))),this.#S.setPaper(te.paperKey(t.values))}this.#U=fr(this.#fe.gratingSummary(t.values),this.#N,C,this.#L)}render(e){let t=this.#o,n=this.#i;if(!t||!n||!this.#f||!this.#u||!this.#d||!this.#h||!this.#l||!this.#U){e.blit(e.src,e.target);return}if(this.#ce(e),this.#j||=(e.draw({frag:Pi,vert:N,target:this.#h}),!0),!this.#b&&this.#_&&this.#v&&this.#y){for(let[t,n]of[[this.#v,0],[this.#y,64]])e.draw({frag:Ni,vert:N,target:t,uniforms:{uBytes:this.#_,uRowOffset:n}});this.#b=!0}this.#s!==t.version&&this.#Ue(e,t);let r=ye(n.background,n.bgColor),i=Tn(n.studio.ambient,r);this.#g&&!Ar(this.#O,i)&&(e.draw({frag:Nr,vert:N,target:this.#g,uniforms:{uRims:i.rims,uFill:i.fill,uScrim:i.scrim,uCameraSide:i.cameraSide,uCameraTexture:i.cameraTexture,uBehind:i.behind,uBlobs:this.#k.blobs,uBlobNorm:this.#k.norm}}),this.#O=i);let a=this.#A,o=this.#re(),s=o.trips,c=this.#N,l=t.bins[o.defines.NB===6?6:8],u=this.#G.fill(0);u.set(l.lambda);let d=this.#K.fill(0);d.set(l.W);let f=this.#fe?.emboss?this.#Be(e):{},p=!this.params.flat,m={uCardRot:this.#F,uPrevCardRot:this.#I,uCardSizeMm:this.#B,uCardWorldMm:this.#R,uVisRot:this.#V,uViewProj:this.#m,uPersp:+!!p},h=this.#fe?.id===`emboss`?ki.none:ki[this.params.sourceChannel]??0;if(p&&(e.clear(this.#f),h===1)){let t=this.#le(e);e.clear(t),e.draw({frag:$e,vert:Qe,target:t,uniforms:{...m,src:e.src}})}e.draw({frag:this.#q,vert:Qe,target:this.#f,uniforms:{...this.#W,...f,...m,cameraPosition:[...this.#L],uWrapMm:[0,0],uBowMm:n.card.bowMm,uBowAxis:+(n.card.bowAxis===`along`),uLightType:c.type,uLightOrder:c.order,uLightPos:c.pos,uPrevLightPos:this.#P,uLightU:c.u,uLightW:c.w,uLightRadius:c.radius,uLightRad:c.rad,uLightSpd:c.spd,uLightRGB:c.rgb,uEtaOrd:this.#U.ord,uEtaMir:this.#U.mir,uEtaEnv:this.#U.env,uKeyLight:c.key,uMaxOrder:s.maxOrder,uGhB:s.ghB,uVorR:s.vorR,uFlakeR:s.flakeR,uBCells:s.bCells,uBBins:s.bBins,uBLevels:s.bLevels,uEnv:this.#g??this.#h,uEnvMaxLod:6,uEnvIntensity:1,uEnvRot:kr(n.studio.ambient.rotationDeg,this.#H??void 0),uEnvUniform:0,uCmfConv:this.#u,uCmfCum:this.#d,uSpecProj:t.specProj,uBinLam:u,uBinW:d,uBinWidth:l.width,uLtc1:this.#v??this.#h,uLtc2:this.#y??this.#h,uWave:a?.data??Ai,uWaveBoard:a?.board??[0,0],uWaveCoat:a?.coat??[0,0],uBumpMode:0,uBumpMom:this.#h,uBumpCross:this.#h,uBumpScale:[1,1],uBumpK:[0,0],uWear:n.card.wear,uDebugLight:1,uPrintSrc:e.src,uMask:h,uInk:Math.min(Math.max(this.params.ink,0),1)}});let g=this.#f.width,_=this.#f.height,v=o.glareStartDiv,y=0,b=n.display.glare;b>0&&(this.#x.ensure(e,g,_,o.glareLevels,v),y=this.#x.render(e,this.#f,g,_,v,n.display.glareRadiusPx,e.pixelRatio));let x=b>0?this.#x.level0:null;e.draw({frag:Ii,target:e.target,uniforms:{tHdr:this.#f,src:e.src,uExposure:be(n.display.ev,r),uTone:ji[n.display.tone],uP3:0,uMask:h,uPersp:+!!p,uBase:p&&h===1&&this.#p||this.#h,tG0:x??this.#h,uGW0:y,uGlare:x?b:0,uG0Scale:x?this.#x.outputScale(g,_,v):[1,1],...mi(n.grain,e.pixelRatio,e.time)}}),this.#$=!0,this.#te()}#ye(){let e=this.#r?.values??{},t=t=>{let n=e[t];return typeof n==`number`&&Number.isFinite(n)?n:null},[n,r]=this.#z,i=this.#B[0]/Math.max(n,1),a=t(`emboss.x`)??n/2,o=t(`emboss.y`)??r/2,s=t(`emboss.width`)??(e[`emboss.logo`]===`element`?n:n*36/63),c=(t(`emboss.rotation`)??0)*Math.PI/180;return{uLogoXf:[(a-n/2)*i,(r/2-o)*i,Math.cos(c),Math.sin(c)],uLogoW:Math.max(s,1)*i}}#be(e){let t=this.#r?.values[`emboss.threshold`];return{frame:e,read:this.params.sourceChannel===`luminance`?`luma`:`auto`,threshold:typeof t==`number`?t:.5}}#xe(){let e=this.#be(`full`);return`${e.read}|${e.threshold}`}#Se(){let e=this.#r?.values;return this.#fe?.id===`emboss`&&e?.[`emboss.logo`]===`element`&&!Ci(e[`emboss.print`])&&this.#e.settings[`emboss.paperColour`]===void 0}#Ce=null;#we=``;#Te=0;#Ee=0;#De=!1;#Oe=!1;#ke=0;#Ae=``;#je(e){let[t,n]=e.dims.elementPixel,r=Math.min(1,1024/Math.max(t,n,1)),i=Math.max(1,Math.round(t*r)),a=Math.max(1,Math.round(n*r)),s=`${i}x${a}|${this.#Te}|${this.#xe()}`;if(s===this.#we||this.#Oe)return;this.#De=!0,this.#Ce&&this.#Ce.width===i&&this.#Ce.height===a||(this.#Ce?.dispose(),this.#Ce=e.createRenderTarget({size:[i,a]})),o(e,this.#Ce),this.#Oe=!0;let c=this.#ke;e.readPixels(this.#Ce,{flipY:!0}).then(e=>{c===this.#ke&&(this.#Oe=!1,this.#Me(e,i,a,s))},()=>{c===this.#ke&&(this.#Oe=!1)})}#Me(e,t,n,r){let i=new Uint8ClampedArray(t*n*4),a=!1;for(let r=0;r<t*n*4;r+=4){let t=e[r+3],n=t>0?255/t:0;i[r]=e[r]*n,i[r+1]=e[r+1]*n,i[r+2]=e[r+2]*n,i[r+3]=t,a||=t>8}if(!a&&++this.#Ee<120)return;this.#we=r,this.#Ee=0,this.#De=!1;let o=`${t}x${n}|${this.#xe()}|${li(i)}`,s=this.#S;if(!s||o===this.#Ae)return;this.#Ae=o;let c=this.#ue(t,n);this.#de(c)?.putImageData(new ImageData(i,t,n),0,0),s.setLogo(a?c:``,this.#be(`full`))}#Ne=``;#Pe=null;#Fe=null;#Ie=!1;#Le=null;#Re=0;#ze(e){let t=this.#r?.values[`emboss.print`]??``;if(t!==this.#Ne){this.#Ne=t;let e=++this.#Re;this.#Fe?.dispose(),this.#Fe=null,this.#Pe=null,this.#Le=null,this.#Ie=!1;let n=null;if(typeof t==`string`&&t.trim()!==``?(n=new Image,n.crossOrigin=`anonymous`,n.src=t.trim()):Si(t)&&!(t.complete&&t.naturalWidth>0)?n=t:Ci(t)&&(this.#Pe=t),n){let r=n,i=typeof t==`string`?` ${t}`:``;this.#Ie=!0,r.decode().then(()=>{e===this.#Re&&(this.#Pe=r,this.#Ie=!1)},t=>{e===this.#Re&&(this.#Le=`HoloEffect: could not load emboss.print${i}: ${(t instanceof Error?t.message:String(t)).replace(/\.$/,``)}. A cross-origin image needs CORS.`,console.warn(this.#Le),this.#Ie=!1)})}}let n=this.#Pe;n&&!this.#Fe&&(this.#Fe=e.wrapTexture(n,{autoUpdate:!1}));let r=this.#r?.values??{},i=typeof r[`emboss.printInk`]==`number`?r[`emboss.printInk`]:1,a=[(Ci(t)?this.#Fe:r[`emboss.logo`]!==`element`)?1:0,Math.min(Math.max(i,0),1),0,0];if(!n||!this.#Fe)return{uPrintK:a,uPrintOwn:0,uPrintImg:this.#h??e.src,uPrintRect:[0,0,1,1]};let o=Si(n)?n.naturalWidth:n.width,s=Si(n)?n.naturalHeight:n.height,c=this.#z[0]/Math.max(this.#z[1],1),l=o/Math.max(s,1),u=l>c?c/l:1,d=l>c?1:l/c;return{uPrintK:a,uPrintOwn:1,uPrintImg:this.#Fe,uPrintRect:[(1-u)/2,(1-d)/2,u,d]}}#Be(e){let t=this.#S,n=this.#h;if(!t||!n)return{};this.#r?.values[`emboss.logo`]===`element`&&this.#je(e);let r=this.#ze(e);if(t.logoVersion!==this.#T){this.#T=t.logoVersion;let n=t.logo;if(n){let{w:t,h:r}=n.image;this.#C&&this.#C.width===t&&this.#C.height===r||(this.#C?.dispose(),this.#C=e.createRenderTarget({size:[t,r],float:!0,filter:`linear`,mipmap:!0,wrap:`clamp`})),this.#Ve(e,n.image,this.#C),this.#w=n.map}else this.#C?.dispose(),this.#C=null}if(t.paperVersion!==this.#D&&t.paper){this.#D=t.paperVersion;let n=t.paper.mom.w,r={size:[n,n],float:!0,filter:`linear`,mipmap:!0,wrap:`repeat`};this.#E??={mom:e.createRenderTarget(r),aux:e.createRenderTarget(r)},this.#Ve(e,t.paper.mom,this.#E.mom),this.#Ve(e,t.paper.aux,this.#E.aux)}return{...r,...this.#ye(),uLogoTex:this.#C??n,uLogoOn:+!!this.#C,uLogoMap:this.#w,uPaperMom:this.#E?.mom??n,uPaperAux:this.#E?.aux??n,uPaperOn:+!!this.#E}}#Ve(e,t,n){let r=this.#ue(4*t.w,t.h);this.#de(r)?.putImageData(new ImageData(t.bytes,4*t.w,t.h),0,0);let i=e.wrapTexture(r,{autoUpdate:!1,filter:`nearest`});e.draw({frag:Ni,vert:N,target:n,uniforms:{uBytes:i,uRowOffset:0}}),i.dispose()}dispose(){this.#ae++,this.#ie?.(),this.#ie=null,this.#He(),this.#$=!1;let e=this.#Q;this.#Q=[];for(let t of e)t()}#He(){for(let e of[this.#u,this.#d,this.#f,this.#p,this.#h,this.#g,this.#v,this.#y,this.#Ce])e?.dispose();this.#l?.dispose(),this.#_?.dispose(),this.#x.dispose(),this.#S?.dispose(),this.#S=null,this.#C?.dispose(),this.#C=null,this.#E?.mom.dispose(),this.#E?.aux.dispose(),this.#E=null,this.#T=this.#D=-1,this.#u=this.#d=this.#f=this.#h=this.#g=null,this.#p=null,this.#v=this.#y=null,this.#l=this.#_=null,this.#s=-1,this.#b=!1,this.#j=!1,this.#O=null,this.#Ce=null,this.#we=``,this.#Ae=``,this.#Ee=0,this.#De=!1,this.#Oe=!1,this.#ke++,this.#Fe?.dispose(),this.#Fe=null,this.#Pe=null,this.#Ne=``,this.#Re++,this.#Ie=!1}#Ue(e,t){let n=this.#c,r=n?this.#de(n):null;r&&this.#l&&this.#u&&this.#d&&(r.putImageData(new ImageData(t.bytes,X.imageWidth,X.imageHeight),0,0),this.#l.update(),e.draw({frag:Mi,vert:N,target:this.#u,uniforms:{uBytes:this.#l,uRowOffset:0}}),e.draw({frag:Mi,vert:N,target:this.#d,uniforms:{uBytes:this.#l,uRowOffset:X.height}}),this.#s=t.version)}}})))()}var Ri=t({__namedExportsOrder:()=>Ji,default:()=>Hi,holo:()=>$});function zi(e,t,n){let r=null,i=[],a=t=>{i=[...i,t],e.setParams({holo:i})},o={source:`Logo`,look:`(none)`,preset:`(none)`,quality:`medium`,structureScale:1},c=()=>setTimeout(l,0),l=()=>{r?.dispose();let l=s(`Holo`);r=l;let u=e.params,d=e.material,f=e.resolvedSettings();l.addBinding(o,`source`,{options:Q(Object.keys(Ui))}).on(`change`,async e=>{t.src=Ui[e.value],await t.decode(),await n.update(t)});let p=l.addFolder({title:`Effect`}),m={material:d,quality:o.quality,sourceChannel:u.sourceChannel,flat:u.flat,lens:typeof f[`dof.lens`]==`number`?f[`dof.lens`]:62,antialias:u.antialias,structureScale:o.structureScale,ink:u.ink};p.addBinding(m,`material`,{options:Q(Wi)}).on(`change`,e=>{o.preset=`(none)`,a({material:e.value}),c()}),p.addBinding(o,`look`,{options:Q([`(none)`,`card`,`object`,`image`])}).on(`change`,t=>{let n=t.value;i=n===`(none)`?[]:[Z.looks[n]],o.quality=n===`(none)`?`medium`:Z.looks[n].quality,o.structureScale=1,e.setParams({holo:i}),c()});let h=Z.startingPoints[d];p.addBinding(o,`preset`,{options:Q([`(none)`,...Object.keys(h)])}).on(`change`,t=>{let n=`${d}.`,r=Object.fromEntries(Object.keys(e.resolvedSettings()).filter(e=>e.startsWith(n)).map(e=>[e,null]));a({settings:r}),t.value!==`(none)`&&a(h[t.value]),c()}),p.addBinding(m,`quality`,{options:Q([`auto`,`low`,`medium`,`high`])}).on(`change`,e=>{o.quality=e.value,a({quality:o.quality})}),p.addBinding(m,`sourceChannel`,{options:Q([`alpha`,`luminance`,`none`])}).on(`change`,t=>e.setParams({sourceChannel:t.value})),p.addBinding(m,`flat`).on(`change`,t=>{e.setParams({flat:t.value}),c()}),u.flat||(p.addBinding(m,`lens`,{min:24,max:200,step:1}).on(`change`,e=>a({lens:e.value})),p.addBinding(m,`antialias`).on(`change`,t=>e.setParams({antialias:t.value}))),p.addBinding(m,`structureScale`,{min:.25,max:4,step:.05}).on(`change`,e=>{o.structureScale=e.value,a({structureScale:e.value})}),d!==`emboss`&&p.addBinding(m,`ink`,{min:0,max:1,step:.01}).on(`change`,t=>e.setParams({ink:t.value}));let g=l.addFolder({title:`Scene`}),_=(e,t)=>{let n=f[e];return typeof n==`number`?n:t},v=f[`scene.background`],y={exposure:_(`display.ev`,.5),tone:f[`display.tone`]??`neutral`,glare:_(`display.glare`,.03),grain:f[`grain.on`]===!1?0:_(`grain.amount`,.07),studio:String(f[`studio.preset`]??`studio`),background:String(v===`colour`?f[`scene.bgColor`]:v??`white`),bow:_(`card.bow`,1.6),pose:{...f[`motion.pose`]},pointer:f[`motion.pointer`]??`tilt`,tiltRange:_(`motion.tiltRange`,25),wobble:f[`motion.wobble`]!==!1,wobbleAmp:_(`motion.wobbleAmp`,14)};g.addBinding(y,`exposure`,{min:-3,max:3,step:.05}).on(`change`,e=>a({exposure:e.value})),g.addBinding(y,`tone`,{options:Q([`neutral`,`agx`,`clamp`])}).on(`change`,e=>a({tone:e.value})),g.addBinding(y,`glare`,{min:0,max:.1,step:.001}).on(`change`,e=>a({glare:e.value})),g.addBinding(y,`grain`,{min:0,max:.6,step:.005}).on(`change`,e=>a({grain:e.value})),g.addBinding(y,`studio`,{options:Q(Gi)}).on(`change`,e=>{a({studio:e.value}),c()}),g.addBinding(y,`background`,{options:{black:`black`,white:`white`,grey:`#3a4458`}}).on(`change`,e=>a({background:e.value})),g.addBinding(y,`bow`,{min:0,max:2,step:.05}).on(`change`,e=>a({bow:e.value})),g.addBinding(y,`pose`,{x:{min:-35,max:35},y:{min:-35,max:35,inverted:!0}}).on(`change`,e=>a({pose:{x:e.value.x,y:e.value.y}})),g.addBinding(y,`pointer`,{options:Q([`tilt`,`light`,`flash`,`none`])}).on(`change`,e=>a({pointer:e.value})),g.addBinding(y,`tiltRange`,{min:5,max:35,step:1}).on(`change`,e=>a({tiltRange:e.value})),g.addBinding(y,`wobble`).on(`change`,e=>a({wobble:e.value})),g.addBinding(y,`wobbleAmp`,{min:0,max:25,step:.5}).on(`change`,e=>a({wobbleAmp:e.value})),g.addButton({title:`Reset scene`}).on(`click`,()=>{o.look=`(none)`,o.quality=`medium`,o.structureScale=1,i=[],e.setParams({holo:i}),c()});let b=Z.settingSpecs(d),x=b.filter(e=>e.id.startsWith(`${d}.`)),S={"emboss.x":Math.round(t.clientWidth/2),"emboss.y":Math.round(t.clientHeight/2),"emboss.width":Math.round(t.clientWidth*36/63),...f};Bi(l.addFolder({title:`${d}.*`,expanded:!1}),x,S,a),Bi(l.addFolder({title:`studio.* (lights)`,expanded:!1}),b.filter(e=>e.id.startsWith(`studio.`)&&e.id!==`studio.preset`),f,a)};l()}function Bi(e,t,n,r){let i={};for(let a of t)try{Vi(e,a,i,n,r)}catch(e){console.warn(`Holo pane: no control for ${a.id}`,e)}}function Vi(e,t,n,r,i){{let a=r[t.id]??t.default,o=typeof a==`object`&&t.kind===`image`?t.default:a,s=t.id.split(`.`).slice(1).join(`.`);n[s]=typeof o==`object`?{...o}:o;let c=e=>i({settings:{[t.id]:e}});if(t.kind===`select`)e.addBinding(n,s,{options:Q(t.options??[])}).on(`change`,e=>c(e.value));else if(t.kind===`image`)n[s]=String(o),e.addBinding(n,s,{options:t.id===`emboss.print`?qi:Ki}).on(`change`,e=>c(e.value));else if(t.kind===`pad`){let r={min:t.min??-1,max:t.max??1};e.addBinding(n,s,{x:r,y:{...r,inverted:!0}}).on(`change`,e=>{let t=e.value;c({x:t.x,y:t.y})})}else t.kind===`slider`?e.addBinding(n,s,{min:t.min,max:t.max,step:t.step}).on(`change`,e=>c(e.value)):e.addBinding(n,s).on(`change`,e=>c(e.value))}}var Hi,Ui,Wi,Gi,Ki,qi,Q,$,Ji;function Yi(){return(Yi=e((()=>{Li(),f(),a(),m(),c(),Hi={title:`Effect/Holo`,parameters:{layout:`fullscreen`}},Ui={Logo:i,Pigeon:p,Jellyfish:d},Wi=[`prism`,`shatter`,`nebula`,`sparkle`,`vortex`,`emboss`],Gi=[`studio`,`spot`,`softbox`,`strip`,`dark`,`desk`,`office`,`raking`],Ki={"(none)":``,"the element":`element`,"vfx-js logo":i},qi={"(none)":``,pigeon:p},Q=e=>Object.fromEntries(e.map(e=>[e,e])),$={render:()=>{let e=document.createElement(`img`);return e.src=i,e.style.cssText=`display:block;margin:120px auto;max-width:60vw`,e},args:void 0,parameters:{chromatic:{disableSnapshot:!0}}},$.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await t.decode();let n=l(),r=new Z;await n.add(t,{effect:r}),zi(r,t,n)},Ji=[`holo`],$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    img.style.cssText = "display:block;margin:120px auto;max-width:60vw";
    return img;
  },
  args: undefined,
  // animated (wobble, grain) and loads its material and logo in the background: no stable snapshot
  parameters: {
    chromatic: {
      disableSnapshot: true
    }
  }
}`,...$.parameters?.docs?.source}}}})))()}export{Tt as a,Te as c,E as d,ne as f,y as g,g as h,V as i,ve as l,h as m,Yi as n,P as o,re as p,At as r,We as s,Ri as t,T as u};