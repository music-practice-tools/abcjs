/**
 * @author paulrosen
 */

/*global Class */
/*extern AbcTokenizer */

// this is a series of functions that get a particular element out of the passed stream.
// the return is the number of characters consumed, so 0 means that the element wasn't found.
// also returned is the element found. This may be a different length because spaces may be consumed that aren't part of the string.
// The return structure for most calls is { len: num_chars_consumed, token: str }
var AbcTokenizer = Class.create({
	initialize: function () {
		this.skipWhiteSpace = function(str) {
			for (var i = 0; i < str.length; i++) {
				if (!this.isWhiteSpace(str[i]))
					return i;
			}
			return str.length;	// It must have been all white space
		};
		var finished = function(str, i) {
			return i >= str.length;
		};
		this.eatWhiteSpace = function(line, index) {
			for (var i = index; i < line.length; i++) {
				if (!this.isWhiteSpace(line[i]))
					return i-index;
			}
			return i-index;
		};

		// This just gets the basic pitch letter, ignoring leading spaces, and normalizing it to a capital
		this.getKeyPitch = function(str) {
			var i = this.skipWhiteSpace(str);
			if (finished(str, i))
				return {len: 0};
			switch (str[i]) {
				case 'A':return {len: i+1, token: 'A'};
				case 'B':return {len: i+1, token: 'B'};
				case 'C':return {len: i+1, token: 'C'};
				case 'D':return {len: i+1, token: 'D'};
				case 'E':return {len: i+1, token: 'E'};
				case 'F':return {len: i+1, token: 'F'};
				case 'G':return {len: i+1, token: 'G'};
				case 'a':return {len: i+1, token: 'A'};
				case 'b':return {len: i+1, token: 'B'};
				case 'c':return {len: i+1, token: 'C'};
				case 'd':return {len: i+1, token: 'D'};
				case 'e':return {len: i+1, token: 'E'};
				case 'f':return {len: i+1, token: 'F'};
				case 'g':return {len: i+1, token: 'G'};
			}
			return {len: 0};
		};

		// This just gets the basic accidental, ignoring leading spaces, and only the ones that appear in a key
		this.getSharpFlat = function(str) {
			switch (str[0]) {
				case '#':return {len: 1, token: '#'};
				case 'b':return {len: 1, token: 'b'};
			}
			return {len: 0};
		};

		this.getMode = function(str) {
			var skipAlpha = function(str, start) {
				// This returns the index of the next non-alphabetic char, or the entire length of the string if not found.
				while (start < str.length && ((str[start] >= 'a' && str[start] <= 'z') || (str[start] >= 'A' && str[start] <= 'Z')))
					start++;
				return start;
			};

			var i = this.skipWhiteSpace(str);
			if (finished(str, i))
				return {len: 0};
			var firstThree = str.substring(i,i+3).toLowerCase();
			if (firstThree.length > 1 && firstThree[1] === ' ') firstThree = firstThree[0];	// This will handle the case of 'm'
			switch (firstThree) {
				case 'mix':return {len: skipAlpha(str, i), token: 'Mix'};
				case 'dor':return {len: skipAlpha(str, i), token: 'Dor'};
				case 'phr':return {len: skipAlpha(str, i), token: 'Phr'};
				case 'lyd':return {len: skipAlpha(str, i), token: 'Lyd'};
				case 'loc':return {len: skipAlpha(str, i), token: 'Loc'};
				case 'aeo':return {len: skipAlpha(str, i), token: 'm'};
				case 'maj':return {len: skipAlpha(str, i), token: ''};
				case 'ion':return {len: skipAlpha(str, i), token: ''};
				case 'min':return {len: skipAlpha(str, i), token: 'm'};
				case 'm':return {len: skipAlpha(str, i), token: 'm'};
			}
			return {len: 0};
		};

		this.getClef = function(str) {
			var strOrig = str;
			var i = this.skipWhiteSpace(str);
			if (finished(str, i))
				return {len: 0};
			// The word 'clef' is optional, but if it appears, a clef MUST appear
			var needsClef = false;
			var strClef = str.substring(i);
			if (strClef.startsWith('clef=')) {
				needsClef = true;
				strClef = strClef.substring(5);
				i += 5;
			}
			if (strClef.length === 0 && needsClef)
				return {len: i+5, warn: "No clef specified: " + strOrig};

			var j = this.skipWhiteSpace(strClef);
			if (finished(strClef, j))
				return {len: 0};
			if (j > 0) {
				i += j;
				strClef = strClef.substring(j);
			}
			var name = null;
			if (strClef.startsWith('treble'))
				name = 'treble';
			else if (strClef.startsWith('bass3'))
				name = 'bass3';
			else if (strClef.startsWith('bass'))
				name = 'bass';
			else if (strClef.startsWith('tenor'))
				name = 'tenor';
			else if (strClef.startsWith('alto2'))
				name = 'alto2';
			else if (strClef.startsWith('alto1'))
				name = 'alto1';
			else if (strClef.startsWith('alto'))
				name = 'alto';
			else if (strClef.startsWith('none'))
				name = 'none';
			else
				return {len: i+5, warn: "Unknown clef specified: " + strOrig};

			strClef = strClef.substring(name.length);
			j = this.isMatch(strClef, '+8');
			if (j > 0)
				name += "+8";
			else {
				j = this.isMatch(strClef, '-8');
				if (j > 0)
					name += "-8";
			}
			return {len: i+name.length+j, token: name, explicit: needsClef};
		};

		// This returns one of the legal bar lines
		this.getBarLine = function(str) {
			if (str[0] !== ':' && str[0] !== '|' && str[0] !== '[' && str[0] !== ']')
				return {len: 0};

			if (str.startsWith("]|")) return {len: 2, token: "bar_thick_thin"};
			if (str.startsWith(":||:")) return {len: 4, token: "bar_dbl_repeat"};
			if (str.startsWith(":|]|:")) return {len: 5, token: "bar_dbl_repeat"};
			if (str.startsWith(":|]")) return {len: 3, token: "bar_right_repeat"};
			if (str.startsWith(":||")) return {len: 3, token: "bar_right_repeat"};
			if (str.startsWith(":|")) return {len: 2, token: "bar_right_repeat"};
			if (str.startsWith("::")) return {len: 2, token: "bar_dbl_repeat"};
			if (str.startsWith("[|:")) return {len: 3, token: "bar_left_repeat"};
			if (str.startsWith("[|]")) return {len: 3, token: "bar_invisible"};
			if (str.startsWith("[|")) return {len: 2, token: "bar_thick_thin"};
			if (str.startsWith("[")) {
				if ((str[1] >= '1' && str[1] <= '9') || str[1] === '"')
					return {len: 1, token: "bar_invisible"};
				return {len: 0};
			}
			if (str.startsWith("||:")) return {len: 3, token: "bar_left_repeat"};
			if (str.startsWith("|:::::")) return {len: 6, token: "bar_left_repeat"};
			if (str.startsWith("|::::")) return {len: 5, token: "bar_left_repeat"};
			if (str.startsWith("|:::")) return {len: 4, token: "bar_left_repeat"};
			if (str.startsWith("|::")) return {len: 3, token: "bar_left_repeat"};
			if (str.startsWith("|:")) return {len: 2, token: "bar_left_repeat"};
			if (str.startsWith("||")) return {len: 2, token: "bar_thin_thin"};
			if (str.startsWith("|]")) return {len: 2, token: "bar_thin_thick"};
//			if (str.startsWith("|[")) return { len: 2, token: "bar_thin_thick" };
			if (str.startsWith("|")) return {len: 1, token: "bar_thin"};
			return {len: 1, warn: "Unknown bar symbol"};
		};

		// this returns all the characters in the string that match one of the characters in the legalChars string
		this.getTokenOf = function(str, legalChars) {
			for (var i = 0; i < str.length; i++) {
				if (legalChars.indexOf(str[i]) < 0)
					return {len: i, token: str.substring(0, i)};
			}
			return {len: i, token: str};
		};

		this.getToken = function(str, start, end) {
			// This returns the next set of chars that doesn't contain spaces
			var i = start;
			while (i < end && !this.isWhiteSpace(str[i]))
				i++;
			return str.substring(start, i);
		};

		// This just sees if the next token is the word passed in, with possible leading spaces
		this.isMatch = function(str, match) {
			var i = this.skipWhiteSpace(str);
			if (finished(str, i))
				return 0;
			if (str.substring(i).startsWith(match))
				return i+match.length;
			return 0;
		};

		// This gets an accidental marking for the key signature. It has the accidental then the pitch letter.
		this.getKeyAccidental = function(str) {
			var accTranslation = {
				'^': 'sharp',
				'^^': 'dblsharp',
				'=': 'natural',
				'_': 'flat',
				'__': 'dblflat'
			};
			var i = this.skipWhiteSpace(str);
			if (finished(str, i))
				return {len: 0};
			var acc = null;
			switch (str[i])
			{
				case '^':
				case '_':
				case '=':
					acc = str[i];
					break;
				default:return {len: 0};
			}
			i++;
			if (finished(str, i))
				return {len: 1, warn: 'Expected note name after accidental'};
			switch (str[i])
			{
				case 'a':
				case 'b':
				case 'c':
				case 'd':
				case 'e':
				case 'f':
				case 'g':
				case 'A':
				case 'B':
				case 'C':
				case 'D':
				case 'E':
				case 'F':
				case 'G':
					return {len: i+1, token: {acc: accTranslation[acc], note: str[i]}};
				case '^':
				case '_':
					acc += str[i];
					i++;
					if (finished(str, i))
						return {len: 2, warn: 'Expected note name after accidental'};
					switch (str[i])
					{
						case 'a':
						case 'b':
						case 'c':
						case 'd':
						case 'e':
						case 'f':
						case 'g':
						case 'A':
						case 'B':
						case 'C':
						case 'D':
						case 'E':
						case 'F':
						case 'G':
							return {len: i+1, token: {acc: accTranslation[acc], note: str[i]}};
						default:
							return {len: 2, warn: 'Expected note name after accidental'};
					}
					break;
				default:
					return {len: 1, warn: 'Expected note name after accidental'};
			}
		};

		this.isWhiteSpace = function(ch) {
			return ch === ' ' || ch === '\t' || ch === '\x12';
		};

		this.getMeat = function(line, start, end) {
			// This removes any comments starting with '%' and trims the ends of the string so that there are no leading or trailing spaces.
			// it returns just the start and end characters that contain the meat.
			var comment = line.indexOf('%', start);
			if (comment >= 0 && comment < end)
				end = comment;
			while (start < end && (line[start] === ' ' || line[start] === 't' || line[start] === '\x12'))
				start++;
			while (start < end && (line[end-1] === ' ' || line[end-1] === 't' || line[end-1] === '\x12'))
				end--;
			return {start: start, end: end};
		};

		this.tokenize = function(line, start, end) {
			// this returns all the tokens inside the passed string. A token is a punctuation mark, a string of digits, a string of letters.
			//  Quoted strings are one token.
			// The type of token is returned: quote, alpha, number, punct
			var ret = this.getMeat(line, start, end);
			start = ret.start;
			end = ret.end;
			var tokens = [];
			var i;
			while (start < end) {
				if (line[start] === '"') {
					i = start+1;
					while (i < end && line[i] !== '"') i++;
					tokens.push({ type: 'quote', token: line.substring(start+1, i)});
					i++;
				} else if ((line[start] >= 'A' && line[start] <= 'Z') || (line[start] >= 'a' && line[start] <= 'z')) {
					i = start+1;
					while (i < end && ((line[i] >= 'A' && line[i] <= 'Z') || (line[i] >= 'a' && line[i] <= 'z'))) i++;
					tokens.push({ type: 'alpha', token: line.substring(start, i)});
					start = i + 1;
				} else if ((line[start] >= '0' && line[start] <= '9')) {
					i = start+1;
					while (i < end && line[i] >= '0' && line[i] <= '9') i++;
					tokens.push({ type: 'number', token: line.substring(start, i)});
					start = i + 1;
				} else if (line[start] === ' ') {
					i = start+1;
				} else {
					tokens.push({ type: 'punct', token: line[start]});
					i = start+1;
				}
				start = i;
			}
			return tokens;
		}

		this.getVoiceToken = function(line, start, end) {
			// This finds the next token. A token is delimited by a space or an equal sign. If it starts with a quote, then the portion between the quotes is returned.
			var i = start;
			while (i < end && this.isWhiteSpace(line[i]) || line[i] === '=')
				i++;

			if (line[i] === '"') {
				var close = line.indexOf('"', i+1);
				if (close === -1 || close >= end)
					return {len: 1, err: "Missing close quote"};
				return {len: close-start, token: this.translateString(line.substring(i+1, close))};
			} else {
				var ii = i;
				while (ii < end && !this.isWhiteSpace(line[ii]) && line[ii] !== '=')
					ii++;
				return {len: ii-start+1, token: line.substring(i, ii)};
			}
		};

		var charMap = {
			"`a": 'à', "'a": "á", "^a": "â", "~a": "ã", "\"a": "ä", "oa": "å", "=a": "ā", "ua": "ă", ";a": "ą",
			"`e": 'è', "'e": "é", "^e": "ê", "\"e": "ë", "=e": "ē", "ue": "ĕ", ";e": "ę", ".e": "ė",
			"`i": 'ì', "'i": "í", "^i": "î", "\"i": "ï", "=i": "ī", "ui": "ĭ", ";i": "į",
			"`o": 'ò', "'o": "ó", "^o": "ô", "~o": "õ", "\"o": "ö", "=o": "ō", "uo": "ŏ", "/o": "ø",
			"`u": 'ù', "'u": "ú", "^u": "û", "~u": "ũ", "\"u": "ü", "ou": "ů", "=u": "ū", "uu": "ŭ", ";u": "ų",
			"`A": 'À', "'A": "Á", "^A": "Â", "~A": "Ã", "\"A": "Ä", "oA": "Å", "=A": "Ā", "uA": "Ă", ";A": "Ą",
			"`E": 'È', "'E": "É", "^E": "Ê", "\"E": "Ë", "=E": "Ē", "uE": "Ĕ", ";E": "Ę", ".E": "Ė",
			"`I": 'Ì', "'I": "Í", "^I": "Î", "~I": "Ĩ", "\"I": "Ï", "=I": "Ī", "uI": "Ĭ", ";I": "Į", ".I": "İ",
			"`O": 'Ò', "'O": "Ó", "^O": "Ô", "~O": "Õ", "\"O": "Ö", "=O": "Ō", "uO": "Ŏ", "/O": "Ø",
			"`U": 'Ù', "'U": "Ú", "^U": "Û", "~U": "Ũ", "\"U": "Ü", "oU": "Ů", "=U": "Ū", "uU": "Ŭ", ";U": "Ų",
			"ae": "æ", "AE": "Æ", "oe": "œ", "OE": "Œ", "ss": "ß",
			"'c": "ć", "^c": "ĉ", "uc": "č", "cc": "ç", ".c": "ċ", "cC": "Ç", "'C": "Ć", "^C": "Ĉ", "uC": "Č", ".C": "Ċ",
			"~n": "ñ",
			"=s": "š"

// More chars: Ñ Ĳ ĳ Ď ď Đ đ Ĝ ĝ Ğ ğ Ġ ġ Ģ ģ Ĥ ĥ Ħ ħ Ĵ ĵ Ķ ķ ĸ Ĺ ĺ Ļ ļ Ľ ľ Ŀ ŀ Ł ł Ń ń Ņ ņ Ň ň ŉ Ŋ ŋ   Ŕ ŕ Ŗ ŗ Ř ř Ś ś Ŝ ŝ Ş ş Š Ţ ţ Ť ť Ŧ ŧ Ŵ ŵ Ŷ ŷ Ÿ ÿ Ÿ Ź ź Ż ż Ž ž
		};
		var charMap2 = {
			"251": "©"
		};
		this.translateString = function(str) {
			var arr = str.split('\\');
			if (arr.length === 1) return str;
			var out = null;
			arr.each(function(s) {
				if (out === null)
					out = s;
				else if (s.length < 2)
					out += "\\" + s;
				else {
					var c = charMap[s.substring(0, 2)];
					if (c !== undefined)
						out += c + s.substring(2);
					else {
						c = charMap2[s.substring(0, 3)];
						if (c !== undefined)
							out += c + s.substring(3);
						else
							out += "\\" + s;
					}
				}
			});
			return out;
		};
		var getNumber = function(line, index) {
			var num = 0;
			while (index < line.length) {
				switch (line[index]) {
					case '0':num = num*10;index++;break;
					case '1':num = num*10+1;index++;break;
					case '2':num = num*10+2;index++;break;
					case '3':num = num*10+3;index++;break;
					case '4':num = num*10+4;index++;break;
					case '5':num = num*10+5;index++;break;
					case '6':num = num*10+6;index++;break;
					case '7':num = num*10+7;index++;break;
					case '8':num = num*10+8;index++;break;
					case '9':num = num*10+9;index++;break;
					default:
						return {num: num, index: index};
				}
			}
			return {num: num, index: index};
		};

		this.getFraction = function(line, index) {
			var num = 1;
			var den = 1;
			if (line[index] !== '/') {
				var ret = getNumber(line, index);
				num = ret.num;
				index = ret.index;
			}
			if (line[index] === '/') {
				index++;
				if (line[index] === '/') {
					var div = 0.5;
					while (line[index++] === '/')
						div = div /2;
					return {value: num * div, index: index-1};
				} else {
					var iSave = index;
					var ret2 = getNumber(line, index);
					if (ret2.num === 0 && iSave === index)	// If we didn't use any characters, it is an implied 2
						ret2.num = 2;
					if (ret2.num !== 0)
						den = ret2.num;
					index = ret2.index;
				}
			}

			return {value: num/den, index: index};
		};

		this.theReverser = function(str) {
			if (str.endsWith(", The"))
				return "The " + str.substring(0, str.length-5);
			if (str.endsWith(", A"))
				return "A " + str.substring(0, str.length-3);
			return str;
		};

		this.stripComment = function(str) {
			var i = str.indexOf('%');
			if (i >= 0)
				return str.substring(0, i).strip();
			return str.strip();
		};

		this.getInt = function(str) {
			// This parses the beginning of the string for a number and returns { value: num, digits: num }
			// If digits is 0, then the string didn't point to a number.
			var x = parseInt(str);
			if (isNaN(x))
				return {digits: 0};
			var s = "" + x;
			var i = str.indexOf(s);	// This is to account for leading spaces
			return {value: x, digits: i+s.length};
		};

		this.getFloat = function(str) {
			// This parses the beginning of the string for a number and returns { value: num, digits: num }
			// If digits is 0, then the string didn't point to a number.
			var x = parseFloat(str);
			if (isNaN(x))
				return {digits: 0};
			var s = "" + x;
			var i = str.indexOf(s);	// This is to account for leading spaces
			return {value: x, digits: i+s.length};
		};

	}
});
