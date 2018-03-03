let wogen = (function(){
	const wogen = {

	};


	return wogen;
})();

(function(wogen){

	function rand(n){
		return Math.random() * (n || 1);
	}

	function randInt(n) { 
		return Math.floor(rand(n)) + 1;
	}

	class Coords {
		constructor(x,y) {
			if (typeof x === 'object') { y = x.y; x = x.x; }
			this.x = x;
			this.y = y;
			this.check();
		}
		getDistance(coord) {
			coord.check();
			return Math.sqrt(
				Math.pow( (this.x - coord.x), 2)
				+ Math.pow( (this.y - coord.y), 2)
			);
		}
		check() {
			if (typeof this.x !== "number" || isNaN(this.x)) {
				console.error("Bad coord.x", this.x);
				this.x = 0;
			}
			if (typeof this.y !== "number" || isNaN(this.y)) {
				console.error("Bad coord.y", this.y);
				this.y = 0;
			}
			return this;    
		}
	}

	class WogenThing {
		merge() {
			for (let i = 0; i < arguments.length; i++) {
				this.mergeObject(arguments[i]);
			}
		}
		mergeObject(obj) {
			if (typeof obj !== 'object' || obj === null) {
				return;
			}
			for (let prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					this[prop] = obj[prop];
				}
			}
			return this;
		}
	}

	class World extends WogenThing {
		constructor(options) {
			super();
			this.width = 100;
			this.height = 100;
			this.light = 1;
			this.hue = [0,0,0];
			this.terrainTypes = {
				// Text from http://dwarffortresswiki.org/index.php/DF2014:Map_legend
				"W": {
					name: "Water",
					color: [0,50,150],
					text: "~" // ~≈
				},
				"P": {
					name: "Plains",
					color: [30,180,20],
					text: "." // ∙ "
				},
				"F": {
					name: "Forest",
					color: [30, 120, 50],
					text: "♣" // ♠
				},
				"M": {
					name: "Mountains",
					color: [120,110,120],
					text: "▲" // ∩
				},
				"D": {
					name: "Desert",
					color: [170,170,90],
					text: "∙"
				},
				"C": {
					name: "Coast",
					color: [150,150,70],
					text: ","
				},
			};
			this.terrainMarkers = [];
			this.terrain = [];
			this.merge(options);
			this.size = (this.width + this.height) / 2;
		}
		buildTerrainMarkers() {
			let i = this.size / 7;
			while (i-- > 0) {
				const xy = this.getRandomLoc(this.terrainMarkers, 4);
				const tm = new TerrainMarker({
					world: this,
					x: xy.x,
					y: xy.y
				});
				this.terrainMarkers.push(tm);
			}
		}
		buildTerrain() {
			const ts = 1;
			this.loopOverPoints((x, y, i) => {
				const k = this.getTerrainTypeAt(x, y);
				const p = new TerrainPoint({
					world: this,
					x: x,
					y: y,
					typeKey: k
				});
				this.terrain.push(p);
			}, ts);
		}
		loopOverPoints(fn, size) {
			const halfWidth = this.width / 2;
			const halfHeight = this.height / 2;
			let x = -halfWidth;
			let i = 0;
			while (x <= halfWidth) {
				let y = -halfHeight;
				while (y <= halfHeight) {
					fn(x, y, i);
					i++;
					y += size;
				}
				x += size;
			}
		}
		loopOverTerrain(fn) {
			let i = this.terrain.length - 1;
			while (i >= 0) {
				let t = this.terrain[i];
				fn(t, i);
				i--;
			};
		}
		loopOverTerrainInBounds(fn, bounds) {
			let i = this.terrain.length - 1;
			while (i >= 0) {
				let t = this.terrain[i];
				if (t.x < bounds.max.x && t.x > bounds.min.x && t.y < bounds.max.y && t.y > bounds.min.y) {
					fn(t, i);
				}
				i--;
			};
		}
		getMinCoords() {
			return {x: this.width / -2, y: this.height / -2};
		}
		getMaxCoords() {
			return {x: this.width / 2, y: this.height / 2};
		}
		getRandomLoc(notNear, minD, c) {
			const x = randInt(this.width) - (this.width / 2);
			const y = randInt(this.height) - (this.width / 2);
			let loc = new Coords(x, y); 
			if (typeof c === 'undefined') { c = 10000; }
			if (notNear && c > 0) {
				let tryAgain = false;
				notNear.forEach((w) => {
					let d = w.loc.getDistance(loc);
					if (d < minD) { tryAgain = true; /* console.log(w.name, d, minD, loc.x, loc.y, c); */ }
					//else { console.log(w.name, "OK", d, minD, loc.x, loc.y, c); }
				});
				if (tryAgain) {
					return this.getRandomLoc(notNear, --minD, --c);
				}
			}
			return loc;
		}
		getNearestThing(loc, near) {
			let o = this;
			let nearThing = null;
			near = near || Infinity;
			o.allThings.forEach((thing) => {
				let d = loc.getDistance(thing.loc);
				if (d <= near) {
					near = d;
					nearThing = thing;
				}
			});
			return nearThing;
		}
		getTerrainTypeAt(x, y) {
			let at = new Coords(x, y);
			let dMin = Infinity;
			let kMin = "Z";
			let k = "Z";
			this.terrainMarkers.forEach((t) => {
				let d = t.loc.getDistance(at);
				d *= t.power;
				let diff = Math.abs(d - dMin);
				if (d < dMin) {
					dMin = d;
					k = t.typeKey;
					kMin = k;
				}
				if (diff < 50 && kMin == "W" && t.typeKey != "W") {
					dMin = d;
					k = "C";
				}
			});
			return k;
		}
		keepInBounds(loc) {
			let h = this.half;
			loc.x = Math.min(Math.max(loc.x, h * -1), h);
			loc.y = Math.min(Math.max(loc.y, h * -1), h);
		}
		draw(c, s) { 
			let o = this;
			let bounds = s.getBoundaries();
			o.loopOverTerrainInBounds((t) => {
				t.draw(c,s);
			}, bounds);
		}
		toText() {
			let text = '';
			let lastX;
			this.loopOverTerrain((terrain, i) => {
				if (typeof lastX === 'number' && lastX !== terrain.loc.x) {
					text += '\n';
					lastX = terrain.loc.x;
					console.log('end');
				}
				lastX = terrain.loc.x;
				//console.log(terrain.loc.x, terrain.loc.y, lastX);
				const terrainText = this.terrainTypes[terrain.typeKey].text;
				text += terrainText;	
			});
			return text;
		}
	}

	class TerrainPoint extends WogenThing {
		constructor(options) {
			super();
			const defaults = {
				x: 0,
				y: 0,
				world: null,
				size: 1,
				typeKey: "W"
			};
			this.merge(this, defaults, options);
			this.loc = new Coords(this.x, this.y);
			this.color = this.world.terrainTypes[this.typeKey].color;
			this.randomizeColor();
		}
		randomizeColor() {
			this.color.forEach((c, i) => { 
				this.color[i] = Math.max(c - randInt(25), 0); 
			});			
		}
		getColorStyle(light, hue) {
			let o = this;
			let c = o.color.slice(0);
			if (o.visible) {
				if (o.typeKey == "W") {
					light = light * (randInt(500) == 1) ? 1.1 : 1;
				}
			} else {
				let wa = ((c[0] + c[1] + c[2]) / 3) * 2; // weighted average
				c.forEach((co, i) => { c[i] = (co + wa) / 3; });
				light *= 0.9;
				if (o.typeKey == "W") {
					light *= 0.8;
				}
			}
			light *= o.hp;
			c.forEach((co, i) => { c[i] = Math.round(co * light + hue[i]); });
			return "rgba(" + c.join(",") + "," + o.discovered + ")"	
		}
		draw(c, s) {
			let o = this;
			if (o.discovered) {
				let xy = s.getScreenXY(o.loc);
				let size = Math.ceil(o.size * s.zoom);
				c.fillStyle = o.getColorStyle(o.world.light, o.world.hue);
				c.fillRect(xy.x, xy.y, size, size);
			}
		}
	}

	class TerrainMarker extends WogenThing {
		constructor(options) {
			super();
			this.x = 0;
			this.y = 0;
			this.merge(options);
			this.power = 15 + randInt(5);
			this.loc = new Coords(this.x, this.y);

			let k = this.typeKey;
			if (typeof k != "string") {
				let r = rand();
				let d = this.loc.getDistance(new Coords(0,0));
				const worldHalfSize = this.world.size / 2;
				if (r < (d / worldHalfSize)) k = "W";
				else {
					r = rand();
					if (r < 0.5) k = "P";
					else if (r < 0.8) k = "F";
					else if (r < 0.9) k = "M";
					else k = "D";
				}
			}
			this.typeKey = k;
			
		}
		draw(c, s) {
			let pos = s.getScreenXY(this.loc);
			let color = this.world.terrainTypes[this.typeKey].color;
			let r = color[0] + 40, g = color[1] + 40, b = color[2];
			c.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
			c.fillRect(pos.x, pos.y, 4 * s.zoom, 4 * s.zoom);
		}
	}



	// Put class and world
	wogen.World = World;
	wogen.createWorld = function(options) {
		const w = new this.World(options);
		w.buildTerrainMarkers();
		w.buildTerrain();
		return w;
	};

})(wogen);