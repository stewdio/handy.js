
//  Copyright © 2017–2018, 2021 Stewart Smith. See LICENSE for details.


import * as THREE from 'three'
// import settings   from './settings.js'
// import player     from './player.js'
// import three      from './three.js'
// import Button     from './Button.js'
// import Explosion  from './Explosion.js'




//  Patch for Handy.js demo. 

const 
player = {

	position: new THREE.Vector3(),
	velocity: new THREE.Vector3()
},
settings = {

	radiusWrap: 300// meters.
},
three = {

	world: new THREE.Object3D()
}






function Bolt( controller ){


	//  Do we have enough ammo in the tanks?

	if( Bolt.all.length + 1 >= Bolt.maxMeshes ) return false


	//  This is just for debugging purposes.
	//  Set `window.Bolt = Bolt` somewhere so that Bolt
	//  becomes accessible from the global scope,
	//  then enter `new Bolt()` in the JS console,
	//  closely followed by `Bolt.all[ 0 ].position`
	//  to verify Bolt bits are functioning.

	if( controller === undefined ){
		
		controller = {

			matrixWorld: new THREE.Matrix4()
			.compose( 
				
				new THREE.Vector3(),
				new THREE.Quaternion(),
				new THREE.Vector3( 1, 1, 1 )
			),
			getWorldPosition: function(){

				return new THREE.Vector3( 0, 0, 0 )
			},
			getWorldDirection: function(){

				return new THREE.Vector3( 0, 0, 1 )
			}
		}
		// cannonRotation = Math.PI / 7
	}
	

	//  You can only shoot so many bolts per second.
	//  If you’re trying to fire too soon we’ll just
	//  return false and nothing happens. 
	//  Limiting here to a minimum of 130ms between blasts.
	//  And YES. This has a side effect of modifying the 
	//  controller object that’s passed in! (Sorry.)

	const now = Date.now()
	if( controller.lastBoltFiredAt === undefined ) controller.lastBoltFiredAt = 0
	// if( now - controller.lastBoltFiredAt < 130 ) return false
	if( now - controller.lastBoltFiredAt < 100 ) return false
	controller.lastBoltFiredAt = now

	
	//  Create a rotation so that the bolt is aimed 
	//  down the Z-axis, rather than up the Y-axis
	//  as is the default for cylinder geometry.

	const 
	rotation = new THREE.Euler(

		Math.PI / -2,
		0,
		0,//cannonRotation,
		'XYZ'
	),
	quaternion = new THREE.Quaternion()
		.setFromEuler( rotation )


	//  Our hand controller is in true global space
	//  but out bolt needs to be in “world” space
	//  which gets moved by our player’s engines.
	// (Engines don’t move our player, they move the universe!)
	//  So we need to clone the hand controller’s matrix
	//  but then subtract the universe’s position
	//  so that when we attach it to the universe
	//  it’s in the right spot.

	this.position = controller
		.getWorldPosition( new THREE.Vector3() )
		.sub( three.world.position )
	
	this.matrix = controller.matrixWorld
		.clone()
		.multiply( new THREE.Matrix4().makeRotationFromQuaternion( quaternion ))
		.setPosition( this.position )
		
	this.direction = controller
		.getWorldDirection( new THREE.Vector3() )
		.normalize()
	
	this.isFirstFrame = true 
	

	//  This will be used by our raycaster in update()
	//  so we’ll set it only once here
	//  and reuse it in each update loop.

	this.directionNegated = this.direction
		.clone()
		.negate()

	
	//  Probably a good idea if our bolt shoots 
	//  in the correct direction 
	//  relative to the hand controller
	//  and incorporates the player’s velocity.

	this.velocity = this.direction
		.multiplyScalar( -Bolt.speed )
		.add( player.velocity )


	//  Make it official.

	Bolt.mesh.setMatrixAt( Bolt.all.length, this.matrix )
	Bolt.all.push( this )
	Bolt.mesh.count = Bolt.all.length
}




