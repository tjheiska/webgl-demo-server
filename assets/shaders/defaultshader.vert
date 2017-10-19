attribute vec2 vKey;
uniform sampler2D uCoord;
uniform mat4 uTransform;
uniform float uTexHeight;
uniform bool uTexFloatEnabled;
uniform float uNext;

float decodeFloatRGBA( vec4 rgba ) {
  return dot( rgba, vec4(1.0, 1.0 /255.0, 1.0 /65025.0, 1.0 /160581375.0) );
}

void main() {
	gl_PointSize = 2.0;
	vec4 coord;
	if ( uTexFloatEnabled ) {
		coord = texture2D( uCoord, vec2( vKey.x, vKey.y / uTexHeight ) );
	}
	else {
		float kx = vKey.x;
		vec4 x = texture2D( uCoord, vec2( kx, vKey.y / uTexHeight ) );
		kx += uNext;
		vec4 y = texture2D( uCoord, vec2( kx, vKey.y / uTexHeight ) );
		kx += uNext;
		vec4 z = texture2D( uCoord, vec2( kx, vKey.y / uTexHeight ) );
		coord.x = decodeFloatRGBA( x );
		coord.y = decodeFloatRGBA( y );
		coord.z = decodeFloatRGBA( z );
		coord.w = 1.0; 
	}
	gl_Position = uTransform * coord;
		
}