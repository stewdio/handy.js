
//  Copyright © 2020–2021 Stewart Smith. See LICENSE for details.




//  So you’re diving into JavaScript, eh?
//  Here’s a quick start guide to the language:
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types




//  JavaScript modules. 
//  As of May 2020, Three.js is officially moving to modules and deprecating
//  their old non-module format. I think that’s a bummer because now you
//  MUST run a server in order to play with the latest Three code -- even
//  for the simplest examples. Such is progress?
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js'
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import Bolt from '../vendor/Moar/scripts/Bolt.js'
import { Handy } from '../src/Handy.js'
import { SurfaceText } from '../vendor/Moar/scripts/SurfaceText.js'




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
stats,
world

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
window.camera = camera
	
	//  Scene.
	//  https://threejs.org/docs/#api/en/scenes/Scene

	scene = new THREE.Scene()
	scene.add( camera )


	//  We’d also like a “world” group to attach our objects to.
	//  This is because later we’ll want to “move the world”
	//  so it looks like the user is moving.
	//  https://threejs.org/docs/#api/en/objects/Group

	world = new THREE.Group()
	scene.add( world )


	//  WebGL renderer.
	//  https://threejs.org/docs/#api/en/renderers/WebGLRenderer

	renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setPixelRatio( window.devicePixelRatio )
	renderer.setSize( window.innerWidth, window.innerHeight )
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFSoftShadowMap
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
//  Note: This is not something you’d want to do in production.

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

	/*const [ contoller0, controller1 ] = [ {}, {} ]
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
	})*/


	//  Now let’s get a little fancier.
	//  Instead of just positions in 3D space,
	//  these are actual controller visuals!
	// (A model will be fetched from a CDN.)
	//  https://en.wikipedia.org/wiki/Content_delivery_network

	/*const 
	controllerModelFactory = new XRControllerModelFactory(),
	[ controllerGrip0, controllerGrip1 ] = [ {}, {} ]
	.map( function( controllerGrip, i ){

		controllerGrip = renderer.xr.getControllerGrip( i )
		controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ))
		scene.add( controllerGrip )

		return controllerGrip
	})*/


	//  And here we go -- time for virtual reality hands!!

	const 
	handModelFactory = new XRHandModelFactory(),
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
		//      3 - High poly hand model.
		//
		//  Our intent is to display one at a time,
		//  allowing the user to cycle through them
		//  by making a fist.

		hand.models = [

			handModelFactory.createHandModel( hand, 'boxes' ),
			handModelFactory.createHandModel( hand, 'spheres' ),
			handModelFactory.createHandModel( hand, 'mesh' )
		]
		hand.modelIndex = 0
		hand.isDefaultColor = true




		//  This is what makes detecting hand poses easy!

		Handy.makeHandy( hand )

		//  Let’s create a means for displaying 
		//  hand and finger data right in VR!
		//  SurfaceText returns a THREE.Mesh
		//  with additional methods like print().

		hand.displayFrameAnchor = new THREE.Object3D()
		hand.add( hand.displayFrameAnchor )
		hand.displayFrame = new SurfaceText({

			text: 'No data',
			canvas: {

				width:  512,
				height: 128
			},
			virtual: {

				width:  0.20,
				height: 0.05
			},
			style: {

				fontFamily: 'bold monospace',
				fontSize:   '30px',
				textAlign:  'center',
				fillStyle:  '#00DDFF'
			}
		})
		hand.displayFrameAnchor.add( hand.displayFrame )
		hand.displayFrame.visible = true//false


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
		//  to listen to our custom hand poses.
		//  Make a fist to change hand visual style.

		hand.addEventListener( 'fist pose began', cycleHandModel )


		//  Let’s trigger a glove color change
		//  when we make a “peace” pose.
		//  Funny thing about peace -- most folks 
		//  hold this pose like an ASL 2.
		//  But its etymology coincides with ASL V.
		//  So we’ve labeled BOTH 2 and V as “peace”.
		//  One way to account for that is to use
		//  the “pose changed” event
		//  and check poseIs and poseWas to confirm
		//  we’ve only just switched to a “peace” pose.

		//  This is also a useful event listener for debugging.
		//  The event.message property will display the “names” Array
		//  for both the currently detected pose and the prior one.

		hand.addEventListener( 'pose changed', function( event ){

			console.log( event.message )
			if( event.resultIs.pose.names.includes( 'peace' ) &&
				!event.resultWas.pose.names.includes( 'peace' )){

				console.log( 'Changing glove color for', hand.handedness )
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
	.setPath( 'vendor/Three/media/milkyway/' )
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
		//  that describes a cylinder:
		//  https://threejs.org/docs/#api/en/geometries/CylinderGeometry

		new THREE.CylinderGeometry( 4.5, 5, 1, 12 ),


		//  For this Mesh we’ll use the “MeshStandardMaterial”.
		//  https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
		//  This Material uses “Physically based rendering” (PBR).
		//  https://en.wikipedia.org/wiki/Physically_based_rendering

		new THREE.MeshStandardMaterial({
		
			color: 0xFFEECC,
			roughness: 0.2,
			metalness: 1.0,
			emissive: 0xFFFFFF,
			emissiveIntensity: 0.05
		})
	)


	//  Objects are positioned according to their center
	//  so we’d better force our platform downward
	//  by half its height so its top is level to the floor.

	platform.position.set( 0, -0.5, 0 )


	//  By default meshes do not receive shadows.
	// (This keeps rendering speedy!)
	//  So we must turn on shadow reception manually.
	
	platform.receiveShadow = true


	//  And we want our platform to actually exist in our world
	//  so we must add it to our scene.
	//  Or that is… our “world” group within our scene.

	world.add( platform )
	

	//  Let there be light.
	//  Directional lights create parallel light rays.
	//  https://threejs.org/docs/#api/en/lights/DirectionalLight

	const light = new THREE.DirectionalLight( 0xFFFFFF )
	light.position.set( -2, 8, 0 )
	scene.add( light )


	//  Lensflare !
	//  These textures come from the Three.js repository.
	//  https://threejs.org/docs/#examples/en/objects/Lensflare

	const 
	loader    = new THREE.TextureLoader(),
	texture0  = loader.load( 'vendor/Three/media/lensflare/lensflare0.png' ),
	texture3  = loader.load( 'vendor/Three/media/lensflare/lensflare3.png' ),
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


let 
timePrevious,
leftHandWalkPoseWas,
rightHandWalkPoseWas

window.walk = walk//  Just for testing!
function walk(){

	// console.log( '\n\nWALKING!\n\n' )
	
	const
	position = new THREE.Vector3(),
	rotation = new THREE.Quaternion(),
	scale    = new THREE.Vector3(),
	eulor    = new THREE.Euler()
	
	camera.matrixWorld.decompose( position, rotation, scale )


	//  Get just the headset’s rotation around the Y axis.

	eulor.setFromQuaternion( camera.getWorldQuaternion(), 'YXZ' )
	console.log( 'eulor.y', eulor.y )


	//  Sanity check (in degrees). 
	//  Are we getting the FULL rotation range -180˚ to +180˚
	//  instead of only -90˚ to +90˚.
	//  THIS IS WHERE THE ERROR IS...
	
	// console.log( 'Headset Yaw:', ( eulor.y * THREE.Math.RAD2DEG ).toFixed( 2 ))
	
	
	//  Apply the rotation angle and scale it back a bit.
	//  The trackpad is returning values of -1 to +1
	//  and if we applied “1” directly to our VR world
	//  we’d be moving by one whole meter! So scale down!!

	const
	vector = new THREE.Vector3( 0, 0, -1 ),//  Start by looking straight ahead.
	axis   = new THREE.Vector3( 0, 1, 0 ), //  Rotate around the Y-axis only.
	angle  = eulor.y//  Take the Y-axis rotation from the headset.

	
	//  We’re going to rotate our straight-ahead vector
	//  by taking the radians specified in eulor.y
	//  and applying that to the Y-axis.

	vector.applyAxisAngle( axis, angle )
	vector.multiplyScalar( 0.5 )//  Let’s only move a little distance at a time.
	world.position.sub( vector )
}
function loop( timeNow, frame ){

	Handy.update( function( hand ){

		if( hand.isPose( 'fire point', 4000 )){


			//  Bolt comes from my original “Space Rocks” (2017) WebVR demo.
			//  https://spacerocks.moar.io/
			//  Pehaps I’ll update that someday 
			//  now that the WebXR API is … sort of finalized?

			const bolt = new Bolt(

				// scene,//  The bolt must know what scene to attach itself to.
				// hand, //  Used for ‘handedness’ as well as attaching some state to.
				hand.joints[ 'wrist' ]//  Reference point.
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


		//  If we’re displaying hand pose + finger data 
		// (angle˚, distance, isExtended, isContracted)
		//  and there is existing joint data to use...

		if( hand.displayFrame.visible === true && 
			hand.joints[ 'wrist' ] &&
			hand.joints[ 'wrist' ].position ){

			const wrist = hand.joints[ 'wrist' ]
			hand.displayFrameAnchor.position.copy( wrist.position )
			hand.displayFrameAnchor.quaternion.copy( wrist.quaternion )


			//  TO DO:
			//  displayFrame should actually ORBIT the wrist at a fixed radius
			//  and always choose the orbit degree that faces the camera.
			
			let handedness = hand.handedness
			if( handedness === 'left' || handedness === 'right' ){

				handedness = handedness.toUpperCase()
			}
			else {

				handedness = 'UNKNOWN'
			}
			if( handedness === 'LEFT' ){

				hand.displayFrame.position.set( 0.06, -0.05, 0.02 )
			}
			if( handedness === 'RIGHT' ){

				hand.displayFrame.position.set( -0.06, -0.05, 0.02 )
			}
			hand.displayFrame.rotation.x = Math.PI / -2
			hand.displayFrame.rotation.y = Math.PI

			let displayString = handedness
			if( hand.searchResults.length &&
				hand.searchResults[ 0 ].pose ){

				displayString += '\n'+ hand.searchResults[ 0 ].pose.names
				.reduce( function( names, name, i ){

					if( i ) names += ', '
					return names += name

				}, '' )
				displayString +='\n@ '+ hand.searchResults[ 0 ].distance.toLocaleString() +'mm'
			}
			hand.displayFrame.print( displayString )
		}


	})




	//  Let’s get fancy and …
	// “Let your fingers do the walking.”
	// (Americans of a certain age might recall this
	//  old Yellow Pages slogan and feel some nostalgia.)
	//  NOTE: THIS IS VERY MUCH IN-PROGRESS AND HACKY!
	//  I AM ASHAMED! DON’T LOOK AT ME!

	const 
	leftHand = Handy.hands.getLeft(),
	rightHand = Handy.hands.getRight()

	if( leftHand !== undefined && rightHand !== undefined ){


		//  If this all seems verbose in terms of variable names
		//  or the nested logic it’s for human legibility. 

		window.bothHandsExist = true

		const		
		leftHandIsFlat = !!leftHand.isPose( 'flat', 8000 ),
		leftHandIsWalkingIndex  = !!leftHand.isPose( 'walk index down', 5000 ),
		leftHandIsWalkingMiddle = !!leftHand.isPose( 'walk middle down', 5000 ),
		leftHandIsWalking = leftHandIsWalkingIndex || leftHandIsWalkingMiddle

		const
		rightHandIsFlat = !!rightHand.isPose( 'flat', 8000 ),
		rightHandIsWalkingIndex  = !!rightHand.isPose( 'walk index down', 5000 ),
		rightHandIsWalkingMiddle = !!rightHand.isPose( 'walk middle down', 5000 ),
		rightHandIsWalking = rightHandIsWalkingIndex || rightHandIsWalkingMiddle

		if(
			( leftHandIsFlat && rightHandIsWalking ) || 
			( leftHandIsWalking && rightHandIsFlat )){

			window.aHandIsWalking = true
			if( leftHandIsWalking ){
			
				window.leftHandIsWalking = true
				if(
					( leftHandIsWalkingIndex && leftHandWalkPoseWas === 'middle' ) ||
					( leftHandIsWalkingMiddle && leftHandWalkPoseWas === 'index' )){
					
					walk()
				}
				leftHandWalkPoseWas = leftHandIsWalkingIndex ? 'index' : 'middle'
			}
			else if( rightHandIsWalking ){

				window.rightHandIsWalking = true
				if(
					( rightHandIsWalkingIndex && rightHandWalkPoseWas === 'middle' ) ||
					( rightHandIsWalkingMiddle && rightHandWalkPoseWas === 'index' )){
					
					walk()
				}
				rightHandWalkPoseWas = rightHandIsWalkingIndex ? 'index' : 'middle'
			}
		}
	}


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
	Bolt.setup( scene )
	setupHands()
	setupContent()
})







