export class ConicalHelixGenerator {

	numSamples: number;
	private radius: number;
	private fractionBits: number;
	private i: number;

    public constructor( numSamples: number, radius: number, fractionBits: number) {
        this.numSamples = numSamples;
        this.radius = radius;
        this.fractionBits = fractionBits;
        this.i = 0;
    }
    public read (callback: any ) {
        console.log(this);
        var buffer : ArrayBuffer = new ArrayBuffer(12);
        var coord : Float32Array = new Float32Array(buffer);
        var shouldContinue : boolean = true;
        for (; shouldContinue; this.i++) {
            var t: number = this.i / this.numSamples * 2 * Math.PI;
            var x0: number = t * Math.cos(6 * t);
            var y0: number = t * Math.sin(6 * t);
            var z0: number = t;
            var theta: number  = Math.random() * 2 * Math.PI;
            var phi: number = Math.random() * Math.PI - Math.PI
                / 2.0;
            coord[0] = this.radius * Math.cos(theta)
                * Math.cos(phi) + x0;
            coord[1] = this.radius * Math.sin(phi) + y0;
            coord[2] = this.radius * Math.sin(theta)
                * Math.cos(phi) + z0;
            // Adjust coord to fraction precision
            // this helps png to pack data more compress
            if (this.fractionBits) {
                var mult: number = (2 << this.fractionBits);
                coord[0] = Math.floor(coord[0] * mult) / mult;
                coord[1] = Math.floor(coord[1] * mult) / mult;
                coord[2] = Math.floor(coord[2] * mult) / mult;
            }
            shouldContinue = callback(coord) &&
                (this.i < this.numSamples);
        }
    }
}
