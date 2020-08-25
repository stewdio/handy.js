
//  Copyright © 2020 Stewart Smith. See LICENSE for details.




//  So you’re diving into JavaScript, eh?
//  Here’s a quick start guide to the language:
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types




//  JavaScript modules. 
//  As of May 2020, Three.js is officially moving to modules and deprecating
//  their old non-module format. I think that’s a bummer because now you
//  MUST run a server in order to play with the latest Three code -- even
//  for the simplest examples. Such is progress?
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

import * as THREE from './third-party/Three/three.module.js'
import { OrbitControls } from './third-party/Three/OrbitControls.js'
import { VRButton } from './third-party/Three/VRButton.js'
import { XRControllerModelFactory } from './third-party/Three/XRControllerModelFactory.js';
import { XRHandModelFactory } from './third-party/Three/XRHandModelFactory.js'
import { XRHandPrimitiveModel } from './third-party/Three/XRHandPrimitiveModel.js'
import { Lensflare, LensflareElement } from './third-party/Three/Lensflare.js'
import { Bolt } from './third-party/SpaceRocks/Bolt.js'
import { Handy } from './Handy.js'
import Stats from './third-party/Three/stats.module.js'






    //////////////////
   //              //
  //   Overhead   //
 //              //
//////////////////


//  Some bits that we’ll reference across different function scopes,
//  so we’ll define them here in the outermost scope.
//  https://developer.mozilla.org/en-US/docs/Glossary/Scope

let 
camera,
scene,
renderer,
controls,
stats

function setupThree(){


	//  DOM container for Three’s CANVAS element.
	//  https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
	//  https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild

	const container = document.getElementById( 'three' )


	//  Perspective camera.
	//  https://threejs.org/docs/#api/en/cameras/PerspectiveCamera

	const
	fieldOfView = 75,
	aspectRatio = window.innerWidth / window.innerHeight,
	near = 0.01,
	far  = 1000,
	userHeight = 1.65

	camera = new THREE.PerspectiveCamera( 
		
		fieldOfView, 
		aspectRatio,
		near,
		far 
	)
	camera.position.set( 0, userHeight, 6 )

	
	//  Scene.
	//  https://threejs.org/docs/#api/en/scenes/Scene

	scene = new THREE.Scene()
	scene.add( camera )


	//  WebGL renderer.
	//  https://threejs.org/docs/#api/en/renderers/WebGLRenderer

	renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setPixelRatio( window.devicePixelRatio )
	renderer.setSize( window.innerWidth, window.innerHeight )
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFSoftShadowMap
	renderer.physicallyCorrectLights = true
	renderer.toneMapping = THREE.ACESFilmicToneMapping
	renderer.outputEncoding = THREE.sRGBEncoding
	renderer.xr.enabled = true
	container.appendChild( VRButton.createButton( renderer ))
	container.appendChild( renderer.domElement )


	//  Orbit controls.
	//  https://threejs.org/docs/#examples/en/controls/OrbitControls
	
	controls = new OrbitControls( camera, renderer.domElement )
	controls.target.set( 0, userHeight, 0 )
	controls.update()


	//  When our window size changes
	//  we must update our camera and our controls.

	window.addEventListener( 'resize', function(){
	
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize( window.innerWidth, window.innerHeight )
		controls.update()

	}, false )


	//  Performance statistics.
	//  https://github.com/mrdoob/stats.js/

	stats = new Stats()
	document.body.appendChild( stats.domElement )


	//  Our old standby, window.requestAnimationFrame()
	//  attempts to execute at 60 frames per second.
	//  But we can only use this for normal 2D screen presentations.
	//  https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
	
	//  Meanwhile, when we enter VR we must instead use 
	//  VRDisplay.requestAnimationFrame()
	//  which attempts to execute at 90 frames per second.
	//  https://developer.mozilla.org/en-US/docs/Web/API/VRDisplay/requestAnimationFrame
	
	//  So that’s two different methods to call,
	//  and two different frame rates.
	//  Three.js now abstracts that all away 
	//  with its (relatively) new renderer.setAnimationLoop().
	//  Just pass it your main animation function
	//  and it will pass two arguments to it:
	//  the current clock time and the XR frame data.
	//  https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setAnimationLoop
	//  https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content

	//  Also -- notice how we have not defined ‘loop’ yet.
	//  Thanks to JavaScript variable hoisting
	//  our ‘loop’ function will be available here ;)
	//  https://developer.mozilla.org/en-US/docs/Glossary/Hoisting
	
	renderer.setAnimationLoop( loop )
}






    ///////////////
   //           //
  //   Hands   //
 //           //
