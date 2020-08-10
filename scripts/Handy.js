
//  Copyright © 2020 Stewart Smith. See LICENSE for details.


import * as THREE from './third-party/Three/three.module.js'




//  👋 Introducing Handy.js — 
//  a tiny shim to make defining and using hand shapes in WebXR easy! 
//  Built with Three.js and tested on the Oculus Quest. 
//  Handy creates boolean flags and events for your defined hand shapes.

//  You’ll need to add to the Handy.shapeNames Array 
//  and create a corresponding checkIsMyShape() function.
//  Have a look at checkIsPointShape() as an example.
//  See how easy this is?!

const Handy = {


	//  Do we want to throttle the amount that we
	//  actually perform shape checks?
	//  Do we REALLY need to check for a hand shape 
	//  every single frame at perhaps 90 fps?
	//  Probably not. So let’s define time duration
	//  in SECONDS to wait between performing checks. 
	//  This throttle is PER HAND.

	//  We’re putting this variable up here 
	//  at the very beginning of the Handy definition
	//  so it’s easy for you to locate, alter,
	//  and experiment with.

	throttleDuration: 0.1,


	//  Add the names of your custom shapes to this list
	//  and don’t forget to write check functions for your
	//  custom hand shapes down below!
	//  eg. ‘Pinch’ in this list requires a 
	// ‘checkIsPinchShape’ function below.
	
	shapeNames: [

		'Devil',
		'Dirty',
		'Fist',
		'L',
		'Pinch',
		'Point'
	],




	//  And now on to the boring constants...

	REVISION: 1,


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
	//  and you’ll get the value 'INDEX_PHALANX_INTERMEDIATE'.

	//  We also use this Array to append constants directly 
	//  onto the Handy{} object like so:
	//  Handy.INDEX_PHALANX_INTERMEDIATE === 7.
	//  This exactly mirrors XRHand:
	//  Handy.INDEX_PHALANX_INTERMEDIATE === XRHand.INDEX_PHALANX_INTERMEDIATE.

	jointNames: [

		'WRIST',                      //   0
		
		'THUMB_METACARPAL',           //   1
		'THUMB_PHALANX_PROXIMAL',     //   2
		'THUMB_PHALANX_DISTAL',       //   3
		'THUMB_PHALANX_TIP',          //   4

		'INDEX_METACARPAL',           //   5  This will always be NULL
		'INDEX_PHALANX_PROXIMAL',     //   6
		'INDEX_PHALANX_INTERMEDIATE', //   7
		'INDEX_PHALANX_DISTAL',       //   8
		'INDEX_PHALANX_TIP',          //   9

		'MIDDLE_METACARPAL',          //  10  This will always be NULL
		'MIDDLE_PHALANX_PROXIMAL',    //  11
		'MIDDLE_PHALANX_INTERMEDIATE',//  12
		'MIDDLE_PHALANX_DISTAL',      //  13
		'MIDDLE_PHALANX_TIP',         //  14

		'RING_METACARPAL',            //  15  This will always be NULL
		'RING_PHALANX_PROXIMAL',      //  16
		'RING_PHALANX_INTERMEDIATE',  //  17
		'RING_PHALANX_DISTAL',        //  18
		'RING_PHALANX_TIP',           //  19

		'LITTLE_METACARPAL',          //  20
		'LITTLE_PHALANX_PROXIMAL',    //  21
		'LITTLE_PHALANX_INTERMEDIATE',//  22
		'LITTLE_PHALANX_DISTAL',      //  23
		'LITTLE_PHALANX_TIP'          //  24
	],
	digitNames: [

		'THUMB',
		'INDEX',
		'MIDDLE',
		'RING',
		'LITTLE'
	],
	fingerNames: [

		'INDEX',
		'MIDDLE',
		'RING',
		'LITTLE'
	],


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


	//  Handy.makeHandy() expects an instance of THREE.Object3D,
	//  or anything that inherits from THREE.Object3D,
	//  and then injects additional functionality into that object.
	//  The intended use is with THREE’s XRHand model like so:
	//
	//    hand1 = renderer.xr.getHand( 0 )
	//	  Handy.makeHandy( hand1 )//  This is the magic line.
	//
	//  Now ‘hand1’ is handy! It’s that easy!
	//  Just remember to call hand.checkShapes() within your update loop.

	makeHandy: function( obj ){


		//  Recall that we’re throttling our hand shape checks
		//  according to Handy.throttleDuration.
		//  This throttling is PER HAND so each hand needs a 
		// “what time was it last time?” property.

		obj.lastThrottleTimestamp = 0


		//  Did you add a shape name to the Handy.shapeNames Array?
		//  If so, this will automatically create boolean flags for it.
		//  eg. We have a shape name called ‘Pinch’
		//  and this will create the flags ‘isPinchShape’
		//  as well as ‘wasPinchShape’.
		//  This allows us to check for hand shapes once
		//  and then rely on the booleans for greater efficiency.

		Handy.shapeNames.forEach( function( shapeName ){

			obj[  'is'+ shapeName ] =
			obj[ 'was'+ shapeName ] = false
		})


		//  And now we can just glob on all of the methods
		//  that will be defined in the Handy.protos{} object.
		//  This isn’t making copies of these methods,
		//  it’s making references to them. More efficient :)
		//  Yay for prototypal inheritance!
		//  https://en.wikipedia.org/wiki/Prototype-based_programming

		Object.entries( Handy.protos )
		.forEach( function( entry ){

			obj[ entry[ 0 ]] = entry[ 1 ]
		})
	}
}


