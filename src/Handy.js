//  Copyright © 2020–2021 Stewart Smith. See LICENSE for details.



//	👉 𝖨𝗇𝗍𝗋𝗈𝖽𝗎𝖼𝗂𝗇𝗀 𝗛𝗮𝗻𝗱𝘆.𝗷𝘀 👈
//
//  Want to add hand pose recognition to your WebXR project?
//  Handy makes defining and using custom hand poses a snap!
//  Why use hand-held contollers when you can use your bare 
//  hands? 👋  Built on Three.js and tested on the Oculus Quest,
//  Handy recognizes over 100 hand poses right out of the box --
//  including the American Sign Language (ASL) alphabet.
//	And yes, full hand gesture recognition is on the roadmap 👍
//
//  Requires OculusBrowser/11.1.0.1.64 or later.

import { poses as posesLeft  } from './Handy-poses-left.js'
import { poses as posesRight } from './Handy-poses-right.js'
import {
	Vector3,
	MathUtils,
	Object3D,
	Mesh,
	BoxBufferGeometry,
	MeshBasicMaterial,
} from 'three';

const Handy = {


	//  What revision of Handy is this?
	//  I don’t have strict critera for requiring a version bump
	//  but when something biggish changes I’ll bump this number.

	REVISION: 5,


	//  The following list of joint names mirrors the constants list
	//  of window.XRHand. So why duplicate that?
	//  Because right now XRHand only exists in the Oculus browser
	//  and we want to be able to reason around XRHand stuff --
	//  perhaps even playback recorded hand motions --
	//  right here on your desktop machine where XRHand does not exist.
	//  Here’s the proposed spec for joint indexes:
	//  https://github.com/immersive-web/webxr-hand-input/blob/master/explainer.md#appendix-proposed-idl

	//  We use this Array to look up joint names by index value.
	//  What’s at joint index #7?
	//  Just ask for Handy.jointNames[ 7 ]
	//  and you’ll get the value 'index-finger-phalanx-intermediate'.

	//  We also use this Array to append constants directly 
	//  onto the Handy{} object like so:
	//  Handy[ 'index-finger-phalanx-intermediate' ] === 7.
	//  This exactly mirrors XRHand:
	//  Handy[ 'index-finger-phalanx-intermediate' ] === XRHand[ 'index-finger-phalanx-intermediate' ].

	jointNames: [

		'wrist',                             //   0
		
		'thumb-metacarpal',                  //   1
		'thumb-phalanx-proximal',            //   2
		'thumb-phalanx-distal',              //   3
		'thumb-tip',                         //   4

		'index-finger-metacarpal',           //   5
		'index-finger-phalanx-proximal',     //   6
		'index-finger-phalanx-intermediate', //   7
		'index-finger-phalanx-distal',       //   8
		'index-finger-tip',                  //   9

		'middle-finger-metacarpal',          //  10
		'middle-finger-phalanx-proximal',    //  11
		'middle-finger-phalanx-intermediate',//  12
		'middle-finger-phalanx-distal',      //  13
		'middle-finger-tip',                 //  14

		'ring-finger-metacarpal',            //  15
		'ring-finger-phalanx-proximal',      //  16
		'ring-finger-phalanx-intermediate',  //  17
		'ring-finger-phalanx-distal',        //  18
		'ring-finger-tip',                   //  19

		'pinky-finger-metacarpal',           //  20
		'pinky-finger-phalanx-proximal',     //  21
		'pinky-finger-phalanx-intermediate', //  22
		'pinky-finger-phalanx-distal',       //  23
		'pinky-finger-tip'                   //  24
	],


	//  These are not part of the XRHand spec
	//  but come in handy -- no pun intended.

	digitNames: [

		'thumb',
		'index',
		'middle',
		'ring',
		'pinky'
	],
	digitTipNames: [

		'thumb-tip', //   4
		'index-finger-tip', //   9
		'middle-finger-tip',//  14
		'ring-finger-tip',  //  19
		'pinky-finger-tip' //  24
	],
	isDigitTipIndex: function( i ){

		return (

			i >  0 &&
			i < 25 &&
			!(( i + 1 ) % 5 )
		)
	},
	fingerNames: [

		'index',
		'middle',
		'ring',
		'pinky'
	],
	isFingerTipIndex: function( i ){

		return (

			i >  4 &&
			i < 25 &&
			!(( i + 1 ) % 5 )
		)
	},


	//  We’ll repeatedly use this
	//  so let’s just create it once
	//  and reference it from here on.

	VECTOR3_ZERO: new Vector3(),


	//  Here’s the data goods;
	//  Poses for the left hand to match
	//  and poses for the right hand to match.

	poses: {

		left:  posesLeft,
		right: posesRight
	},


	//  Maximum duration in milliseconds
	//  that we’ll allow per update() loop
	//  PER HAND for a pose search.
	//  Remember, we want to get out of the way
	//  as quickly as possible!

	searchLoopDurationLimit: 6,


	//  JavaScript doesn’t need classes.
	// (You may want to read that again.)
	//  Here we’re going to REFERENCE (not copy)
	//  functionality from one object onto another,
	//  eg. the ‘hand’ that we will makeHandy().
	//  To make this process more efficient
	//  when creating more than one hand
	//  we’ll define the methods just once,
	//  store them in this ‘protos’ object,
	//  then add REFERENCES to them on “handy” objects.
	//  eg. hands.left.reportFingers === hands.right.reportFingers
	//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects#Comparing_objects

	protos: {},


	//  We’re going to keep a reference
	//  to every object that we “make handy”
	//  so we can iterate through them later
	//  and also detect interactions BETWEEN them.
	// (That is coming soon!)

	hands: [],


	//  Now we can update all individual hands
	//  just by calling Handy.update()!

	update: function( callbackForAllHands ){

		this.hands.forEach( function( hand ){

			hand.update( callbackForAllHands )
		})
	},


	//  Handy.makeHandy() expects an instance of THREE.Object3D,
	//  or anything that inherits from THREE.Object3D,
	//  and then injects additional functionality into that object.
	//  The intended use is with THREE’s XRHand model like so:
	//
	//    hand0 = renderer.xr.getHand( 0 )
	//    Handy.makeHandy( hand0 )//  This is the magic line.
	//
	//  Now ‘hand0’ is handy! It’s that easy!
	//  Just remember to call Handy.update() within your update loop!
	//  Handy.update() will in turn update all handified objects.

	makeHandy: function( obj ){

		obj.name = 'hand'


		//  We need to find the THREE camera used for this scene
		//  in order to have our data display frames 
		//  always lookAt() the camera.
		//  In the future we might need this to be more robust
		//  or just pass in the intended camera via update().

		//  NOTE. THIS IS VEY BRITTLE!
		//  THANKFULLY THIS IS ONLY FOR RECORDING,
		//  AND NOT FOR REGULAR USE.

		const scene = obj.parent


		//  NOTE. THIS DOES NOT SEEM TO FUNCTION AS EXPECTED
		//  BECAUSE OF THE XR CAMERA RIG. COME BACK AND INVESTIGATE.

		obj.camera = scene.children.find( function( child ){
			return child.type === 'PerspectiveCamera'
		})


		//  Glob on the methods. No classes required :)
		//  Note that these will be added as REFERENCES
		//  rather than clones. Very little memory overhead!

		Object.entries( Handy.protos )
		.forEach( function( entry ){

			if( obj[ entry[ 0 ]] === undefined ) obj[ entry[ 0 ]] = entry[ 1 ]
		})


		//  Let’s keep a list of all handified objects
		//  which down the road will allow us to detect interactions
		//  like claps, time freeze, picture framing, etc.

		Handy.hands.push( obj )
	}
}


