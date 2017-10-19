import * as express from 'express';
import * as http from 'http';
import * as SocketIo from 'socket.io';
import * as fs from 'fs';
import { PNG } from 'pngjs';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';
import { mat4, vec3 } from 'gl-matrix';

import { ConicalHelixGenerator } 
	from './conical-helix';
import { LongOperation } from './long-operation';
import { InfoPage } from './info-page';

	//const https = require('https');
		//const http = require('http');
	//var server = https.createServer(options, app);
	//const io = require('socket.io')(server);
	//const ConicalHelixGenerator = require('conical-helix');
	//const fs = require('fs');

	/*const options = {
  	key: fs.readFileSync('/home/tjheiska/th-ohjelmistot.fi.key'),
  	cert: fs.readFileSync('/home/tjheiska/th-ohjelmistot.fi.crt')
	};*/

const TIMESLICE: number = 15;

class App {

	private app: any;
	private server: any;
	private io: any;
	private syncTime: number;
	private clients: Map< string, Client > = new Map< string, Client >();

	public constructor() {
		this.app = express();
		this.app.use( helmet() );
		this.app.use( cookieParser() );
		this.server = http.createServer( this.app );
		this.io = SocketIo( this.server, { cookie: false } );

		// Set sync
		setTimeout( this.sync.bind( this ), TIMESLICE );
		this.syncTime = new Date().getTime() + TIMESLICE;
	}

	private longOperation( longOp: LongOperation ) : void {
		let start : number = new Date().getTime();
		let syncTime : number = this.syncTime;
		let done: boolean = false;
		if ( start < syncTime ) {

			console.log('next sync in ' + ( syncTime - start ) + ' ms');
			let c : number = 1;
			done = true;
			longOp.func( () => {
				if ( !( c++ % longOp.minIter ) ) {
					let time : number = new Date().getTime();
					if ( time > syncTime ) {
						done = false;
						return false;
					}
				}
				return true;
			});
			console.log( ( new Date().getTime() - start ) + "ms" );
		}
		// operation continues
		if ( done ) {
			longOp.done();
		}
		else {
			setImmediate( this.longOperation.bind( this, longOp ) );
		}
	}


	public run() : void {	
	
		this.server.listen( 3000 );

		this.io.on('connection', (socket: any) => {

			socket.on( 'disconnect', ( reason: any ) => {
				console.log( 'client disconnected: ' + reason );
				this.clients.delete( socket.id );
			});

			socket.on( 'start',  () => {
				console.log( 'start ');
				/*
				let m: mat4 = mat4.ortho( mat4.create(),
					-2 * Math.PI, 2 * Math.PI,
					-2 * Math.PI, 2 * Math.PI,
					-2 * Math.PI, 2 * Math.PI );
				console.log( m );
				*/
				let m: mat4 = mat4.perspective(
					mat4.create(),
					45.0 / 180.0 * Math.PI,
					16.0 / 9.0,
					0.1,
					100
				);

				this.clients.set( socket.id, { 
					animation: new DefaultAnimation( new Date().getTime(), m 
				) } );

			});

			console.log( socket.id );
			let obj: any = null;
			fs.readFile('./webgl-config.json', 'utf8', (err: any, 
				data: string ) => {
				
				if ( err ) throw err;
				obj = JSON.parse( data );

				console.log('send initialize ' + obj );
				socket.emit('initialize', obj );
				
			});

		});


		this.app.get('/api/point-clouds', ( req: any, res: any ) => {

			let notFound : boolean = true;
			let q : any = req.query;
			console.log(q);
			if ( q.type == 'conical-helix' ) {
				if ( q.numSamples && q.radius && q.fractionBits ) {

					let h : ConicalHelixGenerator = new ConicalHelixGenerator( 
						q.numSamples, q.radius, q.fractionBits);
					console.log('create conical helix');

					let dim = Math.pow( 2, Math.ceil( Math.log( Math.sqrt( 
						q.numSamples * 4 ) ) / Math.log( 2 ) ) );
					let png : PNG = new PNG({
						width: dim,
						height: dim,
						colorType: 2
					});
					png.on('error', (err) => {
						console.error(err);
					});

					let i: number = 0;
					var lo = new LongOperation( 
						256, ( shouldContinue: any ) => {
							h.read( ( coord: Float32Array ) => {
								if ( i < 2 ) {
									let a: Uint8Array = 
									new Uint8Array( coord.buffer
										.slice( 0, 12 ) );
									console.log( a );
								}
								//console.log( coord );
								let data : Uint8Array = new Uint8Array( 
									coord.buffer );
								let idx = i * 4;
								png.data[idx] = data[0];
								png.data[idx + 1] = data[4];
								png.data[idx + 2] = data[8];
								png.data[idx + 3] = 255;

								idx += h.numSamples * 4;
								png.data[idx] = data[1];
								png.data[idx + 1] = data[5];
								png.data[idx + 2] = data[9];
								png.data[idx + 3] = 255;

								idx += h.numSamples * 4;
								png.data[idx] = data[2];
								png.data[idx + 1] = data[6];
								png.data[idx + 2] = data[10];
								png.data[idx + 3] = 255;

								idx += h.numSamples * 4;
								png.data[idx] = data[3];
								png.data[idx + 1] = data[7];
								png.data[idx + 2] = data[11];
								png.data[idx + 3] = 255;

								i++;
								return shouldContinue();
							});
						},
						() => {
							png.data[ 0 ] = 0;
							png.data[ 1 ] = 0;
							png.data[ 2 ] = 0;
							png.data[ 40000 ] = 0;
							png.data[ 40001 ] = 0;
							png.data[ 40002 ] = 0;
							png.data[ 80000 ] = 0;
							png.data[ 80001 ] = 0;
							png.data[ 80002 ] = 0;
							png.data[ 120000 ] = 0;
							png.data[ 120001 ] = 0;
							png.data[ 120002 ] = 0;
							console.log( 'write png' );
							res.writeHead(200, {'Content-Type': 'image/png'});
							png.pack().pipe(res);
						}
					);
					this.longOperation( lo );

					//res.writeHead( 200, {'Content-Type': 'text/html'});
					//res.end("Jeejeejee");
					notFound = false;
				}
			}
			if ( notFound ) {
				res.writeHead( 404, {'Content-Type': 'text/html'});
				res.end("404 Not Found");
			}
		});

		this.app.get( '/api/info-pages', ( _0: any, res:any ) => {

			// Read json array from file
			let hasError: boolean = false;
			let checkError: any = ( err:any ) :boolean => {
				if ( hasError ) return true;
				if ( err ) {
					hasError = true;
					console.log( err );
					res.writeHead( 404, {'Content-Type': 'text/html'});
					res.end("404 Not Found");
				}
				return hasError;
			}

			fs.readFile( __dirname + '/assets/info-pages.json', 'utf8',
				( err, data) => {

				if ( checkError( err ) ) return;

				let pages: InfoPage[] = JSON.parse( data );
				let queueLen: number = 0;
				let queueClosed: boolean = false;
				
				for ( let page of pages ) {
					if ( !page.src ) {
						throw 'invalid page declaration: source missing.';
					}
					queueLen++;
					fs.readFile( __dirname + '/assets/' + page.src, 'utf8', 
						( err, data ) => {

						if ( checkError( err ) ) return;
						page.html = data;
						if ( page.type && page.type == 'code' ) {
							page.html = '<pre>' + page.html + '</pre>';
						}
						delete page.src;
						queueLen--;

						// All done if queue empty and closed
						if ( ( !queueLen ) && ( queueClosed ) ) {
							console.log( pages );
							res.writeHead(200, 
								{'Content-Type': 'application/json'});
							res.end( JSON.stringify( pages ) );
						}

					} );
				}
				queueClosed = true;
			});
		});

		this.app.use( '/api/shaders/file-name', 
			express.static( __dirname + '/assets/shaders') );

	}

