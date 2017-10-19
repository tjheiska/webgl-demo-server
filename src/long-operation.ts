export class LongOperation {

	constructor( minIter: number, func: any, done: any ) {
		this.minIter = minIter;
		this.func = func;
		this.done = done;
	}

	public minIter: number;
	public func: any;
	public done: any;
	
}