//  This is where we make good on our promise above
//  to append constants directly onto the Handy{} object like so:
//  Handy.INDEX_PHALANX_INTERMEDIATE === 7.
//  This exactly mirrors XRHand:
//  Handy.INDEX_PHALANX_INTERMEDIATE === XRHand.INDEX_PHALANX_INTERMEDIATE.

Handy.jointNames.forEach( function( name, i ){

	Handy[ name ] = i
})


//  Handy.hands is an Array of unlabeled hands
//  as we do not immediately know the handedness of a hand.
//  In your own update functions you may wish to do this:
//  var left  = Handy.hands.getLeft()
//  var right = Handy.hands.getRight()

Object.assign( Handy.hands, {

	getLeft: function(){

		return this.find( function( hand ){ 

			return hand.handedness === 'left'
		})
	},
	getRight: function(){

		return this.find( function( hand ){ 

			return hand.handedness === 'right'
		})
	}
})






    ////////////////
   //            //
  //   Protos   //
 //            //
////////////////


//  Let’s define all the methods we want to
//  glob on to any object that we “make handy”.
//  We’ll store them in Handy’s ‘protos’ object.
//  https://en.wikipedia.org/wiki/Prototype-based_programming

Object.assign( Handy.protos, {


	//  Traverse down this THREE.Group to find
	//  a child with an ‘xrInputSource’ property,
	//  which should have a ‘handedness’ property.
	//  This will both assign that value to this Handy object
	// (if such a value is found)
	//  and return the current ‘handedness’ of this Handy object.

	//  NOTE: Is there a more efficient way to do this??

	checkHandedness: function(){

		const hand = this
		this.traverse( function( obj ){

			if( obj.xrInputSource !== undefined &&
				obj.xrInputSource.handedness !== undefined ){

				hand.handedness = obj.xrInputSource.handedness
				hand.name = 'hand '+ hand.handedness			
			}
		})
		return this.handedness
	},


	//  Find the distance (in CENTIMETERS!) between two joints
	//  by using joint name Strings.
	//  You can use the constant style ‘INDEX_PHALANX_INTERMEDIATE’
	//  or a more friendly lowercase-and-spaces style:
	// “index phalanx intermediate”. Both are valid styles here.
	//  This makes writing the pose detection logic super legible.
	//  Here’s some pinch detection logic:
	//
	//      return this.distanceBetweenJoints(
	//
	//          'index phalanx tip',
	// 		    'thumb phalanx tip'
	//	
	//       ) < 3
	//
	//  Easy, right?! Now you can write your own! :)

	distanceBetweenJoints: function( jointNameA, jointNameB ){

		if( this.joints.length === 0 ) return NaN

		const
		hand = this,
		[ jointA, jointB ] = [ jointNameA, jointNameB ]
		.map( function( name ){

			return hand.joints[ 

				// Handy[ name.toUpperCase().replace( /\s+/g, '_' )]
				name.toLowerCase().replace( /\s+/g, '-' )
			]
		})

		if( jointA.position && 
			jointB.position &&
			( !jointA.position.equals( jointB.position ))){

			return jointA.position.distanceTo( jointB.position ) * 100
		}
		else return NaN
	},


	//  Find the angle (in DEGREES!) from a finger’s base to its tip.
	//  Here’s how to check if your index finger is extended:
	//
	//      return this.digitAngle( 'index' ) < 20
	//  
	//  Not bad, eh?

	digitAngle: function( fingerName ){

		fingerName = fingerName.toLowerCase()

		const
		fingerTip = fingerName === 'thumb' ? 
			this.joints[ 'thumb-tip' ] :
			this.joints[ fingerName +'-finger-tip' ],
		fingerProximal = fingerName === 'thumb' ?
			this.joints[ 'thumb-phalanx-proximal' ] :
			this.joints[ fingerName +'-finger-phalanx-proximal' ]

		if( fingerTip && 
			fingerProximal && 
			fingerTip.quaternion &&
			fingerProximal.quaternion ){

			return MathUtils.radToDeg( 

				fingerProximal.quaternion.angleTo( fingerTip.quaternion )
			)
		}
		return NaN
	},


	//  Some useful helper functions that
	//  check the angle from digit base to digit tip
	//  to determine if that digit is extended
	//  or contracted.

	digitIsExtended: function( digitName ){

		return this.digitAngle( digitName ) < 45
	},
	digitIsContracted: function( digitName ){

		return this.digitAngle( digitName ) > 110
	},


	//  Useful for assessing 
	//  what values you may want to use
	//  in your detection functions.

	reportDigits: function(){

		const hand = this
		Handy.digitNames
		.forEach( function( digitName ){

			const 
			proximalName = digitName === 'thumb' ?
				'thumb-phalanx-proximal' :
				digitName +'-finger-phalanx-proximal',
			tipName = digitName === 'thumb' ?
				'thumb-tip' : 
				digitName + '-finger-tip',
			distance = hand.distanceBetweenJoints(

				proximalName,
				tipName
			),
			digitAngle = hand.digitAngle( digitName )

			console.log( 

				hand.handedness, 
				digitName +'.', 
				'angle:',
				Math.round( digitAngle )+'˚',
				'distance:',
				( Math.round( distance * 10 ) / 10 ) +'cm',
				hand.digitIsExtended( digitName ) ?
					'is extended' :
					'is contracted'
			)
		})
	},






	    ////////////////
	   //            //
	  //   Record   //
	 //            //
	////////////////


	//  Take a snapshot of this hand’s pose.

	readLivePoseData: function(){

		const 
		hand  = this,
		wrist = hand.joints[ 'wrist' ],
		jointPositions    = [],
		digitTipPositions = [],


		//  Take a position in global space,
		//  and make it relative to the wrist joint position
		//  also taking into account the wrist’s rotation.
		// (So we cannot simply subtract position vectors here!
		//  We must multiply the full transform matrices!)
		//  Also, let’s round these positions to the nearest
		//  millimeter to make things tidier to look at
		//  and save string space when stored as JSON data.

		preparePosition = function( joint ){

			const 
			jointMatrix = joint.matrix
			.clone()
			.premultiply( 

				// new THREE.Matrix4().copy( wrist.matrixWorld.invert() )
				wrist.matrixWorld.clone().invert()
			)

			
			//  Extract the X, Y, Z positions from the resulting matrix
			//  and return this as a flat Array
			//  with distances rounded to the nearest millimeter.
			
			return [ 

				Math.round( jointMatrix.elements[ 12 ] * 1000 ),
				Math.round( jointMatrix.elements[ 13 ] * 1000 ),
				Math.round( jointMatrix.elements[ 14 ] * 1000 )
			]
		},


		//  Store head (camera) position relative to the wrist. 
		//  In the future we’ll use this to identify hand gestures
		//  that relate to the position of the head / body.

		//  NOTE: Camera position is unreliable because of XR camera rig.
		//  Need to come back and investigate alternatives.

		headPosition = 
			wrist !== undefined && !wrist.position.equals( Handy.VECTOR3_ZERO )
			? preparePosition( hand.camera )
			: null,
		headRotation = 
			headPosition === null
			? null
			: hand.camera.quaternion.toArray()


		//  Store the positions of each joint relative to the wrist.
		//  Note that if a position is not “ready” 
		//  then that entry in the Array will be undefined.
		//  This is important during pose detection:
		//  Undefined elements will NOT accrue “distance”, ie.
		//  If the pinky finger positions don’t matter to a particular
		//  hand pose, you can just delete those entries!

		
		Object.values( hand.joints )
		.forEach( function( joint, i ){

			// console.log( i, 'joint', joint )

			if( joint !== undefined &&
				joint.position !== undefined &&
				joint.position.equals( Handy.VECTOR3_ZERO ) === false ){

				const preparedPosition = preparePosition( joint )
				jointPositions[ i ] = preparedPosition

				if( Handy.isDigitTipIndex( i )){

					digitTipPositions.push( preparedPosition )
				}
			}
		})
		
		// for( let i = 0; i < hand.joints.length; i ++ ){
			// const joint = hand.joints[ i ]
		// 	if( joint !== undefined &&
		// 		joint.position !== undefined &&
		// 		joint.position.equals( Handy.VECTOR3_ZERO ) === false ){

		// 		const preparedPosition = preparePosition( joint )
		// 		jointPositions[ i ] = preparedPosition

		// 		if( Handy.isDigitTipIndex( i )){

		// 			digitTipPositions.push( preparedPosition )
		// 		}
		// 	}
		// }


		//  Package it up and send it off.

		return { 

			headPosition,
			headRotation,
			jointPositions,
			digitTipPositions
		}
	},


	//  Grab a snapshot of the live hand pose,
	//  output its data to the JavaScript console
	// (so you can copy and paste it into your poses file),
	//  and also add it to the poses list
	//  so you can query for it immediately :)

	recordLivePose: function( name, showIt ){

		const 
		hand = this,
		handedness = hand.checkHandedness(),
		pose = Object.assign(

			{
				names: [ name ],
				handedness,				
				handyRevision: Handy.REVISION,
				time: Date.now()
			},
			hand.readLivePoseData()
		)
		
		console.log( '\n\nPOSE DEFINITION\n\n'+ JSON.stringify( pose ) +',\n\n\n' )
		Handy.poses[ handedness ].push( pose )
		if( showIt ) hand.showPose( pose, hand.joints[ 0 ].matrixWorld )
		return pose
	},


	//  Did your pose record correctly just now?
	//  This is a quick and dirty way to see 
	// (within XR!) if it’s roughly correct.

	showPose: function( pose, matrix ){

		const
		hand  = this,
		handRoot = new Object3D(),
		size = 0.02

		pose.jointPositions
		.forEach( function( position ){

			const box = new Mesh(
				new BoxBufferGeometry( size, size, size ),
				new MeshBasicMaterial()
			)
			box.position.fromArray( position ).multiplyScalar( 0.001 )
			if( matrix !== undefined ){
			
				box.updateMatrix()
				box.matrix.multiply( matrix )
			}
			else {

				box.position.y += 1
			}
			handRoot.add( box )
		})
		handRoot.position.copy( hand.position )
		hand.camera.parent.add( handRoot )
	},


	//  We can also show previously recorded poses.

	showPoseByName: function( poseName, matrix ){

		const
		hand  = this,
		pose = Handy.poses[ hand.handedness ]
		.find( function( pose ){ 

			return pose.names.includes( poseName )
		})

		if( pose ) hand.showPose( pose, matrix )
	},






	    ////////////////
	   //            //
	  //   Search   //
	 //            //
	////////////////


	//  Upon casually discussing Handy with a good friend of mine,
	//  Robert Gerard Pietrusko (http://warning-office.org),
	//  he suggessted I try recording hand poses and measuring the
	//  Euclidean distance between them.
	//  https://en.wikipedia.org/wiki/K-means_clustering
	//  This turned out to be very efficient! Sort of like Word2Vec,
	//  but for hands. https://en.wikipedia.org/wiki/Word2vec
	//
 	//  Question is, do we try Cosine Distance in the future?
	//  https://cmry.github.io/notes/euclidean-v-cosine

	livePoseData: [],
	searchLoopBeganAt: null,
	searchLoopsCounter: 0,
	searchLoopsCounterMax: 0,
	searchPoseIndex: 0,
	searchResultsBuffer:  [],
	searchResults: [],
	searchResultsHistory: [],//  For future use. (Will add gesture recognition.)
	searchMethod: 'jointPositions',
	lastSearchResult: { name: 'null' },

	search: function(){
		
		const 
		hand   = this,
		handedness = hand.checkHandedness(),
		poses = Handy.poses[ handedness ],
		method = hand.searchMethod


		//  Is our handedness undefined?
		//  Do we have zero poses to detect?
		//  If so, bail immediately!

		if( poses === undefined || poses.length === 0 ) return


		//  We’re going to do some serious “Array clutching” here.
		//  That means we may NOT finish looping through the Array
		//  before we “run out of time.” Why do this? Because if we’re
		//  running at 72fps or 90fps, etc. and we really only need
		//  to do a full poses search a few times per second,
		//  then we have render loops to spare and we ought to get
		//  out of the way as quickly as possible so that YOU can
		//  use that render loop time for yourself :)

		//  If you want more performance than this, then it’s time
		//  for Web Workers. But for now this seems to do the trick.
		//  https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

		hand.searchLoopBeganAt = window.performance.now()
		for( let 
			
			i = hand.searchPoseIndex; 
			i < poses.length; 
			i ++ 
		){
		

			//  If we’re just beginning a new search
			//  we need to reset our results buffer
			//  and ask for new live hand pose data.

			if( i === 0 ){

				hand.searchLoopsCounter = 0
				hand.searchResultsBuffer = []
				hand.livePoseData = hand.readLivePoseData()


				//  If there’s no joint position data
				//  or if the wrist position of this hand is EXACTLY zero 
				// (in which case it’s likely ALL joint positions are zero)
				//  then this live data is useless. (So bail!)

				if( hand.livePoseData.jointPositions.length === 0 ||
					( 
						hand.livePoseData.jointPositions[ 0 ][ 0 ] === 0 &&
						hand.livePoseData.jointPositions[ 0 ][ 1 ] === 0 &&
						hand.livePoseData.jointPositions[ 0 ][ 2 ] === 0
					)){

					return
				}


				//  These flags assert that we are 
				//  NOT taking the square root of each distance.
				//  As this might change in the future
				//  I wanted a way for you to query / write logic
				//  around that.
				
				hand.searchResultsBuffer.distancesAreSquared = true
				hand.searchResultsBuffer.distancesAreRooted  = false
			}
	

			//  Go about our normal business.
			//  eg, evaluate the distance between this hand pose
			//  and the current-ish state of our real hand.

			const pose = poses[ i ]


			//  Currently we have two methods for detecting poses.
			// (Down from FOUR in a previous iteration! Sadly,
			//  the angles between wrist quaternion and digit tip
			//  weren’t sufficient once we added all of ASL.)
			//  We may eventually remove this digitTipPositions method
			//  as [all] jointPositions is obviously more accurate
			//  and seems speedy enough. 

			if( method === 'digitTipPositions' ){
				
				hand.searchResultsBuffer.push({

					pose,
					distance: pose.digitTipPositions
					.reduce( function( distance, digitTipPosition, i ){

						if( digitTipPosition.length !== undefined && 
							hand.livePoseData.digitTipPositions[ i ] !== undefined &&
							hand.livePoseData.digitTipPositions[ i ].length > 0 ){


							//  The “correct” way to do this is to take the square root
							//  of this sum. But find a square root is inherently slow.
							//  Thankfully we can do just as well by NOT taking the root.
							//  I leave it here (commented out) for your edification ;)

							distance += //Math.sqrt(

								Math.pow( digitTipPosition[ 0 ] - hand.livePoseData.digitTipPositions[ i ][ 0 ], 2 ) +
								Math.pow( digitTipPosition[ 1 ] - hand.livePoseData.digitTipPositions[ i ][ 1 ], 2 ) +
								Math.pow( digitTipPosition[ 2 ] - hand.livePoseData.digitTipPositions[ i ][ 2 ], 2 )
							//)
						}
						return distance

					}, 0 )
				})
			}
			else if( method === 'jointPositions' ){

				hand.searchResultsBuffer.push({

					pose,
					distance: pose.jointPositions
					.reduce( function( distance, jointPosition, i ){

						if( jointPosition.length !== undefined && 
							hand.livePoseData.jointPositions[ i ] !== undefined &&
							hand.livePoseData.jointPositions[ i ].length > 0 ){


							//  The “correct” way to do this is to take the square root
							//  of this sum. But find a square root is inherently slow.
							//  Thankfully we can do just as well by NOT taking the root.
							//  I leave it here (commented out) for your edification ;)

							distance += //Math.sqrt(

								Math.pow( jointPosition[ 0 ] - hand.livePoseData.jointPositions[ i ][ 0 ], 2 ) +
								Math.pow( jointPosition[ 1 ] - hand.livePoseData.jointPositions[ i ][ 1 ], 2 ) +
								Math.pow( jointPosition[ 2 ] - hand.livePoseData.jointPositions[ i ][ 2 ], 2 )
							//)
						}
						return distance

					}, 0 )
				})
			}


			//  Let’s keep track of how many loops it’s taking
			//  to finish searching through our whole poses library;
			//  accessible with something like:
			//  Handy.hands.getLeft().searchLoopsCounterMax

			hand.searchLoopsCounter ++
			hand.searchLoopsCounterMax = Math.max(

				hand.searchLoopsCounterMax,
				hand.searchLoopsCounter
			)


			//  Are we done? (If so, shut it down.)

			if( i === poses.length - 1 ){

				hand.searchResults = hand.searchResultsBuffer
				.sort( function( a, b ){

					return a.distance - b.distance
				})
				const searchResult = hand.searchResults[ 0 ]


				//   Does this search result differ from the previous one?

				if( hand.lastSearchResult.pose !== searchResult.pose ){

					if( hand.lastSearchResult && hand.lastSearchResult.pose ){


						//  Fire custom events.
						//  We need to fire events for each name
						//  that is associated with this pose.
						//  Why would there be multiple names??
						//  For example, “ASL_2” is the same as “Peace”.
						//  Someone unfamiliar with American Sign Language
						//  and only concerned with recognizing “peace”
						//  ought to have that convenience.
						// (And the other way ’round as well!)

						hand.lastSearchResult.pose.names
						.forEach( function( poseName ){

							hand.dispatchEvent({

								type: poseName +' pose ended', 
								hand,
								pose: hand.lastSearchResult.pose,
								

								//  Open question here:
								//  Should this “distance” property be from this pose’s
								//  previous top-result status (as it is currently)
								//  or should it be from its new not-top-result status?
	
								distance: hand.lastSearchResult.distance,
								message:  hand.handedness.toUpperCase() +
									' hand “'+ poseName +'” pose ended'+
									' at a Euclidean distance of '+ hand.lastSearchResult.distance +'mm.'
							})
						})

						
						//  Should you need it, 
						//  here’s an easy way to get a “from / to” alert.
						//  NOTE: Do we need to include distances in here too?

						hand.dispatchEvent({

							type: 'pose changed', 
							hand,
							resultWas: hand.lastSearchResult,
							resultIs:  searchResult,
							message:   hand.handedness.toUpperCase() +
								' hand pose changed from '+ 
								JSON.stringify( hand.lastSearchResult.pose.names ) +
								' to '+ 
								JSON.stringify( searchResult.pose.names ) +'.'
						})
					}
					

					searchResult.pose.names
					.forEach( function( poseName ){

						hand.dispatchEvent({

							type: poseName +' pose began', 
							hand,
							pose:     searchResult.pose,
							distance: searchResult.distance,
							message:  hand.handedness.toUpperCase() +
								' hand “'+ poseName +'” pose began'+
								' at a Euclidean distance of '+ searchResult.distance +'mm.'
						})
					})


					//  We’re ready to make it final.
					//  Replace the prior searh result 
					//  with the current search result.

					hand.lastSearchResult = searchResult
				}
				else {

					// console.log( 'Same hand pose as last time' )
				}
				

				//  Get things ready for next search.

				hand.searchIndex = 0
				hand.searchResultsBuffer = []


				//  Bail both from this local “for” loop 
				//  and from this entire function.

				return searchResult
			}

		
			//  If we’re not done with our search, 
			//  check if this search is taking too long per update() loop.

			else {


				//  If we’re taking too long
				//  let’s note what index we should start at next time
				//  and bail for now.

				if( window.performance.now() 
					- hand.searchLoopBeganAt 
					> Handy.searchLoopDurationLimit ){

					hand.findPoseIndex = i + 1
					break
				}
			}
		}
	},


	//  If the pose is the top search result
	// (or it’s in the results list above a given distance threshold)
	//  return the result itself so it includes 
	//  all of the pose data as well as distance.
	//  Otherwise return false.

	//  NOTE: This “threshold” argument is tricky
	//  because search() calculates distance in mm
	//  from the recorded model.
	//  But we might need NORMALIZED results instead.

	isPose: function( poseName, threshold ){

		const hand = this
		if( typeof threshold === 'number' ){
			
			const result = hand.searchResults
			.find( function( result ){ 

				return (

					result.distance <= threshold &&
					result.pose.names.includes( poseName )
				)
			})
			return result ? result : false
		}
		else if( hand.searchResults.length ){

			return hand.searchResults[ 0 ].pose.names.includes( poseName ) ?
				hand.searchResults[ 0 ] :
				false
		}
		return false
	},




	//  Some leftover debugging functions.

	comparePoses: function( poseAName, poseBName ){

		const 
		hand = this,
		posesList = Handy.poses[ hand.handedness ],
		poseA = posesList.find( function( pose ){ return pose.name === poseAName }),
		poseB = posesList.find( function( pose ){ return pose.name === poseBName })
		
		let
		poseDistanceAbs = 0,
		poseDistanceSqr = 0

		for( let i = 0; i < poseA.positions.length; i ++ ){

			const 
			positionA = poseA.positions[ i ],
			positionB = poseB.positions[ i ],
			jointDistanceAbs = 
				Math.abs( positionA[ 0 ] - positionB[ 0 ]) +
				Math.abs( positionA[ 1 ] - positionB[ 1 ]) +
				Math.abs( positionA[ 2 ] - positionB[ 2 ]),
			jointDistanceSqr = Math.sqrt(
				
				Math.pow( positionA[ 0 ] - positionB[ 0 ], 2 ) +
				Math.pow( positionA[ 1 ] - positionB[ 1 ], 2 ) +
				Math.pow( positionA[ 2 ] - positionB[ 2 ], 2 )
			)
			
			// console.log( 

			// 	'i', i, 
			// 	'\n', positionA, 
			// 	'\n', positionB, 
			// 	'\nSqr distance:', jointDistanceSqr,
			// 	'\nAbs distance:', jointDistanceAbs,
			// )

			poseDistanceAbs += jointDistanceAbs
			poseDistanceSqr += jointDistanceSqr
		}
		console.log( 

			'\nThe distance between', poseAName, 'and', poseBName, 'is', 
			'\nAbs:', poseDistanceAbs, 
			'\nSqr:', poseDistanceSqr, 
			'\n\n'
		)
		return poseDistanceSqr
	},
	compareAllTo: function( inputPose ){
		
		const
		hand = this,
		posesList = Handy.poses[ hand.handedness ]

		return posesList
		.reduce( function( list, pose ){ 

			return list.concat({ 

				name: pose.name, 
				distance: hands.left.comparePoses( 'Fist', pose.name )
			})

		}, [])
		.sort( function( a, b ){ 

			return a.distance - b.distance
		})
	},






	    ////////////////
	   //            //
	  //   Update   //
	 //            //
	////////////////


	//  Did you add a pose name to the Handy.poseNames Array?
	//  Did you also define a check function for it?
	//  If so, this function -- which you must remember to call 
	//  from within your update loop -- will check the status 
	//  of each pose, set the boolean flags accordingly,
	//  and fire off events on the frame when the state changes.

	update: function( callback ){

		const hand = this

		//  Do you believe in magic?

		hand.search()


		//  Are we supposed to do something?
		
		if( typeof callback === 'function' ) callback( hand )
	}
})