//  This is where we make good on our promise above
//  to append constants directly onto the Handy{} object like so:
//  Handy.INDEX_PHALANX_INTERMEDIATE === 7.
//  This exactly mirrors XRHand:
//  Handy.INDEX_PHALANX_INTERMEDIATE === Handy.INDEX_PHALANX_INTERMEDIATE.

Handy.jointNames.forEach( function( name, i ){

	Handy[ name ] = i
})




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

	checkHandedness: function(){

		const scope = this
		this.traverse( function( obj ){

			if( obj.xrInputSource !== undefined &&
				obj.xrInputSource.handedness !== undefined ){

				scope.handedness = obj.xrInputSource.handedness
			}
		})
		return this.handedness
	},


	//  Find the distance (in METERS!) between two joints
	//  by using joint name Strings.
	//  You can use the constant style ‘INDEX_PHALANX_INTERMEDIATE’
	//  or a more friendly lowercase-and-spaces style:
	// ‘index phalanx intermediate’. Both are valid styles here.
	//  This makes writing the shape detection logic super legible.
	//  Here’s some pinch detection logic:
	//
	//      return this.distanceBetweenJoints(
	//
	//          'index phalanx tip',
	// 		    'thumb phalanx tip'
	//	
	//       ) < 0.03
	//
	//  Easy, right?! Now you can write your own! :)

	distanceBetweenJoints: function( jointNameA, jointNameB ){

		if( this.joints.length === 0 ) return NaN

		const
		scope = this,
		[ jointA, jointB ] = [ jointNameA, jointNameB ]
		.map( function( name ){

			return scope.joints[ 

				Handy[ name.toUpperCase().replace( /\s+/g, '_' )]
			]
		})

		if( jointA.position && 
			jointB.position &&
			( !jointA.position.equals( jointB.position ))){

			return jointA.position.distanceTo( jointB.position )	
		}
		else return NaN
	},
	digitAngle: function( fingerName ){

		fingerName = fingerName.toUpperCase()

		const
		fingerTip = this.joints[ Handy[ fingerName +'_PHALANX_TIP' ]],
		fingerProximal = this.joints[ Handy[ fingerName +'_PHALANX_PROXIMAL' ]]

		if( fingerTip && 
			fingerProximal && 
			fingerTip.quaternion &&
			fingerProximal.quaternion ){

			return THREE.MathUtils.radToDeg( 

				fingerProximal.quaternion.angleTo( fingerTip.quaternion )
			)
		}
		return NaN
	},


	//  Some useful helper functions that
	//  check the distance between 
	//  the base of a finger and its tip.

	digitIsExtended: function( digitName ){

		return this.digitAngle( digitName ) < 45

		// const threshold = 
		// 	digitName.toUpperCase() === 'THUMB' ?
		// 	0.03 :
		// 	0.06

		// return this.distanceBetweenJoints(

		// 	digitName +' phalanx proximal',
		// 	digitName +' phalanx tip'
		
		// ) >= threshold
	},
	digitIsContracted: function( digitName ){

		return this.digitAngle( digitName ) > 150

		// return this.distanceBetweenJoints(

		// 	digitName +' phalanx proximal',
		// 	digitName +' phalanx tip'
		
		// ) < 0.05
	},




	//  Useful for assessing 
	//  what values you may want to use
	//  in your detection functions.

	reportDigits: function(){

		const scope = this
		Handy.digitNames
		.forEach( function( digitName ){

			const 
			distance = scope.distanceBetweenJoints(

				digitName +' phalanx proximal',
				digitName +' phalanx tip'
			),
			digitAngle = scope.digitAngle( digitName )

			console.log( 

				scope.handedness, 
				digitName, 
				'angle (˚)',
				Math.round( digitAngle ),
				'distance (cm)',
				Math.round( distance * 1000 ) / 10,
				'isExtended?', 
				scope[ digitName.toLowerCase() +'IsExtended' ],
				'isContracted?',
				scope[ digitName.toLowerCase() +'IsContracted' ],
			)
		})
	},


	//  Did you add a shape name to the Handy.shapeNames Array?
	//  Did you also define a check function for it?
	//  If so, this function -- which you must remember to call 
	//  from within your update loop -- will check the status 
	//  of each shape, set the boolean flags accordingly,
	//  and fire off events on the frame when the state changes.

	checkShapes: function(){

		const timeNow = window.performance.now() / 1000
		if( timeNow - this.lastThrottleTimestamp < Handy.throttleDuration ){


			//  Bail from this function ASAP
			//  without even the courtesy of an else branch
			//  or waiting for an implicit return.

			return false
		}


		//  Ok, we’re ready to get down to business.
		//  Let’s set some booleans for efficiency.

		const hand = this
		Handy.digitNames
		.forEach( function( digitName ){

			hand[ digitName.toLowerCase() +'IsExtended' ] = hand.digitIsExtended( digitName )
			hand[ digitName.toLowerCase() +'IsContracted' ] = hand.digitIsContracted( digitName )
		})


		//  Ok, we’re ready to check for all of our
		//  listed and defined hand shapes.
					
		Handy.shapeNames
		.forEach( function( shapeName ){

			const 
			shape    = shapeName +'Shape',
			isShape  = 'is'+  shape,
			wasShape = 'was'+ shape

			hand[ isShape ] = hand[ 'checkIs'+ shape ]()
			if( hand[ isShape ]){

				if( !hand[ wasShape ]){

					hand.dispatchEvent({

						type: shapeName.toLowerCase() +' shape began', 
						hand,
						shape:   shapeName,
						message: hand.handedness.toUpperCase() +' hand '+ shapeName +' shape began'
					})
					hand[ wasShape ] = true
				}
			}
			else {

				if( hand[ wasShape ]){

					hand.dispatchEvent({

						type: shapeName.toLowerCase() +' shape ended', 
						hand,
						shape:   shapeName,
						message: hand.handedness.toUpperCase() +' hand '+ shapeName +' shape ended'
					})
					hand[ wasShape ] = false
				}
			}
		})


		//  Don’t forget to update our throttling timestamp.

		this.lastThrottleTimestamp = timeNow
	},






	    ///////////////////////////
	   //                       //
	  //   Shape definitions   //
	 //                       //
	///////////////////////////


	//  Index finger and little finger are extended,
	//  middle and ring finger are conracted,
	//  and the thumb tip rests on the ring finger.

	checkIsDevilShape: function(){

		return (

			this.indexIsExtended &&
			this.middleIsContracted &&
			this.ringIsContracted &&
			this.littleIsExtended &&
			this.distanceBetweenJoints(

				'thumb phalanx tip',
				'ring phalanx distal'

			) < 0.04
		)
	},


	//  Middle finger is extended,
	//  all other fingers are contracted,
	//  thumb tip lays on ring finger.

	checkIsDirtyShape: function(){

		return (

			this.indexIsContracted &&
			this.middleIsExtended &&
			this.ringIsContracted &&
			this.littleIsContracted &&
			this.distanceBetweenJoints(

				'thumb phalanx tip',
				'ring phalanx distal'

			) < 0.04
		)
	},


	//  For each finger check that its tip joint
	//  is close it its proximal joint
	//  and also check that the thumb tip joint
	//  is close to the middle finger’s 
	//  intermediate joint.

	checkIsFistShape: function(){

		return (

			this.indexIsContracted &&
			this.littleIsContracted &&
			this.middleIsContracted &&
			this.ringIsContracted &&
			this.distanceBetweenJoints(

				'thumb phalanx tip',
				'ring phalanx distal'

			) < 0.04
		)
	},


	// “She was looking kind of dumb 
	//  with her finger and her thumb
	//  In the shape of an ‘L’ on her forehead.”

	checkIsLShape: function(){

		return (

			this.thumbIsExtended &&
			this.indexIsExtended &&
			this.middleIsContracted &&
			this.ringIsContracted &&
			this.littleIsContracted
		)
	},


	//  Check only that the thumb tip
	//  is near the index finger tip,
	//  with no regard to remaining fingers.

	checkIsPinchShape: function(){
		
		return this.distanceBetweenJoints(

			'index phalanx tip',
			'thumb phalanx tip'
		
		) < 0.03
	},


	//  Index finger points outward
	//  while other fingers are curled inward
	//  and thumb tip rests on middle finger.

	checkIsPointShape: function(){

		return (

			this.indexIsExtended &&
			this.middleIsContracted &&
			this.ringIsContracted &&
			this.littleIsContracted &&
			this.distanceBetweenJoints(

				'thumb phalanx tip',
				'middle phalanx intermediate'
			
			) < 0.04
		)
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

	 But something about defining hand shapes for virtual reality
	 experiences has tripped a small alarm within me. Not everyone
	 has two hands. Not everyone has five digits on each hand.
	 The wonder I experience at traversing the threshold from the
	 physical world to the virtual world and “seeing myself”
	 from a first-person perspective as I hold out my hands...
	 That is not a universal experience. I’m not sure where to go 
	 from here but let’s make sure our wonderful XR community is 
	 having this conversation, eh? 


	 Stewart
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