///////////////


//  Let’s assign these variables to the GLOBAL SCOPE
//  so it’s easy to inspect them from the JavaScript console.
//  We do this by assigning them as properties to window{}.
//  If we weren’t using JavaScript modules 
//  then anything we declare in this file’s outer most scope
//  would already be attached to window{}.
//  https://developers.google.com/web/tools/chrome-devtools/console/javascript
//  https://javascript.info/devtools

window.THREE = THREE
window.Handy = Handy


//  We’re about to setup controllers, controller grips, and hands
//  from the renderer -- and also load some hand models.
//  Those aspects are based on these Three.js demos:
//  https://threejs.org/examples/webxr_vr_handinput.html
//  https://threejs.org/examples/webxr_vr_handinput_cubes.html
//  https://threejs.org/examples/webxr_vr_handinput_profiles.html

function setupHands(){


	//  We’re about to set up HANDS,
	//  so what’s this about ‘controller0’ and controller1?
	//  You might describe this as our simplest endeavor.
	//  Just positions in 3D space
	//  and ray beams extending outward for aim.

	//  Also, it’s worth being very comfortable 
	//  with ‘raw’ Array literals
	//  and with an Array’s map() function.
	//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map

	const [ contoller0, controller1 ] = [ {}, {} ]
	.map( function( controller, i ){

		controller = renderer.xr.getController( i )
		controller.add( new THREE.Line( 

			new THREE.BufferGeometry().setFromPoints([ 

				new THREE.Vector3( 0, 0,  0 ), 
				new THREE.Vector3( 0, 0, -5 )
			]) 
		))
		scene.add( controller )

		return controller
	})


	//  Now let’s get a little fancier.
	//  Instead of just positions in 3D space,
	//  these are actual controller visuals!
	// (A model will be fetched from a CDN.)
	//  https://en.wikipedia.org/wiki/Content_delivery_network

	const 
	controllerModelFactory = new XRControllerModelFactory(),
	[ controllerGrip0, controllerGrip1 ] = [ {}, {} ]
	.map( function( controllerGrip ){

		controllerGrip = renderer.xr.getControllerGrip( 0 )
		controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ))
		scene.add( controllerGrip )

		return controllerGrip
	})


	//  And here we go -- time for virtual reality hands!!
	//  These models are not hosted on a CDN,
	//  they’re included right in this code package.

	const 
	handModelFactory = new XRHandModelFactory().setPath( './media/hands/' ),
	cycleHandModel = function( event ){

		const hand = event.hand
		console.log(

			'Cycling the hand model for the',
			 hand.handedness.toUpperCase(),
			'hand.'
		)
		hand.models.forEach( function( model ){

			model.visible = false
		})
		hand.modelIndex = ( hand.modelIndex + 1 ) % hand.models.length
		hand.models[ hand.modelIndex ].visible = true
	},
	colors = {

		default: new THREE.Color( 0xFFFFFF ),//  White glove.
		left:    new THREE.Color( 0x00FF00 ),//  Green glove for left.
		right:   new THREE.Color( 0xFF0000 ) //  Red glove for right.
	}


	const [ hand0, hand1 ] = [ {}, {} ]
	.map( function( hand, i ){


		//  THREE.Renderer now wraps all of this complexity
		//  so you don’t have to worry about it!
		//  getHand() returns an empty THREE.Group instance
		//  that you can immediately add to your scene.

		hand = renderer.xr.getHand( i )
		scene.add( hand )


		//  So far we have an abstract model of a hand
		//  but we don’t have a VISUAL model of a hand!
		//  Let’s load four different visual models:
		//
		//      1 - A cube for each joint.
		//      2 - A sphere for each joint.
		//      3 - Low poly hand model.
		//      4 - High poly hand model.
		//
		//  Our intent is to display one at a time,
		//  allowing the user to cycle through them
		//  by making a fist.

		hand.models = [

			handModelFactory.createHandModel( hand, 'boxes' ),
			handModelFactory.createHandModel( hand, 'spheres' ),
			handModelFactory.createHandModel( hand, 'oculus', { model: 'lowpoly' }),
			handModelFactory.createHandModel( hand, 'oculus' )
		]
		hand.modelIndex = 0




		//  This is what makes detecting hand shapes easy!

		Handy.makeHandy( hand )




		//  When hand tracking data becomes available
		//  we’ll receive this connection event.

		hand.addEventListener( 'connected', function( event ){

			//console.log( 'Hand tracking has begun!', event )


			//  As long as the handedness never changes (ha!)
			//  this should do us right.

			hand.handedness = event.data.handedness


			//  When the hand joint data comes online
			//  it will make ALL of the above models visible.
			//  Let’s hide them all except for the active one.

			hand.models.forEach( function( model ){

				hand.add( model )
				model.visible = false
			})	
			hand.models[ hand.modelIndex ].visible = true
		})


		//  Speaking of events, here’s how easy it is
		//  to listen to our custom hand shapes.
		//  Make a fist to change hand visual style.

		hand.addEventListener( 'fist shape began', cycleHandModel )


		//  Let’s trigger a glove color change
		//  when we make a “peace” shape.
		//  Funny thing about peace -- most folks 
		//  hold this shape like an ASL 2.
		//  But its etymology coincides with ASL V.
		//  So we’ve labeled BOTH 2 and V as “peace”.
		//  One way to account for that is to use
		//  the “shape changed” event
		//  and check shapeIs and shapeWas to confirm
		//  we’ve only just switched to a “peace” shape.

		//  This is also a useful event listener for debugging.
		//  The event.message property will display the “names” Array
		//  for both the currently detected shape and the prior one.

		hand.addEventListener( 'shape changed', function( event ){

			// console.log( event.message )
			if( event.resultIs.shape.names.includes( 'peace' ) &&
				!event.resultWas.shape.names.includes( 'peace' )){

				hand.checkHandedness()
				hand.traverse( function( obj ){

					if( obj.material ){


						//  Note this very terse conditional operator here.
						//  It’s made of a ‘?’ and ‘:’ and called a ternary operator:
						//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_Operator

						obj.material.color = hand.isDefaultColor ? 
							colors[ hand.handedness ] : 
							colors.default
					}
				})
				hand.isDefaultColor = !hand.isDefaultColor
			}
		})


		//  We’re going to make our display frames vsible

		hand.displayFrame.visible = true


		return hand
	})
}






    /////////////////
   //             //
  //   Content   //
 //             //
