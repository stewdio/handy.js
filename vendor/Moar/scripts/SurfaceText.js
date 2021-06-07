
//  Copyright © 2017, 2018, 2020 Moar Technologies Corp. See LICENSE for details.


import * as THREE from 'three'




function SurfaceText( options ){

	if( options === undefined ) options = {}
	
	if( options.canvas === undefined ) options.canvas = {}
	if( typeof options.canvas.width  !== 'number' ) options.canvas.width  = 512//  Pixels to render.
	if( typeof options.canvas.height !== 'number' ) options.canvas.height = 256//
	
	if( options.style === undefined ) options.style = {}
	if( options.style.fontFamily   === undefined ) options.style.fontFamily   = "'SF Pro Text', system-ui, -apple-system, 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
	if( options.style.fontSize     === undefined ) options.style.fontSize     = '20px'
	if( options.style.lineHeight   === undefined ) options.style.lineHeight   = ( parseFloat( options.style.fontSize ) * 1.2 ) +'px'
	if( options.style.textAlign    === undefined ) options.style.textAlign    = 'center'
	if( options.style.fillStyle    === undefined ) options.style.fillStyle    = 'white'
	if( options.style.textBaseline === undefined ) options.style.textBaseline = 'top'
	if( options.style.font         === undefined ) options.style.font         = options.style.fontSize +' '+ options.style.fontFamily

	if( options.virtual === undefined ) options.virtual = {}
	if( typeof options.virtual.width  !== 'number' ) options.virtual.width  = 0.050//  Meters in VR.
	if( typeof options.virtual.height !== 'number' ) options.virtual.height = 0.025//

	if( options.text === undefined ) options.text = ''
	if( typeof options.x !== 'number' ){

		if( options.style.textAlign === 'left' ) options.x = 0
		else if( options.style.textAlign === 'right' ) options.x = options.canvas.width
		else options.x = options.canvas.width / 2
	}
	if( typeof options.y !== 'number' ){

		if( options.style.textBaseline === 'top' ) options.y = 0
		else options.y = options.canvas.height / 2
	}


	const canvas  = document.createElement( 'canvas' )
	canvas.width  = options.canvas.width
	canvas.height = options.canvas.height

	const context = canvas.getContext( '2d' )
	Object.assign( context, options.style )

	const texture = new THREE.Texture( canvas )
	texture.needsUpdate = true

	const mesh = new THREE.Mesh(
	
		new THREE.PlaneGeometry( options.virtual.width, options.virtual.height ),
		new THREE.MeshBasicMaterial({

			map:         texture,
			side:        THREE.DoubleSide,
			transparent: true,
			blending:    THREE.AdditiveBlending,
			alphaTest:   0.5
		})
	)

	mesh.print = function( text ){

		if( text === undefined ) text = ''
		
		const 
		lines = text.split( '\n' ),
		lineHeight = parseFloat( options.style.lineHeight )

		let y = options.y
		if( options.style.textBaseline === 'top' ) y = 0
		else y = ( options.canvas.height / 2 ) - ( lineHeight * lines.length / 2 )

		context.clearRect( 0, 0, canvas.width, canvas.height )
		context.fillStyle = options.style.fillStyle// Why does Three clobber this?!
		// context.fillRect( 0, 0, canvas.width, canvas.height )		
		for( let i = 0; i < lines.length; i ++ ){

			context.fillText( lines[ i ], options.x, y + i * lineHeight )
		}
		texture.needsUpdate = true
	}
	mesh.destroy = function(){

		mesh.parent.remove( mesh )
		mesh.material.dispose()
		mesh.geometry.dispose()
		texture = undefined
		context = undefined
		canvas  = undefined
	}

	mesh.print( options.text )
	return mesh
}




export { SurfaceText }