	private sync() {
		let time: number = new Date().getTime();
		//let lag: number = time - this.syncTime;
		setTimeout( this.sync.bind( this ), TIMESLICE );
		this.syncTime = time + TIMESLICE;
		this.clients.forEach( ( client: Client, id: string, _2 ) => {
			this.io.sockets.connected[ id ].emit('setMatrix', 
				client.animation.getMatrix().buffer );
		});
	}
}

export class KeyFrame {
	public time: number;
	public tZ: number;
	public rY: number;
	constructor( time: number, tZ: number, rY: number ) {
		this.time = time;
		this.tZ = tZ;
		this.rY = rY;
	}
}

export interface Animation {
	getMatrix( time?: number ): mat4;
}

export class DefaultAnimation implements Animation {
	
	private initialMatrix: mat4;
	private keyFrames: KeyFrame[] = [
		new KeyFrame( 0, 20.0, 0.0 ),
		new KeyFrame( 5000, 0, 0.0 ),
		new KeyFrame( 5000, -10.0, 0.0 ),
		new KeyFrame( 7000, -10.0, Math.PI ),
		new KeyFrame( 12000, 0.0, Math.PI ),
		new KeyFrame( 12000, 20.0, Math.PI ),
		new KeyFrame( 14000, 20.0, 0.0 )
	];
	private startTime: number;
	private currentIndex: number = 0;
	private totalDuration: number = 14000;

	public constructor( startTime: number, initialMatrix: mat4 ) {
		this.startTime = startTime;
		this.initialMatrix = initialMatrix;
	}

	public getMatrix( time?: number ): mat4 {

		var time: number | undefined = 
			( typeof time === 'undefined') ? new Date().getTime() : time;

		let relativeTime: number = ( time - this.startTime ) 
			% this.totalDuration;
		let next: number;
		let f0: any = null;
		let f1: any = null;
		let stop: boolean = false;

		while ( !stop ) {
			next = ( this.currentIndex + 1 ) % this.keyFrames.length;
			f0 = this.keyFrames[ this.currentIndex ];
			f1 = this.keyFrames[ next ];
			if ( ( f0.time <= relativeTime ) && ( f1.time >= relativeTime ) ) {
				stop = true;
			}
			else {
				this.currentIndex = next;
			}
		}

		const phase: number = ( relativeTime - f0.time ) / 
			( f1.time - f0.time );
		let tZ: number = f0.tZ * ( 1 - phase ) + f1.tZ * phase;
		let rY: number = f0.rY * ( 1 - phase ) + f1.rY * phase;

		let eye: vec3 = vec3.fromValues( 0.0, 0.0, tZ );
		let center: vec3 = vec3.rotateY( vec3.create(), 
			vec3.fromValues( 0.0, 0.0, tZ - 1.0 ),
			eye,
			rY 
		);
		let up: vec3 = vec3.fromValues( 0.0, 1.0, 0.0 );
		return mat4.mul( mat4.create(), this.initialMatrix,
			mat4.lookAt( mat4.create(),  eye, center, up ) );

	}
}

interface Client {
	animation: Animation; 
}

var app: App = new App();
export default app;