/////////////////


function setupContent() {


	//  Milky Way galaxy background. 
	//  These texture are included this Three VR demo:
	//  https://threejs.org/examples/#webxr_vr_sandbox
	//  https://threejs.org/docs/#api/en/loaders/CubeTextureLoader
	//  Note that CubeTextureLoader is a form of Loader:
	//  https://threejs.org/docs/#api/en/loaders/Loader

	const background = new THREE.CubeTextureLoader()
	.setPath( 'media/milkyway/' )
	.load([ 

		'dark-s_px.jpg', 
		'dark-s_nx.jpg', 
		'dark-s_py.jpg', 
		'dark-s_ny.jpg', 
		'dark-s_pz.jpg', 
		'dark-s_nz.jpg' 
	])


	//  Now we can set the Milky Way as our scene’s background.

	scene.background = background


	//  Let’s create a circular platform to “stand” on in space.
	//  To create a 3D “thing” we must create a “Mesh”:
	//  https://threejs.org/docs/#api/en/objects/Mesh

	const platform = new THREE.Mesh( 


		//  Every Mesh needs geometry; a collection of 3D points to use.
		//  For this platform we’ll use some pre-defined geometry
		//  that describes a circle:
		//  https://threejs.org/docs/#api/en/geometries/CircleBufferGeometry

		new THREE.CircleBufferGeometry( 4, 12 ),


		//  For this Mesh we’ll use the “MeshStandardMaterial”.
		//  https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
		//  This Material uses “Physically based rendering” (PBR).
		//  https://en.wikipedia.org/wiki/Physically_based_rendering

		new THREE.MeshStandardMaterial({
		
			color: 0xFFEECC,
			roughness: 0.2,
			metalness: 1.0,
			envMapIntensity: 1.0,
			transparent: true,
			opacity: 1
		})
	)

	
	//  In Three.js all flat 2D shapes are drawn vertically.
	//  This means that for any 2D shape 
	//  that we’d like to use as a floor,
	//  we  must rotate it 90 degrees (π ÷ 2 radians)
	//  so that it is horizontal rather than vertical.
	//  Here, we’ll rotate negatively (π ÷ -2 radians)
	//  so the visible surface ends up on top.
	
	platform.rotation.x = Math.PI / -2


	//  By default meshes do not receive shadows.
	// (This keeps rendering speedy!)
	//  So we must turn on shadow reception manually.
	
	platform.receiveShadow = true


	//  And we want our platform to actually exist in our world
	//  so we must add it to our scene.

	scene.add( platform )


	//  Environment map.
	//  https://threejs.org/examples/webgl_materials_envmaps_exr.html
	/*
	const pmremGenerator = new THREE.PMREMGenerator( renderer )
	pmremGenerator.compileCubemapShader()
	THREE.DefaultLoadingManager.onLoad = function(){

		pmremGenerator.dispose()
	}
	let cubeRenderTarget
	new THREE.CubeTextureLoader()
	.setPath( 'media/milkyway/' )
	.load([ 

		'dark-s_px.jpg', 
		'dark-s_nx.jpg', 
		'dark-s_py.jpg', 
		'dark-s_ny.jpg', 
		'dark-s_pz.jpg', 
		'dark-s_nz.jpg' 
	
	], function( texture ){

		texture.encoding = THREE.sRGBEncoding
		const cubeRenderTarget = pmremGenerator.fromCubemap( texture )
		platform.material.envMap = cubeRenderTarget.texture
		platform.material.needsUpdate = true
		texture.dispose()
	})
	*/

	//  Let there by light.
	//  Directional lights create parallel light rays.
	//  https://threejs.org/docs/#api/en/lights/DirectionalLight

	const light = new THREE.DirectionalLight( 0xFFFFFF )
	light.position.set( -2, 4, 0 )
	light.castShadow = true
	light.shadow.camera.top    =  4
	light.shadow.camera.bottom = -4
	light.shadow.camera.right  =  4
	light.shadow.camera.left   = -4
	light.shadow.mapSize.set( 2048, 2048 )
	scene.add( light )
	scene.add( new THREE.AmbientLight( 0x888888 ))


	//  Lensflare !
	//  These textures come from the Three.js repository.
	//  https://threejs.org/docs/#examples/en/objects/Lensflare

	const 
	loader    = new THREE.TextureLoader(),
	texture0  = loader.load( 'media/lensflare/lensflare0.png' ),
	texture3  = loader.load( 'media/lensflare/lensflare3.png' ),
	lensflare = new Lensflare()

	lensflare.position.copy( light.position )
	lensflare.addElement( new LensflareElement( texture0, 700, 0.0 ))
	lensflare.addElement( new LensflareElement( texture3,  60, 0.6 ))
	lensflare.addElement( new LensflareElement( texture3,  70, 0.7 ))
	lensflare.addElement( new LensflareElement( texture3, 120, 0.9 ))
	lensflare.addElement( new LensflareElement( texture3,  70, 1.0 ))
	scene.add( lensflare )
}






    //////////////
   //          //
  //   Loop   //
 //          //