//  Announce yourself and make yourself available!

console.log( '\n\n👋 Handy (rev '+ Handy.REVISION +')\n\n\n' )
export { Handy }




/*


	 For my entire life I’ve been attracted to the stimulus
	 of my eyes and ears; the visual and musical arts.
	 I’ve made a lot of output to reflect that attraction.
	 On rare occasions I’ve been forced to confront the 
	 fact that some human bodies function differently than
	 others -- for example a friend of mine who couldn’t enjoy
	(or couldn’t NOT enjoy!) my early stereoscopic experiments
	 because his eyes and brain do not synthesize stereoscopic 
	 depth from his two monoscopic inputs. I don’t know how
	 to rectify my passion (and monetization) of the aural
	 and the visual within these contexts. Do I need to?

	 But something about defining hand poses for virtual reality
	 experiences has tripped a small alarm within me. Not everyone
	 has two hands. Not everyone has five digits on each hand.
	 The wonder I experience at traversing the threshold from the
	 physical world to the virtual world and “seeing myself”
	 from a first-person perspective as I hold out my hands...
	 That is not a universal experience. I’m not sure where to go 
	 from here but let’s make sure our wonderful XR community is 
	 having this conversation, eh? 


	 Stewart Smith
	 August 2020




	 Inclusion
	 https://en.wikipedia.org/wiki/Inclusion_(disability_rights)

	 Universal design
	 https://en.wikipedia.org/wiki/Universal_design

	 Accessibility
	 https://en.wikipedia.org/wiki/Accessibility

	 Ableism
	 https://en.wikipedia.org/wiki/Ableism




*/