const origin = new THREE.Vector3()
Object.assign( Bolt, {

	all:       [],//  A transform matrix and velocity per each bolt.
	speed:    400,//  Meters per second.
	size:      20,//  Length in meters.
	maxMeshes: 60,//  The most Mesh instances we will have available at once.
	raycaster: new THREE.Raycaster( 
		
		origin,
		origin,
		0,
		settings.radiusWrap
	),
	setup: function( world ){

		three.world = world//  For Handy.js


		//  Cylinders are vertical tubes that can be solid all around or
		//  partially unwrapped, have capped or uncapped ends, and so on.
		//  https://threejs.org/docs/#api/en/geometries/CylinderGeometry

		const 
		geometry = new THREE.CylinderGeometry(
			
			0.06,     //  Radius top in meters.
			0.06,     //  Radius bottom in meters.
			Bolt.size,//  Length in meters.
			7
		),
		positions = geometry.getAttribute( 'position' )


		//  We’d like to bump up the geometry coordinates
		//  so that the origin is not in the vertical center,
		//  but at the bottom. 
		//  ie. Add half a Bolt length to each Y coordinate
		//  so that the lowest Y coordinate will be 0
		//  instead of a negative number.

		for( let i = 0; i < positions.count; i ++ ){

			positions.setY( 
				
				i, 
				positions.getY( i ) + Bolt.size / 2
			)
		}


		//  Now we can create a SINGLE mesh
		//  that will be cloned on the graphics card
		//  meaning one single draw call 
		//  rather than several.
		//  https://threejs.org/docs/#api/en/objects/InstancedMesh

		Bolt.mesh = new THREE.InstancedMesh( 
		
			geometry,
			new THREE.MeshBasicMaterial(),
			Bolt.maxMeshes
		)
		three.world.add( Bolt.mesh )
		

		//  After the above InstancedMesh initialization
		//  we’ll set our instance count to 0
		//  since we begin with zero active bolts.

		Bolt.mesh.count = 0
	},
	update: function( timeDelta ){

		if( Bolt.all.length === 0 ) return


		//  Bolts can only travel to the edge of the universe,
		//  then they vanish.
		//  Otherwise they keep on truckin’.
		//  We only need to check the FIRST bolt 
		//  to see if it hit the edge of the universe
		//  because the bolt at the head of the Array
		//  will be furthest away.

		const worldPosition = Bolt.mesh
			.getWorldPosition( new THREE.Vector3() )
			.add( 
				
				new THREE.Vector3()
					.setFromMatrixPosition( Bolt.all[ 0 ].matrix )
			)
		if( worldPosition.distanceTo( player.position ) >= settings.radiusWrap ){
		
			Bolt.destroy( 0 )
			return false
		}


		//  What can our bolts collide with?
		//  If we’re playing the game 
		//  then those objects include rocks and ourself.
		//  Otherwise, it’s just menu buttons.

		// if( Mode.current.name === 'game play' ){
			
		// 	Bolt.possibleTargets = Rock.all//.concat( player )
		// }
		// else {
			
		// 	Bolt.possibleTargets = Button.all
		// }	


		const worldContainerMatrix = three.world.matrixWorld
		let i = 0
		while( i < Bolt.all.length ){


			//  Where are we now?
			//  What’s the *distance* we want to travel
			//  between now and the next frame?

			const 
			bolt = Bolt.all[ i ],
			// positionGlobal = new THREE.Vector3().setFromMatrixPosition( worldContainerMatrix.clone().multiply( bolt.matrix )),
			positionDelta  = bolt
				.velocity
				.clone()
				.multiplyScalar( timeDelta )

			
			//  In order to check for collisions
			//  we need to set an intersection detection ray
			//  that begins at our current position
			//  and extends outward in our bolt’s direction
			//  but only up to the distance our bolt will travel
			//  during this frame.

			//  ODD: The following “set” method wasn’t working for me
			//  so I had to manually set the raycaster’s ray!
			// Bolt.raycaster.set(
				
			// 	positionGlobal,
			// 	bolt.directionNegated
			// )
			/*
			Bolt.raycaster.ray.origin = positionGlobal
			Bolt.raycaster.ray.direction = bolt.directionNegated
			Bolt.raycaster.far  = positionDelta.length()
			const intersections = Bolt
				.raycaster
				.intersectObjects( Bolt.possibleTargets, true )


			//  Did we hit anything?

			if( intersections.length > 0 ){

				const
				hit = intersections[ 0 ],
				obj = hit.object.parent
				
				Bolt.destroy( i )
				if( obj instanceof Rock ){
					
					obj.explode(
						
						bolt.velocity.clone().multiplyScalar( 0.3 ), 
						obj.parent.worldToLocal( hit.point )
					)


					//  NOTE: If we ever add Alien Shooters
					//  we will need to know if this bolt
					//  was fired by the player or an alien 
					//  before we adjust score!

					player.boltsGood ++
					player.accuracy = Math.round( player.boltsGood / player.boltsFired * 100 )
					player.addToScore( obj.getValue() )
				}
				else if( obj instanceof Button ){

					obj.action()
				}
				else if( obj === player ){

					new Explosion( new THREE.Vector3())
					player.markDeath()
				}
			}


			//  Our bolt has not traveled to the end of the universe
			//  nor has it hit anything.
			//  So let’s just push it forward.

			else {
			*/
				if( bolt.isFirstFrame ){

					bolt.isFirstFrame = false
				}
				else {

					Bolt.mesh.setMatrixAt( i, 
						
						bolt.matrix.setPosition( 
							
							bolt.position
							.setFromMatrixPosition( bolt.matrix )
							.add( positionDelta ) 
						)
					)
				}
				i ++
			// }
		}
		Bolt.mesh.instanceMatrix.needsUpdate = true
	},
	destroy: function( i ){

		if( i === 0 ) Bolt.all.shift()
		else Bolt.all.splice( i, 1 )
		Bolt.mesh.count = Bolt.all.length
	}
})




// tasks.setups.add( Bolt.setup )
// tasks.updates.add( Bolt.update )
export default Bolt