//////////////


let timePrevious

function loop( timeNow, frame ){

	Handy.update( function( hand ){

		if( hand.isShape( 'fire point', 3000 )){


			//  Bolt comes from my original “Space Rocks” (2017) WebVR demo.
			//  https://spacerocks.moar.io/
			//  Pehaps I’ll update that someday 
			//  now that the WebXR API is finalized?

			const bolt = new Bolt(

				scene,//  The bolt must know what scene to attach itself to.
				hand, //  Used for ‘handedness’ as well as attaching some state to.
				hand.joints[ Handy.WRIST ]//  Reference point.
			)
			

			//  Yeah... You’re still upset about Bolt attaching state too hand, eh?
			//  Me too. It’s not the right way to do business.
			//  But I’m tired. Bolt is old code that got a quick retro fit.
			
			if( bolt ){

				
				//  Bolt has a duration throttle on it 
				//  for how many bolts can fire
				//  within a given amount of time.
				//  So do not expect this 
				//  to execute each frame.
				
				console.log( 'Shot fired!' )
			}
		}
	})


	//  Determine the time since last frame in SECONDS (not milliseconds).
	//  Then perform all the animation updates based on that.
	//  Ok -- in this case it’s only for Bolt.	

	if( timePrevious === undefined ) timePrevious = timeNow
	const timeDelta = ( timeNow - timePrevious ) / 1000
	timePrevious = timeNow
	Bolt.update( timeDelta )


	renderer.render( scene, camera )
	stats.update()
}






    //////////////
   //          //
  //   Boot   //
 //          //
//////////////


window.addEventListener( 'DOMContentLoaded', function(){

	setupThree()
	setupHands()
	setupContent()
})







