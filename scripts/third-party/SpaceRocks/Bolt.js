
//  Copyright © 2017, 2018, 2020 Moar Technologies Corp. See LICENSE for details.


import * as THREE from '../Three/three.module.js'




function Bolt( scene, hand, joint ){


	//  You can only shoot so many bolts per second.
	//  If you’re trying to fire too much we just return
	//  undefined and nothing happens!

	const now = Date.now()
	if( hand.lastBoltFiredAt === undefined ) hand.lastBoltFiredAt = 0
	if( now - hand.lastBoltFiredAt < 130 ) return undefined
	hand.lastBoltFiredAt = now


	//  But it’s been long enough apparently, so let’s fire.

	THREE.Object3D.call( this )
	Bolt.all.push( this )


	//  Let’s make something to look at.

	const mesh = new THREE.Mesh( Bolt.geometry, Bolt.material )
	mesh.rotation.x = Math.PI / -2

	if( typeof hand.boltRotation === 'number' ){

		hand.boltRotation += Math.PI / 16
	}
	else hand.boltRotation = 0
	mesh.rotation.y = hand.boltRotation
	this.add( mesh )
	




	//  Ideally I’d like to use a PointLight here but that causes a 
	//  severe drop in FPS!

	// const light = new THREE.SpotLight( 0xFFFFFF )
	// light.castShadow = true
	// this.add( light )


	//	First, apply our hand joint’s matrix to this bolt
	//  so we have the correct rotation and correct-ish position.
	//  Then, we have to subtract the position of the universe!
	//  This is because when we fly, the universe moves, not us!
	//  Finally, bump the bolt out of the gun just enough so it’s
	//  entirely exited the barrel in its first frame. This way
	//  we don’t have to grow its length from 0 or use a mask or
	//  any of that extra overhead.
	//  Add that thing to the universe!

	this.applyMatrix4( joint.matrixWorld )


	//  Need to rptate around the X axis by 90 degrees

	//  this works for right hand, but is exactly opposite for left hand!
	// const tempQ = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 )

	const fix = hand.handedness === 'right' ? 2 : -2

	const tempY = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / fix )
	this.quaternion.multiply( tempY )


	// console.log( 'contrller.name', joint.name )
	// if( joint.name === 'Right' ){

	// 	const temp2 = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI )
	// 	this.quaternion.multiply( temp2 )
	// }



	// this.rotation.x += Math.PI / 2
	this.updateMatrix()
	this.scale.set( 1, 1, 1 )
	// this.position.sub( M.three.world.getWorldPosition() )
	// this.position.add( player.velocity )//  Quick fix.
	// this.position.add( this.getWorldDirection( new THREE.Vector3() ).normalize().multiplyScalar( Bolt.shotLength / -2 ))
	// this.position.add( this.getWorldDirection( new THREE.Vector3() ).normalize().multiplyScalar( Bolt.shotLength * -0.37 ))
	this.position.add( this.getWorldDirection( new THREE.Vector3() ).normalize().multiplyScalar( Bolt.shotLength * -0.5 ))
	this.scene = scene
	scene.add( this )



	// const temp = new THREE.Mesh( 

	// 	new THREE.IcosahedronBufferGeometry( 0.1, 1 ),
	// 	new THREE.MeshBasicMaterial({ color: 0x009900 })
	// )
	// temp.position.copy( this.position )
	// scene.add( temp )





	//  Probably a good idea if our bolt shoots in the correct
	//  direction relative to the hand joint.

	this.positionVelocity = this.getWorldDirection( new THREE.Vector3() ).normalize().multiplyScalar( -Bolt.speed )
	this.wait = 2

	//  Oh, but what about our player’s velocity?!

	// this.positionVelocity.add( player.velocity )


	this.positionInitial = new THREE.Vector3().copy( this.position )

	// console.log( 'BANG! (Currently '+ Bolt.all.length +' bolts.)' )
	const worldPosition = this.getWorldPosition( new THREE.Vector3() )
	// console.log( 'worldPosition', worldPosition )
	// console.log( 'this (bolt)', this )
}
Bolt.prototype = Object.create( THREE.Object3D.prototype )
Bolt.prototype.constructor = Bolt
// Bolt.prototype.wrap = wrap
Bolt.prototype.update = function( timeDelta ){


	//  We gotta move!

	const positionDelta = this.positionVelocity.clone().multiplyScalar( timeDelta )

	// Bolt.raycaster.set( this.getWorldPosition(), this.getWorldDirection().negate() )
	// Bolt.raycaster.far = this.position.distanceTo( positionDelta )
	// const intersections = Bolt.raycaster.intersectObjects( Bolt.possibleTargets, true )
	// if( intersections.length > 0 ){

	// 	const
	// 	hit = intersections[ 0 ],
	// 	obj = hit.object.parent
		
	// 	Bolt.destroy( this )
	// 	if( obj instanceof Rock ){
			
	// 		obj.explode( this.positionVelocity.clone().multiplyScalar( 0.3 ), obj.parent.worldToLocal( hit.point ))


	// 		//  NOTE: If we add Alien Shooters we will need to know if this bolt
	// 		//  was fired by the player or an alien before we adjust score!

	// 		player.boltsGood ++
	// 		player.accuracy = Math.round( player.boltsGood / player.boltsFired * 100 )
	// 		player.addToScore( obj.getValue() )
	// 	}
	// 	else if( obj instanceof Button ){

	// 		obj.action()
	// 	}
	// 	else if( obj === player ){

	// 		new Explosion( new THREE.Vector3())
	// 		player.markDeath()
	// 	}
	// 	return
	// }


	//  We’re not going to destroy a rock so we might as well make
	//  our move forward in space official.

	if( this.wait > 0 ){

		this.wait --
	}
	else {

		this.position.add( positionDelta )
	}
	this.children[ 0 ].rotation.y -= 0.15


	//  Bolts can only travel to the edge of the universe,
	//  then they vanish.
	//  Otherwise they keep on truckin’.

	// if( this.wrap() === true ){

	// 	Bolt.destroy( this )
	// 	return
	// }

	const distance = this.positionInitial.distanceTo( this.position )
	if( distance > 500 ){

		// console.log( 'distance at destroy time?', distance )
		Bolt.destroy( this )
		return
	}
}




Bolt.all        =  []
Bolt.speed      = 200//400//  Meters per second
Bolt.shotLength =  20
Bolt.geometry   = new THREE.CylinderGeometry( 0.06, 0.06, Bolt.shotLength, 7 )
// Bolt.geometry   = new THREE.CylinderGeometry( 1, 1, Bolt.shotLength, 7 )
Bolt.material   = new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
// Bolt.raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3(), 0, settings.radiusWrap )


Bolt.update = function( timeDelta ){

	//if( Mode.current.name === 'game play' ) Bolt.possibleTargets = Rock.all.concat( player )
	// if( Mode.current.name === 'game play' ) Bolt.possibleTargets = Rock.all
	// else Bolt.possibleTargets = Button.all
	

	Bolt.all.forEach( function( bolt ){ bolt.update( timeDelta ) })
}
Bolt.destroy = function( bolt ){

	// M.three.world.remove( bolt )
	bolt.scene.remove( bolt )
	bolt.children.forEach( function( child ){

		// if( child.material ) child.material.dispose()
		// if( child.geometry ) child.geometry.dispose()
	})
	this.all.splice( this.all.findIndex( function( e ){ return e === bolt }), 1 )
}




export { Bolt }