window.onload = function() {
	//Establishes the three main files: tileset, beard and the movie file. Defines a 'loaded' function to keep track.


	var mapOReq = new XMLHttpRequest();
	mapOReq.open("GET", "movies/dwarf_fortress.cmv", true);
	mapOReq.responseType = "arraybuffer";
	var debugging = document.getElementById("debug");
	var valueSpace = document.getElementById("values");
	var beardSet = true;
	var textures = [];

	var loadstate = 0;
	var filesToLoad = 3;

	var loaded = function() {
		loadstate++;
		if (loadstate >= filesToLoad) init();
	}

	//Check to use large/small tileset.
	var tileOReq = new Image();
	if (beardSet) {
		tileOReq.src = "curses_800x600.png";
	} else {
		tileOReq.src = "curses_640x300.png";
	};
	tileOReq.onload = function() {
		//Iterate through, to prerender a tileset for every colour.
		for (var i = 0; i < 16; i++) {
			var tempcanvas = document.createElement("canvas");
			tempcanvas.width = tileOReq.width;
			tempcanvas.height = tileOReq.height;
			var tempctx = tempcanvas.getContext("2d");
			tempctx.drawImage(tileOReq, 0, 0);
			tempctx.globalCompositeOperation = "source-atop";
			tempctx.fillStyle = colours[i];
			tempctx.fillRect(0, 0, tileOReq.width, tileOReq.height);
			graphics.font.push(tempcanvas);
		};
		loaded();
	}

	var beardOReq = new Image();
	beardOReq.src = "curses_800x600-beard.png";
	beardOReq.onload = function() {
		loaded();
	}

	//Defines a variety of methods and objects to store frame data, colours, tilesets. Frame and Sound classes are created, and the function toU32Int is defined.
	var movie = {
		newFile: false,
		columns: 0,
		rows: 0,
		numSounds: 0,
		delayThing: 0,
		sounds: [],
		frames: []
	};

	var graphics = {
		font: [],
		beards: ["#000000", "#000060", "#006000", "#006060", "#600000", "#600060", "#606000", "#909090", "#606060", "#0000bf", "#00bf00", "#00bfbf", "#bf0000", "#bf00bf", "#bfbf00", "#bfbfbf"]
	};

	var colours = ["#000000", "#000080", "#008000", "#008080", "#800000", "#800080", "#808000", "#c0c0c0", "#808080", "#0000ff", "#00ff00", "#00ffff", "#ff0000", "#ff00ff", "#ffff00", "#ffffff"];

	var Sound = function(name) {
		this.name = name;
		this.location = "sound/" + name + ".ogg";
	};

	var Frame = function(width, height) {
		this.data = new Uint8Array(2 * width * height);
	};

	function toU32Int(target, startVal) {
		var endVal = 0;
		for (var i = 0; i < 4; i++) {
			endVal += target[startVal + i] << i * 8;
		};
		return endVal;
	}

	//Begin processing our loaded movie. Start with a Uint8Array.
	mapOReq.onload = function() {
		array = new Uint8Array(mapOReq.response);
		//Now, read the header. Obtain relevant data (width, height, old/new filetype, frame delay, sound locations).
		if (array[0] == 17) {
			movie.newFile = true;
		} else {
			movie.newFile = false;
		};
		movie.columns = toU32Int(array, 4);
		movie.rows = toU32Int(array, 8);
		movie.delayThing = toU32Int(array, 12);
		movie.numSounds = toU32Int(array, 16);
		for (var i = 0; i < movie.numSounds; i++) {
			var nom = "";
			for (var r = 0; r < 50; r++) {
				var loc = r + 20 + (i * 50);
				if (array[loc] === 0) {
					break;
				} else {
					nom += String.fromCharCode(array[loc]);
				}
			};
			movie.sounds.push(new Sound(nom));
		};

		//Begin reading frame data.
		var frameStart = 12820 + 50 * movie.numSounds;
		while (frameStart < array.length) {
			var tempChunkLength = toU32Int(array, frameStart);
			var tempstring = "";
			frameStart += 6;
			for (var i = 0; i < tempChunkLength - 2; i++) {
				tempstring += String.fromCharCode(array[frameStart]);
				frameStart++;
			};
			//var tempByteArray = new Uint8Array(mapOReq.response, tempChunkLength, frameStart);
			//Feed JSZip our compressed data. Convert the data to a Uint8Array, have fun!
			var uncompressedData = JSZip.compressions["DEFLATE"].uncompress(tempstring);
			var offset = 0
			while (offset < uncompressedData.length) {
				var index = movie.frames.push(new Frame(movie.columns, movie.rows)) - 1;
				var index2 = 0;
				for (var x = 0; x < movie.columns; x++) {
					for (var y = 0; y < movie.rows; y++) {
						movie.frames[index].data[index2] = uncompressedData.charCodeAt(offset);
						index2 += 2;
						offset++;
					}
				}
				var index2 = 1;
				for (var x = 0; x < movie.columns; x++) {
					for (var y = 0; y < movie.rows; y++) {
						var attbyte = uncompressedData.charCodeAt(offset);
						var shift = attbyte >> 3
						movie.frames[index].data[index2] = ((shift & 7) << 4) + (attbyte & 7) + (shift & 8);
						//---------------------------------------------------------------//
						//VERY IMPORTANT CHANGE TO FILE FORMAT FOR FUTURE IMPLEMENTATIONS//
						//FORMAT IS NOW 0BBBIFFF, NOT 0IBBBFFF - this allows for way     //
						//easier colour knowledge (colour is stored entirely in one byte)//
						//---------------------------------------------------------------//
						index2 += 2;
						offset++;
					}
				}
			}
		}
		loaded();
	};
	mapOReq.send();
	var canvas = document.getElementById("canvas")
	var canvas2 = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	var ctx2 = canvas2.getContext("2d");
	var interval, tileHeight, tileWidth;

	function init() {
		//Perform beard magic!
		if (beardSet) {
			var tempcanvas = document.createElement("canvas");
			tempcanvas.width = beardOReq.width;
			tempcanvas.height = beardOReq.height;
			var tempctx = tempcanvas.getContext("2d");
			for (var i = 0; i < 16; i++) {
				tempctx.clearRect(0, 0, tempcanvas.width, tempcanvas.height);
				tempctx.drawImage(beardOReq, 0, 0);
				tempctx.globalCompositeOperation = "source-atop";
				tempctx.fillStyle = graphics.beards[i];
				tempctx.fillRect(0, 0, beardOReq.width, beardOReq.height);
				tempctx.globalCompositeOperation = "source-over";
				var tempctx2 = graphics.font[i].getContext("2d");
				tempctx2.drawImage(graphics.font[i], 0, 0);
				for (var r = 1; r < 3; r++) {
					tempctx2.drawImage(tempcanvas, 10 * r, 0);
				};
			};
		};
		//Prepare the canvases, variables for use. Begin rendering!
		tileWidth = tileOReq.width / 16;
		tileHeight = tileOReq.height / 16;
		canvas.width = movie.columns * tileWidth;
		canvas.height = movie.rows * tileHeight;
		canvas2.width = movie.columns * tileWidth;
		canvas2.height = movie.rows * tileHeight;
		glCan.width = movie.columns * tileWidth;
		glCan.height = movie.rows * tileHeight;
		initShaders();
		initBuffers();
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		sendGLColours();
		sendGLTileDims();
		sendTileMap();
		interval = setInterval(update, 10 + movie.delayThing * 10);
	}
	var index = 0;

	function update() {
		twoDCanvasRender();
		glCanvasRender();
		//drawScene();
		index++;
	}

	function twoDCanvasRender(){
		if (index >= movie.frames.length) {

		} else {
			ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
			var index2 = 0;
			for (var i = 0; i < movie.columns; i++) {
				for (var r = 0; r < movie.rows; r++) {
					xP = i * tileWidth;
					var yP = r * tileHeight;
					ctx.fillStyle = colours[(movie.frames[index].data[index2 + 1]) >> 4];
					ctx.fillRect(xP, yP, tileWidth, tileHeight);
					//FORMAT: context.drawImage(imageObj, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
					var sX = (movie.frames[index].data[index2] % 16) * tileWidth;
					var sY = (movie.frames[index].data[index2] >> 4) * tileHeight;
					ctx2.drawImage(graphics.font[(movie.frames[index].data[index2 + 1]) & 15], sX, sY, tileWidth, tileHeight, xP, yP, tileWidth, tileHeight);
					index2 += 2;
				};
			};
			ctx.drawImage(canvas2, 0, 0);
		};
	}

	function glCanvasRender() {
		if (index >= movie.frames.length) {
		}	else{
			generateFrameDataTex(gl, movie.frames[index]);
			drawScene();
		}
	}

	var glCan = document.getElementById("glcanvas");
	var gl = glCan.getContext("webgl");

	function initShaders() {
		var fragmentshader = getShader(gl, "movierender-fs");
		var vertexShader = getShader(gl, "movierender-vs");

		//

		shaderProg = gl.createProgram();
		gl.attachShader(shaderProg, vertexShader);
		gl.attachShader(shaderProg, fragmentshader);
		gl.linkProgram(shaderProg);

		//

		gl.useProgram(shaderProg);

		vertexPositionAttribute = gl.getAttribLocation(shaderProg, "aVertexPosition");
		gl.enableVertexAttribArray(vertexPositionAttribute);

	}

	function getShader(gl, id) {
		var shaderScript, theSource, currentChild, shader;

		shaderScript = document.getElementById(id);

		if (!shaderScript) {
			return null;
		}

		theSource = "";
		currentChild = shaderScript.firstChild;

		while (currentChild) {
			if (currentChild.nodeType == currentChild.TEXT_NODE) {
				theSource += currentChild.textContent;
			}

			currentChild = currentChild.nextSibling;
		}

		if (shaderScript.type == "x-shader/x-fragment") {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (shaderScript.type == "x-shader/x-vertex") {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;
		}

		gl.shaderSource(shader, theSource);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	}

	function initBuffers() {
		squareVerticesBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);

		var vertices = [
			1.0, 1.0, 0.0, -1.0, 1.0, 0.0,
			1.0, -1.0, 0.0, -1.0, -1.0, 0.0
		];

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	}

	function drawScene() {
		screenMatch();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
		gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.uniform1i(gl.getUniformLocation(shaderProg, "frame"), 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, textures[1]);
		gl.uniform1i(gl.getUniformLocation(shaderProg, "tiles"), 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, textures[2]);
		gl.uniform1i(gl.getUniformLocation(shaderProg, "colours"), 2);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	function screenMatch() {
		if (gl.viewportWidth != glCan.width || gl.viewportHeight != glCan.height) {
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		}
		gl.viewportWidth = glCan.width;
		gl.viewportHeight = glCan.height;
	}

	function sendGLColours() {
		var texan = new Uint8Array(4*colours.length);
		for (var i = 0; i < colours.length; i++) {
			var temp = colours[i].substr(1, 6);
			var arr = new Uint8Array([0, 0, 0, 0xff]);
			for (var j = 0; j < 3; j++) {
				arr[j] = parseInt("0x" + temp.substr(2 * j, 2));
			}
			texan.set(arr, 4*i)
		}
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, colours.length, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, texan); //Store frame data as a 512 by 512 texture, no one should need a file that large. I hope.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		
		textures[2] = texture;
	}

	function sendGLTileDims() {
		gl.uniform1f(gl.getUniformLocation(shaderProg, "tileDim[0]"), movie.columns);
		gl.uniform1f(gl.getUniformLocation(shaderProg, "tileDim[1]"), movie.rows);
		gl.uniform1f(gl.getUniformLocation(shaderProg, "viewDim[0]"), glCan.width);
		gl.uniform1f(gl.getUniformLocation(shaderProg, "viewDim[1]"), glCan.height);
		gl.uniform1f(gl.getUniformLocation(shaderProg, "tilesetWidth"), tileOReq.width);
	}

	function sendTileMap() {
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tileOReq);

		// Set the parameters so we can render any size image.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		textures[1] = texture;
	}

	function generateFrameDataTex(gl, frame) {
		var texture = gl.createTexture();
		blankUint.set(frame.data);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, blankUint); //Store frame data as a 512 by 512 texture, no one should need a file that large. I hope.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); //gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
		
		textures[0] = texture;
	}

	var blankUint = new Uint8Array(512 * 512 * 4);
}