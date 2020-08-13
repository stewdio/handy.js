![Handy.js](./media/vr-hands.gif "Handy.js")  


👋 Handy.js
========================================================================
**Handy** makes defining and using custom hand shapes in WebXR a snap. 
Just name your hand shape (eg. “peace”) and write a function that 
defines the shape. **Handy** will create and update convenience booleans
that you can query in your update loop, and also creates custom events 
that you can listen for. **Handy** is built on 
[Three.js](https://threejs.org/) and currently supports the [Oculus 
Quest](https://www.oculus.com/quest/)—with device support expanding as 
more devices implement the [WebXR hand tracking 
API](https://immersive-web.github.io/webxr-hand-input/). This demo is 
live at [https://stewartsmith.io/handy](https://stewartsmith.io/handy)
and the open-source code repository is available at
[https://github.com/stewdio/handy.js](https://github.com/stewdio/handy.js).  

  
**Explore the demo**.
Make your hand into a “finger gun” shape, then tap your thumb down onto 
your middle finger to shoot lasers from your hand. Make a fist to cycle 
through different hand model styles. “Devil horns” toggle the 
hand-specific colors—red for right, green for left.


How to: Make it handy
------------------------------------------------------------------------
[Three.js](https://threejs.org/) already does the heavy lifting by
interacting with the [WebXR hand tracking 
API](https://immersive-web.github.io/webxr-hand-input/), creating a
[`THREE.Group`](https://threejs.org/docs/#api/en/objects/Group) per
each joint within a hand model, updating those joint positions /
rotations within its own update loop, and even creating multiple visual
models to use. (See Three’s [VR hand input profiles 
example](https://threejs.org/examples/#webxr_vr_handinput_profiles) and 
its [source 
code](https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_handinput_profiles.html)
for details.) But Three doesn’t include an easy way to define and listen
for hand shapes. (We use the term “shape” here rather than “gesture”
because “gesture” implies movement and a relationship to the body or 
other objects. **Handy** is primarily concerned with the basic shape of
a hand’s configuration.) Here’s how easy it is to “Handify” an existing 
Three.js hand input example:

```javascript
//  Use Three.js to hookup hand inputs:

handLeft  = renderer.xr.getHand( 0 )
handRight = renderer.xr.getHand( 1 )


//  Now use Handy to “Handify” them:

Handy.makeHandy( handLeft )
Handy.makeHandy( handRight )


````

Be sure to update your “handies” within your update loop:
```javascript

handLeft.update()
handRight.update()


```

And that’s it. You’re good to go 👍  
  
  
How to: Define a hand shape
------------------------------------------------------------------------
**Handy**’s `defineHandShape()` command requires a shape name `String`
and a `Function` for identifying the shape itself. This particular 
example defines a “peace” shape as having index and middle fingers that 
are extended and also spread apart, while the ring and little fingers 
are contracted as the thumb rests across the ring finger. 
  
```javascript
Handy.defineHandShape(

	'Peace',
	 function(){

		return (

			this.indexIsExtended &&
			this.middleIsExtended &&
			this.ringIsContracted &&
			this.littleIsContracted &&
			this.distanceBetweenJoints(

				'index phalanx tip',
				'middle phalanx tip'
			
			) > 2 &&
			this.distanceBetweenJoints(

				'thumb phalanx tip',
				'ring phalanx distal'
			
			) < 3
		)
	}
)


```
The shape name begins with an uppercase letter, though this is not 
strictly necessary. The units returned by `distanceBetweenJoints` are
_centimeters._ (Why use centimeters instead of the XR standard unit of 
meters? For the same reason we use centimeters in real life: When 
you’re measuring smaller things—hands—rather than larger 
things—rooms—it’s more convenient.) For a list of hand joint names and 
their locations on the hand see the [WebXR hand input API W3C 
draft](https://immersive-web.github.io/webxr-hand-input/).  
  
In addition to `distanceBetweenJoints`, another frequently used helper
method is `digitAngle` which returns the angle created between a digit’s
base and its tip. For example, to find the angle of your left hand’s 
index finger you would query `handLeft.digitAngle( 'index' )`. The unit 
returned is degrees rather than radians. For more detail on methods made
available to handified objects, see the [assignments to the 
`Handy.protos{}` object within `scripts/Handy.js` starting near line 
326](https://github.com/stewdio/handy.js/blob/master/scripts/Handy.js#L326).  
  
The above `defineHandShape()` command will automatically create the 
following `Boolean` flags on each “handified” object, and will update
these flags accordingly when the handified object’s `update()` method 
is called: `isPeaceShape` and `wasPeaceShape`. When these flags change,
the handified object will fire one of the following custom events: 
`peace shape began` or `peace shape ended`.  
  
  
How to: Listen for hand shapes
------------------------------------------------------------------------
Each handified object contains `Boolean` flags for each defined hand 
shape. Following the examples above, we can listen for a “peace” shape 
within our update loop like so:

```javascript

if( handLeft.isPeaceShape ){

	//  Do something the entire time
	//  that the “peace” shape exists.
}

```

We can also listen for custom events on the handified object itself.
Again, using the examples above we can listen for each time the “peace” 
shape appears or vanishes:

```javascript

handLeft.addEventListener( 

	'peace shape began', 
	 function( event ){

		//  Do something when the
		// “peace” shape appears.
	}
)
handLeft.addEventListener(

	'peace shape ended',
	 function( event ){

		//  Do something when the
		// “peace” shape vanishes.
	}
)

```  
The content of the passed `event` argument is:

```javascript
{
	type,  //  Event name, eg. “peace shape began”.
	hand,  //  Hand object itself.
	shape, //  Name of the shape identified.
	message//  Full description of the event, eg. “LEFT hand peace shape began”.
}

```  
  
  
A note on repetition
------------------------------------------------------------------------
It’s cleaner, more legible, and easier to debug when you write logic 
once and reuse it rather than copy and paste it multiple times. This 
quickly comes into play when dealing with hands; we often must apply the 
same logic to two things at once. One clean way of doing this is using
an `Array` literal to house the two hands, then use the `Array`’s
[`forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) 
method to operate on each hand in turn. Note the semicolon prefix before
the `Array` literal. [JavaScript does not require semicolons as line
endings and I do not believe in using them as such because they are 
merely typographic 
clutter.](https://quantumjavascript.app/contributing.html#JavaScript_style)
Because of this it’s somtimes necessary to include a semicolon ahead of
an expression beginning with an `Array` literal to ensure the 
interpreter does not mistake the literal for a property accessor for a 
preceding object.

```javascript
;[ handLeft, handRight ]
.forEach( function( hand ){

	hand.addEventListener( 

		'peace shape began', 
		 onPeaceShapeBegan
	)
	hand.addEventListener(

		'peace shape ended',
		 onPeaceShapeEnded
	)
})


```  
  
  
Requirements
------------------------------------------------------------------------
This code has been designed for the [Oculus 
Quest](https://www.oculus.com/quest/) headset, though device support
will expand as more devices implement the [WebXR hand tracking 
API](https://immersive-web.github.io/webxr-hand-input/). You’ll need to 
follow these steps before you can experience the demo yourself:  
  
1. In Oculus **settings**
enable automatic switching between regular hand controlles
and bare hands.

2. In the Oculus **browser**
visit [chrome://flags/](chrome://flags/).

3. Within the flags page, **enable** the 
“WebXR experiences with joints tracking” flag
(`#webxr-hands`).

4. Within the flags page, **disable** 
the “WebXR experiences with hands tracking” flag
(`#webxr-hands-tracking`).
Yes. _Disable_ it.
We’re at that funny early stage of the technology where 
things are not always what they seem.

5. Restart the Oculus browser
and visit this site again.
Use your hand controllers 
to click the “Enter VR” button.
Once you are inside the experience put your controllers down,
hold your hands out in front of you 
so that the headset can see them,
and enjoy! 😄  
  
  
Colophon
------------------------------------------------------------------------
I’m [Stewart](https://stewartsmith.io). These days I make WebXR things 
and [quantum computing](https://quantumjavascript.app/) things from my
home in Brooklyn NY. Black lives matter.  
  
  
  
  